from typing import Any, Dict, List
import response


def build_page(items: List[Any], total: int, limit: int, offset: int) -> Dict[str, Any]:
    """
    构造分页数据结构
    :param items: 当前页数据列表
    :param total: 总记录数
    :param limit: 每页数量
    :param offset: 偏移量
    :return: 分页数据字典
    """
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def build_page_response(items: List[Any], total: int, limit: int, offset: int) -> Dict[str, Any]:
    """
    构造分页响应
    :param items: 当前页数据列表
    :param total: 总记录数
    :param limit: 每页数量
    :param offset: 偏移量
    :return: 分页响应字典
    """
    page_data = build_page(items, total, limit, offset)
    return response.success(page_data)
