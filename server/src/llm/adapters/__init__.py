"""
LLM 适配器模块

统一多供应商 LLM 的 LangChain 适配器。
"""
from llm.adapters.deepseek import DeepSeekChat
from llm.adapters.dashscope import DashScopeChat
from llm.adapters.openai_compatible import OpenAICompatibleChat

__all__ = [
    "DeepSeekChat",
    "DashScopeChat",
    "OpenAICompatibleChat",
]
