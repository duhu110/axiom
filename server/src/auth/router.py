from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from auth import dependencies, exceptions, models, schemas
from auth.service import AuthService
from database import get_async_db
from response import success

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/send", status_code=status.HTTP_200_OK, response_model=schemas.Response[schemas.OTPResponse])
async def send_otp(
    request: schemas.OTPRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    发送短信验证码
    
    - **phone**: 手机号码 (11位)
    """
    logger.info(f"Received OTP request for phone: {request.phone}")
    auth_service = AuthService(db)
    expires_in = await auth_service.send_otp(request.phone)
    logger.info(f"OTP sent successfully for phone: {request.phone}")
    return success({"expires_in": expires_in, "message": "Verification code sent"})


@router.post("/login", response_model=schemas.Response[schemas.Token])
async def login(
    request: schemas.LoginRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    OTP 登录
    
    - **phone**: 手机号码
    - **code**: 验证码
    """
    logger.info(f"Login attempt for phone: {request.phone}")
    auth_service = AuthService(db)
    token = await auth_service.login_with_otp(request.phone, request.code)
    logger.info(f"Login successful for phone: {request.phone}")
    return success(token)


@router.post("/refresh", response_model=schemas.Response[schemas.Token])
async def refresh_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(dependencies.bearer_scheme)],
    request: schemas.RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    刷新 Token
    
    - **refresh_token**: 刷新令牌
    """
    if not credentials:
        raise exceptions.InvalidCredentials()
    await dependencies.get_current_user(credentials, db)
    logger.info("Refreshing token")
    auth_service = AuthService(db)
    token = await auth_service.refresh_token(request.refresh_token)
    await auth_service.revoke_token(credentials.credentials)
    logger.info("Token refreshed successfully")
    return success(token)


@router.get("/me", response_model=schemas.Response[schemas.UserPublic])
async def read_users_me(
    current_user: Annotated[models.User, Depends(dependencies.get_current_active_user)],
):
    """
    获取当前用户信息
    """
    logger.info(f"Fetching user info for user_id: {current_user.id}")
    return success(current_user)


@router.post("/logout", response_model=schemas.Response[dict])
async def logout(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(dependencies.bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    登出
    """
    logger.info("Logout request received")
    if not credentials:
        raise exceptions.InvalidCredentials()
    token = credentials.credentials
    auth_service = AuthService(db)
    await auth_service.revoke_token(token)
    logger.info("Logout successful")
    return success({"message": "success"})
