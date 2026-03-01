"""
LLM 工厂函数测试

测试 get_llm_instance 函数的正确性
"""
import pytest
from uuid import UUID

from database import AsyncSessionLocal
from llm import get_llm_instance, ModelNotFoundError


@pytest.mark.asyncio
async def test_get_default_llm():
    """测试获取默认 LLM 实例"""
    async with AsyncSessionLocal() as db:
        llm = await get_llm_instance(None, db)

        # 验证返回的是 LangChain ChatModel 实例
        assert llm is not None
        assert hasattr(llm, "model_name")
        assert hasattr(llm, "ainvoke")

        # 验证模型名称是 deepseek-chat（默认模型）
        assert llm.model_name == "deepseek-chat"


@pytest.mark.asyncio
async def test_get_llm_by_id():
    """测试通过 ID 获取特定 LLM 实例"""
    async with AsyncSessionLocal() as db:
        # 先查询默认模型的 ID
        from sqlalchemy import select
        from llm.models import LLMModel

        stmt = select(LLMModel).where(LLMModel.is_default == True)
        result = await db.execute(stmt)
        default_model = result.scalar_one_or_none()

        assert default_model is not None

        # 使用 ID 获取 LLM
        llm = await get_llm_instance(default_model.id, db)

        assert llm is not None
        assert llm.model_name == default_model.model_id or llm.model_name == default_model.model_name


@pytest.mark.asyncio
async def test_get_nonexistent_llm():
    """测试获取不存在的 LLM"""
    from uuid import uuid4

    async with AsyncSessionLocal() as db:
        fake_id = uuid4()

        with pytest.raises(ModelNotFoundError):
            await get_llm_instance(fake_id, db)


@pytest.mark.asyncio
async def test_create_deepseek_adapter():
    """测试创建 DeepSeek 适配器"""
    from llm.models import LLMModel

    async with AsyncSessionLocal() as db:
        # 查询 DeepSeek 模型
        stmt = select(LLMModel).where(
            LLMModel.provider == "deepseek",
            LLMModel.is_enabled == True
        )
        result = await db.execute(stmt)
        model = result.scalars().first()

        assert model is not None

        llm = await get_llm_instance(model.id, db)

        # 验证是 DeepSeekChat 类型
        assert llm.__class__.__name__ == "DeepSeekChat"
        assert llm.model_name == model.model_id or llm.model_name == model.model_name


@pytest.mark.asyncio
async def test_create_deepseek_reasoner_adapter():
    """测试创建 DeepSeek Reasoner 适配器"""
    from sqlalchemy import select
    from llm.models import LLMModel

    async with AsyncSessionLocal() as db:
        # 查询 DeepSeek Reasoner 模型
        stmt = select(LLMModel).where(
            LLMModel.provider == "deepseek",
            LLMModel.model_name == "DeepSeek-Reasoner"
        )
        result = await db.execute(stmt)
        model = result.scalar_one_or_none()

        if model is None:
            pytest.skip("DeepSeek-Reasoner 模型未配置")

        llm = await get_llm_instance(model.id, db)

        # 验证是 DeepSeekChat 类型
        assert llm.__class__.__name__ == "DeepSeekChat"
        # Reasoner 使用 deepseek-reasoner 模型
        assert llm.model_name == "deepseek-reasoner"
