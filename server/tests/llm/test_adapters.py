"""
LLM 适配器测试

测试各个适配器的基本功能
"""
import pytest

from llm.adapters import DeepSeekChat, DashScopeChat, OpenAICompatibleChat


def test_deepseek_adapter_creation():
    """测试 DeepSeek 适配器创建"""
    llm = DeepSeekChat(
        model="deepseek-chat",
        api_key="test-key",
        base_url="https://api.deepseek.com",
    )

    assert llm is not None
    assert llm.model_name == "deepseek-chat"
    assert llm.openai_api_key.get_secret_value() == "test-key"
    assert llm.openai_api_base == "https://api.deepseek.com"


def test_dashscope_adapter_creation():
    """测试 DashScope 适配器创建"""
    llm = DashScopeChat(
        model="qwen-turbo",
        api_key="test-key",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )

    assert llm is not None
    assert llm.model_name == "qwen-turbo"
    assert llm.openai_api_key.get_secret_value() == "test-key"


def test_openai_compatible_adapter_creation():
    """测试 OpenAI 兼容适配器创建"""
    llm = OpenAICompatibleChat(
        model="gpt-3.5-turbo",
        api_key="test-key",
        base_url="https://api.openai.com/v1",
    )

    assert llm is not None
    assert llm.model_name == "gpt-3.5-turbo"
    assert llm.openai_api_key.get_secret_value() == "test-key"


def test_deepseek_adapter_use_model_id():
    """测试 DeepSeek 适配器使用 model_id 而非 model_name"""
    # 当 use_model_id=True 时，传递的 model 参数应该是 model_id
    llm = DeepSeekChat(
        model="deepseek-reasoner",  # 这里实际是 model_id
        api_key="test-key",
        base_url="https://api.deepseek.com",
    )

    assert llm is not None
    assert llm.model_name == "deepseek-reasoner"


def test_adapter_inheritance():
    """测试适配器继承自 ChatOpenAI"""
    from langchain_openai import ChatOpenAI

    deepseek = DeepSeekChat(model="test", api_key="key", base_url="https://api.test.com")
    dashscope = DashScopeChat(model="test", api_key="key", base_url="https://api.test.com")
    openai_compat = OpenAICompatibleChat(model="test", api_key="key", base_url="https://api.test.com")

    assert isinstance(deepseek, ChatOpenAI)
    assert isinstance(dashscope, ChatOpenAI)
    assert isinstance(openai_compat, ChatOpenAI)
