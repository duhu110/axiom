"""
DashScope (通义千问) LLM 适配器

使用阿里云通义千问 OpenAI 兼容接口
"""
from langchain_openai import ChatOpenAI


class DashScopeChat(ChatOpenAI):
    """
    阿里云通义千问适配器

    通过 OpenAI 兼容接口调用通义千问模型
    无需特殊处理，直接继承 ChatOpenAI 即可
    """

    def __init__(
        self,
        model: str,
        api_key: str,
        base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1",
        **kwargs
    ):
        """
        初始化 DashScope 适配器

        Args:
            model: 模型名称，如 qwen-turbo, qwen-plus, qwen-max
            api_key: API Key
            base_url: API 端点，默认为通义千问兼容接口
            **kwargs: 其他 ChatOpenAI 参数
        """
        super().__init__(
            model=model,
            api_key=api_key,
            base_url=base_url,
            **kwargs
        )
