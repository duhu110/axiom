import uuid
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import jwt

from auth.config import auth_settings
from auth import exceptions
from config import settings


def create_access_token(subject: str | Any) -> str:
    """创建 Access Token"""
    tz = ZoneInfo(settings.timezone)
    expire = datetime.now(tz) + timedelta(minutes=auth_settings.access_token_expire_minutes)
    to_encode = {
        "typ": "access",
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(tz),
        "jti": str(uuid.uuid4()),
    }
    encoded_jwt = jwt.encode(to_encode, auth_settings.secret_key, algorithm=auth_settings.algorithm)
    return encoded_jwt


def create_refresh_token(subject: str | Any) -> str:
    """创建 Refresh Token"""
    tz = ZoneInfo(settings.timezone)
    expire = datetime.now(tz) + timedelta(days=auth_settings.refresh_token_expire_days)
    to_encode = {
        "typ": "refresh",
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(tz),
        "jti": str(uuid.uuid4()),
    }
    encoded_jwt = jwt.encode(to_encode, auth_settings.secret_key, algorithm=auth_settings.algorithm)
    return encoded_jwt


def verify_token(token: str) -> dict[str, Any] | None:
    """验证 Token"""
    try:
        payload = jwt.decode(token, auth_settings.secret_key, algorithms=[auth_settings.algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        raise exceptions.TokenExpired()
    except jwt.PyJWTError:
        return None
