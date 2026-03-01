"""
LLM API 路由测试

测试模型列表等 API 接口
"""
import pytest
from httpx import AsyncClient, ASGITransport

from main import app


@pytest.mark.asyncio
async def test_get_models_without_auth():
    """测试未认证获取模型列表（应该返回 401）"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/llm/models")

        # 未认证应该返回 401
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_models_with_auth(test_user, token_headers):
    """测试认证后获取模型列表"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/llm/models", headers=token_headers)

        assert response.status_code == 200

        data = response.json()
        assert data["code"] == 0
        assert "data" in data
        assert "items" in data["data"]

        items = data["data"]["items"]
        # 至少应该有 2 个模型
        assert len(items) >= 2

        # 验证响应结构
        for item in items:
            assert "id" in item
            assert "provider" in item
            assert "model_name" in item
            assert "support_reasoning" in item
            assert "support_image" in item
            assert "is_default" in item
            # 验证不包含敏感信息
            assert "api_key" not in item

        # 验证有一个默认模型
        default_models = [m for m in items if m["is_default"] is True]
        assert len(default_models) == 1
        assert default_models[0]["model_name"] == "DeepSeek-V3"


@pytest.mark.asyncio
async def test_get_usage_with_auth(test_user, token_headers):
    """测试获取用量明细"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/llm/usage", headers=token_headers)

        assert response.status_code == 200

        data = response.json()
        assert data["code"] == 0
        assert "data" in data
        assert "items" in data["data"]
        assert "total" in data["data"]


@pytest.mark.asyncio
async def test_get_usage_summary_with_auth(test_user, token_headers):
    """测试获取用量汇总"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/llm/usage/summary",
            params={"group_by": "model"},
            headers=token_headers
        )

        assert response.status_code == 200

        data = response.json()
        assert data["code"] == 0
        assert "data" in data
        assert "items" in data["data"]


@pytest.fixture
async def token_headers(test_user):
    """创建认证 token 的 fixture"""
    import asyncio
    from sqlalchemy import select
    from database import AsyncSessionLocal
    from auth.security import create_access_token

    # 获取测试用户
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(test_user.__class__).where(test_user.__class__.phone == "13800000000"))
        user = result.scalar_one_or_none()

        if user is None:
            # 如果测试用户不存在，创建一个
            from auth.models import User
            from auth.passwd import hash_password

            user = User(
                phone="13800000000",
                hashed_password=hash_password("password123"),
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    # 创建 token
    token = await asyncio.to_thread(create_access_token, data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_user():
    """测试用户 fixture"""
    from auth.models import User
    return User
