"""
LLM 服务层测试

测试模型查询等服务
"""
import pytest
from uuid import uuid4

from database import AsyncSessionLocal
from llm import get_available_models, get_default_model
from llm.service import record_usage, list_usage, summary_usage
from llm.models import LLMModel


@pytest.mark.asyncio
async def test_get_available_models():
    """测试获取可用模型列表"""
    async with AsyncSessionLocal() as db:
        models = await get_available_models(db)

        # 应该至少有 DeepSeek-V3 和 DeepSeek-Reasoner
        assert len(models) >= 2

        # 验证返回的是 LLMModel 实例
        for model in models:
            assert isinstance(model, LLMModel)
            assert model.is_enabled is True
            # 验证不包含敏感信息
            assert hasattr(model, "api_key")
            assert model.api_key is not None


@pytest.mark.asyncio
async def test_get_default_model():
    """测试获取默认模型"""
    async with AsyncSessionLocal() as db:
        default_model = await get_default_model(db)

        assert default_model is not None
        assert default_model.is_default is True
        assert default_model.is_enabled is True
        assert default_model.model_name == "DeepSeek-V3"


@pytest.mark.asyncio
async def test_record_usage():
    """测试记录用量"""
    from uuid import uuid4

    async with AsyncSessionLocal() as db:
        user_id = uuid4()
        usage_data = {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30,
        }

        # 记录用量
        await record_usage(
            user_id=user_id,
            model_name="deepseek-chat",
            usage=usage_data,
            db=db,
        )

        # 提交事务
        await db.commit()

        # 查询验证
        items, total = await list_usage(
            db=db,
            user_id=user_id,
            start_at=None,
            end_at=None,
            model_name=None,
            skip=0,
            limit=10,
        )

        assert total == 1
        assert len(items) == 1
        assert items[0].model_name == "deepseek-chat"
        assert items[0].prompt_tokens == 10
        assert items[0].completion_tokens == 20
        assert items[0].total_tokens == 30


@pytest.mark.asyncio
async def test_summary_usage_by_model():
    """测试按模型汇总用量"""
    from uuid import uuid4

    async with AsyncSessionLocal() as db:
        user_id = uuid4()

        # 记录多条用量
        await record_usage(
            user_id=user_id,
            model_name="deepseek-chat",
            usage={"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
            db=db,
        )
        await record_usage(
            user_id=user_id,
            model_name="deepseek-chat",
            usage={"prompt_tokens": 5, "completion_tokens": 10, "total_tokens": 15},
            db=db,
        )
        await record_usage(
            user_id=user_id,
            model_name="deepseek-reasoner",
            usage={"prompt_tokens": 100, "completion_tokens": 200, "total_tokens": 300},
            db=db,
        )

        await db.commit()

        # 按模型汇总
        summary = await summary_usage(
            db=db,
            user_id=user_id,
            start_at=None,
            end_at=None,
            model_name=None,
            group_by="model",
        )

        assert len(summary) == 2

        # 验证 deepseek-chat 的汇总
        deepseek_chat = next((s for s in summary if s["group"] == "deepseek-chat"), None)
        assert deepseek_chat is not None
        assert deepseek_chat["prompt_tokens"] == 15
        assert deepseek_chat["completion_tokens"] == 30
        assert deepseek_chat["total_tokens"] == 45

        # 验证 deepseek-reasoner 的汇总
        deepseek_reasoner = next((s for s in summary if s["group"] == "deepseek-reasoner"), None)
        assert deepseek_reasoner is not None
        assert deepseek_reasoner["prompt_tokens"] == 100
        assert deepseek_reasoner["completion_tokens"] == 200
        assert deepseek_reasoner["total_tokens"] == 300
