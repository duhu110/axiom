from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import exceptions, models, security
from database import get_async_db

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
) -> models.User:
    """获取当前用户"""
    if not credentials:
        raise exceptions.InvalidCredentials()
    token = credentials.credentials
    return await verify_and_get_user(token, db)


async def verify_and_get_user(token: str, db: AsyncSession) -> models.User:
    """验证 Token 并获取用户 (通用逻辑)"""
    payload = security.verify_token(token)
    if not payload or payload["typ"] != "access":
        raise exceptions.InvalidCredentials()

    jti = payload.get("jti")
    user_id = payload.get("sub")

    if not user_id:
        raise exceptions.InvalidCredentials()

    # 将 user_id 转换为 UUID (处理 SQLite/Postgres 兼容性)
    try:
        if isinstance(user_id, str):
            import uuid
            user_id = uuid.UUID(user_id)
    except ValueError:
        raise exceptions.InvalidCredentials()

    # 检查是否已撤销
    if jti:
        stmt = select(models.RevokedToken).where(models.RevokedToken.jti == jti)
        result = await db.execute(stmt)
        if result.scalars().first():
            raise exceptions.InvalidCredentials()

    # 获取用户
    stmt = select(models.User).where(models.User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise exceptions.InvalidCredentials()

    return user


async def get_current_active_user(
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> models.User:
    """获取当前激活用户"""
    if not current_user.is_active:
        raise exceptions.AuthException("Inactive user", status_code=400)
    return current_user


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
) -> models.User | None:
    """尝试获取当前用户，未登录返回 None"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except exceptions.AuthException:
        return None
    except Exception:
        return None
