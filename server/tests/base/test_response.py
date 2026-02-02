import pytest
import response

def test_success_response_shape():
    """成功响应包含 code/msg/data 字段。"""
    payload = {"hello": "world"}
    result = response.success(payload)
    assert result["code"] == 0
    assert result["msg"] == "ok"
    assert result["data"] == payload

def test_failure_response_shape():
    """失败响应包含 code/msg/data 字段。"""
    result = response.failure(code=40001, msg="bad request")
    assert result["code"] == 40001
    assert result["msg"] == "bad request"
    assert result["data"] is None
