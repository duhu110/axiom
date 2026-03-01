"""
LLM 工厂函数

统一工厂函数根据供应商类型返回对应的 LangChain ChatModel 实例
"""
from uuid import UUID
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI

from llm.models import LLMModel
from llm.adapters import DeepSeekChat, DashScopeChat, OpenAICompatibleChat
from services.logging_service import logger


ProviderType = Literal["deepseek", "dashscope", "openai_compatible"]


class ModelNotFoundError(Exception):
    """模型不存在或未启用"""
    pass


async def get_llm_instance(
    model_id: UUID | None,
    db: AsyncSession,
) -> BaseChatModel:
    """
    根据 model_id 获取 LLM 实例

    Args:
        model_id: 模型配置 ID，为空时使用默认模型
        db: 数据库会话

    Returns:
        配置好的 LangChain BaseChatModel 实例

    Raises:
        ModelNotFoundError: 模型不存在或未启用
    """
    # 查询模型配置
    if model_id:
        stmt = select(LLMModel).where(LLMModel.id == model_id)
    else:
        # 查询默认模型
        stmt = select(LLMModel).where(
            LLMModel.is_default == True,
            LLMModel.is_enabled == True
        )

    result = await db.execute(stmt)
    model_config = result.scalar_one_or_none()

    if not model_config:
        if model_id:
            raise ModelNotFoundError(f"模型 ID {model_id} 不存在或未启用")
        else:
            raise ModelNotFoundError("未配置默认模型，请先在数据库中配置")

    if not model_config.is_enabled:
        raise ModelNotFoundError(f"模型 {model_config.model_name} 已被禁用")

    # 根据供应商类型创建对应的适配器
    return _create_adapter(model_config)


def _create_adapter(config: LLMModel) -> BaseChatModel:
    """
    根据模型配置创建对应的 LLM 适配器

    Args:
        config: LLM 模型配置

    Returns:
        配置好的 LangChain BaseChatModel 实例
    """
    provider = config.provider

    # 确定调用时使用的模型标识
    model = config.model_id if config.use_model_id else config.model_name

    # 根据供应商类型创建适配器
    if provider == "deepseek":
        llm = DeepSeekChat(
            model=model,
            api_key=config.api_key,
            base_url=config.base_url,
        )
        logger.debug(f"Created DeepSeek adapter: {config.model_name} (using: {model})")
        return llm

    elif provider == "dashscope":
        llm = DashScopeChat(
            model=model,
            api_key=config.api_key,
            base_url=config.base_url,
        )
        logger.debug(f"Created DashScope adapter: {config.model_name} (using: {model})")
        return llm

    elif provider == "openai_compatible":
        llm = OpenAICompatibleChat(
            model=model,
            api_key=config.api_key,
            base_url=config.base_url,
        )
        logger.debug(f"Created OpenAI Compatible adapter: {config.model_name} (using: {model})")
        return llm

    else:
        # 未知供应商，使用基础 ChatOpenAI
        logger.warning(f"Unknown provider: {provider}, falling back to ChatOpenAI")
        return ChatOpenAI(
            model=model,
            api_key=config.api_key,
            base_url=config.base_url,
        )


async def get_default_model(db: AsyncSession) -> LLMModel | None:
    """
    获取默认模型配置

    Args:
        db: 数据库会话

    Returns:
        默认模型配置，不存在时返回 None
    """
    stmt = select(LLMModel).where(
        LLMModel.is_default == True,
        LLMModel.is_enabled == True
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
