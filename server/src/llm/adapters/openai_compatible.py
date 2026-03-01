"""
OpenAI 兼容接口 LLM 适配器

通用 OpenAI 兼容接口适配器
"""
from langchain_openai import ChatOpenAI
from typing import Any


class OpenAICompatibleChat(ChatOpenAI):
    """
    OpenAI 兼容接口适配器

    用于任何兼容 OpenAI API 格式的服务
    直接使用 ChatOpenAI，提供别名便于语义化调用
    """

    def __init__(
        self,
        model: str,
        api_key: str,
        base_url: str,
        **kwargs
    ):
        """
        初始化 OpenAI 兼容接口适配器

        Args:
            model: 模型名称
            api_key: API Key
            base_url: API 端点
            **kwargs: 其他 ChatOpenAI 参数
        """
        super().__init__(
            model=model,
            api_key=api_key,
            base_url=base_url,
            **kwargs
        )
