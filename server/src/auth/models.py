import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from models import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False, comment="手机号")
    name: Mapped[str | None] = mapped_column(String, nullable=True, comment="姓名")
    avatar: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("file_objects.id"), nullable=True, comment="头像文件ID")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否激活")
    last_login_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="最后登录时间"
    )


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str] = mapped_column(String, index=True, nullable=False, comment="手机号")
    code: Mapped[str] = mapped_column(String, nullable=False, comment="验证码")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="创建时间"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="过期时间"
    )
    attempts: Mapped[int] = mapped_column(default=0, comment="尝试次数")
    used: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否已使用")


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    jti: Mapped[str] = mapped_column(String, primary_key=True, comment="Token ID")
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False, comment="用户ID")
    revoked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="撤销时间"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="原Token过期时间"
    )
