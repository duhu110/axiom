import pytest
import exceptions

def test_app_error_response():
    """AppError 可以转成统一响应结构。"""
    app_error = exceptions.AppError(
        code=exceptions.ErrorCode.VALIDATION_ERROR,
        msg="invalid payload",
        status_code=400,
        detail="bad",
    )
    response = app_error.to_response()
    code_value = app_error.code.value if hasattr(app_error.code, "value") else app_error.code
    assert response["code"] == code_value
    assert response["msg"] == "invalid payload"
    assert response["data"] is None
