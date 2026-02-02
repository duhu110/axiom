from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import exceptions, models, schemas, security, utils
from auth.config import auth_settings
from config import settings
from services.sms_service import sms_service


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_otp(self, phone: str) -> int:
        """发送验证码"""
        phone = utils.normalize_phone(phone)
        code = utils.generate_otp()
        tz = ZoneInfo(settings.timezone)

        stmt = select(models.User).where(models.User.phone == phone)
        result = await self.db.execute(stmt)
        user = result.scalars().first()
        if not user:
            raise exceptions.UserNotFound()
        
        # 存储 OTP
        otp = models.OTPCode(
            phone=phone,
            code=code,
            expires_at=datetime.now(tz) + timedelta(minutes=5)
        )
        self.db.add(otp)
        await self.db.commit()
        
        # 发送短信
        result = await sms_service.send_verification_code(phone, code)
        if not result.success:
            # TODO: 记录日志或处理失败
            pass
            
        return 300 # expires in seconds

    async def login_with_otp(self, phone: str, code: str) -> schemas.Token:
        """OTP 登录"""
        phone = utils.normalize_phone(phone)
        tz = ZoneInfo(settings.timezone)
        
        # 验证 OTP
        # 查找最近的一个未使用的、未过期的验证码
        stmt = select(models.OTPCode).where(
            models.OTPCode.phone == phone,
            models.OTPCode.code == code,
            models.OTPCode.used == False,
            models.OTPCode.expires_at > datetime.now(tz)
        ).order_by(models.OTPCode.created_at.desc())
        
        result = await self.db.execute(stmt)
        otp_record = result.scalars().first()
        
        if not otp_record:
            raise exceptions.InvalidOTP()
            
        # 标记为已使用
        otp_record.used = True
        
        # 获取或创建用户
        stmt = select(models.User).where(models.User.phone == phone)
        result = await self.db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            user = models.User(phone=phone)
            self.db.add(user)
            await self.db.flush() # 获取 ID
            
        user.last_login_at = datetime.now(tz)
        await self.db.commit()
        
        # 签发 Token
        access_token = security.create_access_token(user.id)
        refresh_token = security.create_refresh_token(user.id)
        expires_in = auth_settings.access_token_expire_minutes * 60
        server_time = int(datetime.now(tz).timestamp())
        
        return schemas.Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            server_time=server_time,
            access_expires_at=server_time + expires_in,
            refresh_expires_at=server_time + (auth_settings.refresh_token_expire_days * 24 * 60 * 60),
        )

    async def refresh_token(self, refresh_token: str) -> schemas.Token:
        """刷新 Token"""
        payload = security.verify_token(refresh_token)
        if not payload or payload["typ"] != "refresh":
            raise exceptions.InvalidCredentials()
        tz = ZoneInfo(settings.timezone)
            
        jti = payload["jti"]
        user_id = payload["sub"]

        # 将 user_id 转换为 UUID (处理 SQLite/Postgres 兼容性)
        if isinstance(user_id, str):
            import uuid
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                raise exceptions.InvalidCredentials()
        
        # 检查是否已撤销
        stmt = select(models.RevokedToken).where(models.RevokedToken.jti == jti)
        result = await self.db.execute(stmt)
        if result.scalars().first():
            raise exceptions.InvalidCredentials()
            
        # 撤销旧 Refresh Token
        revoked = models.RevokedToken(
            jti=jti,
            user_id=user_id,
            expires_at=datetime.fromtimestamp(payload["exp"], tz=tz)
        )
        self.db.add(revoked)
        await self.db.commit()
        
        # 签发新 Token
        new_access_token = security.create_access_token(user_id)
        new_refresh_token = security.create_refresh_token(user_id)
        expires_in = auth_settings.access_token_expire_minutes * 60
        server_time = int(datetime.now(tz).timestamp())
        
        return schemas.Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in,
            server_time=server_time,
            access_expires_at=server_time + expires_in,
            refresh_expires_at=server_time + (auth_settings.refresh_token_expire_days * 24 * 60 * 60),
        )
        
    async def revoke_token(self, token: str):
        """撤销 Token (Logout)"""
        try:
            payload = security.verify_token(token)
        except exceptions.TokenExpired:
            return
        if not payload:
            return # 已经无效，忽略
        tz = ZoneInfo(settings.timezone)
            
        jti = payload["jti"]
        user_id = payload["sub"]

        # 将 user_id 转换为 UUID (处理 SQLite/Postgres 兼容性)
        if isinstance(user_id, str):
            import uuid
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                return # 无效用户ID，忽略
        
        # 检查是否已存在
        stmt = select(models.RevokedToken).where(models.RevokedToken.jti == jti)
        result = await self.db.execute(stmt)
        if result.scalars().first():
            return

        revoked = models.RevokedToken(
            jti=jti,
            user_id=user_id,
            expires_at=datetime.fromtimestamp(payload["exp"], tz=tz)
        )
        self.db.add(revoked)
        await self.db.commit()
        
    async def get_user_by_id(self, user_id: str) -> models.User | None:
        stmt = select(models.User).where(models.User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
