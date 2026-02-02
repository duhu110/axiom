from enum import Enum
from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

import response


class ErrorCode(Enum):
    """全局错误码定义"""
    SUCCESS = 0
    UNKNOWN_ERROR = 10000
    VALIDATION_ERROR = 10001
    NOT_FOUND = 10002
    UNAUTHORIZED = 10003
    FORBIDDEN = 10004
    TOKEN_EXPIRED = 10005


class AppError(Exception):
    """应用层通用异常"""

    def __init__(
        self,
        code: ErrorCode,
        msg: str,
        status_code: int = 400,
        detail: Any = None,
    ):
        self.code = code
        self.msg = msg
        self.status_code = status_code
        self.detail = detail

    def to_response(self) -> Dict[str, Any]:
        """转换为统一响应字典"""
        # 根据测试用例 test_app_error_response，这里 data 应该是 None，即使 detail 有值
        # 如果需要返回 detail，应该显式传递 data 参数给 AppError 并在 to_response 中使用
        # 但目前 AppError 定义没有 data 字段，所以遵循测试预期，data=None
        return response.failure(
            code=self.code.value,
            msg=self.msg,
            data=None, 
        )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """处理 AppError"""
    status_code = exc.status_code if exc.status_code in (401, 403) else 200
    return JSONResponse(
        status_code=status_code,
        content=exc.to_response(),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """处理 HTTP 异常"""
    detail = exc.detail
    msg = detail if isinstance(detail, str) else str(detail)

    if exc.status_code == 401:
        code = ErrorCode.TOKEN_EXPIRED.value if msg == "Token expired" else ErrorCode.UNAUTHORIZED.value
        status_code = 401
    elif exc.status_code == 403:
        code = ErrorCode.FORBIDDEN.value
        status_code = 403
    elif exc.status_code == 404:
        code = ErrorCode.NOT_FOUND.value
        status_code = 200
    else:
        code = ErrorCode.UNKNOWN_ERROR.value
        status_code = 200

    return JSONResponse(
        status_code=status_code,
        content=response.failure(
            code=code,
            msg=msg,
        ),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """处理请求验证异常"""
    return JSONResponse(
        status_code=200,
        content=response.failure(
            code=ErrorCode.VALIDATION_ERROR.value,
            msg="Validation Error",
            data=str(exc),  # 验证错误详情可以放在 data 中
        ),
    )


def init_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器"""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
