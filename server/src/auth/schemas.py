from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class Response(BaseModel, Generic[T]):
    code: int = Field(0, description="状态码，0表示成功")
    msg: str = Field("ok", description="提示信息")
    data: T | None = Field(None, description="数据载荷")


class OTPRequest(BaseModel):
    phone: str = Field(..., description="手机号码", min_length=11, max_length=11)


class LoginRequest(BaseModel):
    phone: str = Field(..., description="手机号码", min_length=11, max_length=11)
    code: str = Field(..., description="验证码", min_length=6, max_length=6)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="刷新令牌")


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    server_time: int
    access_expires_at: int
    refresh_expires_at: int


class TokenPayload(BaseModel):
    sub: str | None = None
    exp: int | None = None
    iat: int | None = None
    jti: str | None = None
    typ: str | None = None


class UserPublic(BaseModel):
    id: UUID
    phone: str
    name: str | None = None
    avatar: UUID | None = None
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserInternal(UserPublic):
    is_active: bool


class OTPResponse(BaseModel):
    expires_in: int
    message: str
