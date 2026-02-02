import pytest
from httpx import AsyncClient

from auth import models
from sqlalchemy import select
import exceptions

@pytest.mark.asyncio
async def test_send_otp(client: AsyncClient, test_user):
    response = await client.post("/api/auth/send", json={"phone": test_user.phone})
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["msg"] == "ok"
    assert "expires_in" in data["data"]


@pytest.mark.asyncio
async def test_login_flow(client: AsyncClient, db_session):
    phone = "13900139001"
    user = models.User(phone=phone)
    db_session.add(user)
    await db_session.commit()
    
    # 1. Send OTP
    await client.post("/api/auth/send", json={"phone": phone})
    
    # 2. Get OTP code from DB (since we are mocking SMS, we need to peek at the DB or Mock)
    # Since we are using sqlite memory db in tests (or whatever configured), we can query it.
    # However, `send_otp` writes to DB.
    stmt = select(models.OTPCode).where(models.OTPCode.phone == phone).order_by(models.OTPCode.created_at.desc())
    result = await db_session.execute(stmt)
    otp = result.scalars().first()
    assert otp is not None
    code = otp.code
    
    # 3. Login
    response = await client.post("/api/auth/login", json={"phone": phone, "code": code})
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    token_data = data["data"]
    assert "access_token" in token_data
    assert "refresh_token" in token_data


@pytest.mark.asyncio
async def test_send_otp_requires_existing_user(client: AsyncClient):
    response = await client.post("/api/auth/send", json={"phone": "13900139002"})
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == exceptions.ErrorCode.NOT_FOUND.value


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers):
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "id" in data["data"]
    assert data["data"]["phone"] == "18997485868"
    assert data["data"]["name"] == "杜虎"


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, test_user, auth_headers):
    from auth import security
    refresh_token = security.create_refresh_token(test_user.id)
    
    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["refresh_token"] != refresh_token


@pytest.mark.asyncio
async def test_refresh_token_requires_bearer(client: AsyncClient, test_user):
    """刷新 Token 必须携带 Bearer Token"""
    from auth import security

    refresh_token = security.create_refresh_token(test_user.id)
    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == exceptions.ErrorCode.UNAUTHORIZED.value


@pytest.mark.asyncio
async def test_refresh_token_revokes_old_token(client: AsyncClient, test_user, auth_headers):
    """刷新后旧 Refresh Token 不能再次使用"""
    from auth import security

    refresh_token = security.create_refresh_token(test_user.id)
    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
        headers=auth_headers,
    )
    assert response.status_code == 200

    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
        headers=auth_headers,
    )
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == exceptions.ErrorCode.UNAUTHORIZED.value


@pytest.mark.asyncio
async def test_refresh_token_revokes_access_token(client: AsyncClient, test_user, auth_headers):
    """刷新后旧 Access Token 不可再用"""
    from auth import security

    refresh_token = security.create_refresh_token(test_user.id)
    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    new_access_token = data["data"]["access_token"]

    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == exceptions.ErrorCode.UNAUTHORIZED.value

    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {new_access_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, auth_headers):
    response = await client.post("/api/auth/logout", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    
    # Try to use the token again (should fail)
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == exceptions.ErrorCode.UNAUTHORIZED.value


@pytest.mark.asyncio
async def test_expired_access_token_returns_token_expired_code(client: AsyncClient, test_user):
    import jwt
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo
    from auth.config import auth_settings
    from config import settings

    tz = ZoneInfo(settings.timezone)
    expired_payload = {
        "typ": "access",
        "sub": str(test_user.id),
        "exp": datetime.now(tz) - timedelta(seconds=10),
        "iat": datetime.now(tz) - timedelta(minutes=1),
        "jti": "expired-test-jti",
    }
    expired_token = jwt.encode(expired_payload, auth_settings.secret_key, algorithm=auth_settings.algorithm)

    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == exceptions.ErrorCode.TOKEN_EXPIRED.value
