from typing import Any, Dict, Optional


def success(data: Any = None, msg: str = "ok") -> Dict[str, Any]:
    """
    构造成功响应
    :param data: 响应数据
    :param msg: 响应消息
    :return: 响应字典
    """
    return {
        "code": 0,
        "msg": msg,
        "data": data,
    }


def failure(code: int, msg: str, data: Any = None) -> Dict[str, Any]:
    """
    构造失败响应
    :param code: 错误码
    :param msg: 错误消息
    :param data: 附加数据
    :return: 响应字典
    """
    return {
        "code": code,
        "msg": msg,
        "data": data,
    }
