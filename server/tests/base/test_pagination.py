import pytest
import pagination

def test_page_data_shape():
    """分页数据包含 items 与 total 字段。"""
    items = [1, 2, 3]
    page = pagination.build_page(items=items, total=10, limit=3, offset=0)
    assert page["items"] == items
    assert page["total"] == 10
    assert page["limit"] == 3
    assert page["offset"] == 0

def test_page_response_shape():
    """分页响应包含 code/msg/data 字段。"""
    items = [{"id": 1}]
    result = pagination.build_page_response(items=items, total=1, limit=10, offset=0)
    assert result["code"] == 0
    assert result["msg"] == "ok"
    assert result["data"]["items"] == items
    assert result["data"]["total"] == 1
