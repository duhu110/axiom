import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from auth import models, security
from config import settings
from main import app
from models import Base

# 使用测试数据库（这里假设测试环境会自动切换配置，或者手动覆盖）
# 在实际项目中，通常会覆盖 settings.db.uri_app 指向测试库
# 为了简化，这里我们暂时使用 sqlite 内存数据库或者直接 mock db session
# 但为了更真实的测试，我们假设已经配置好了测试数据库

@pytest_asyncio.fixture
async def db_engine():
    # 使用 sqlite 内存数据库进行测试，避免污染生产库
    # 注意：如果使用 SQLite，部分 PostgreSQL 特有的类型（如 UUID, JSONB）可能需要适配
    # 更好的方式是使用 Docker 启动一个临时的 PG 实例
    # 这里为了演示方便，我们假设 settings.db.uri_app 已经指向了一个测试用的 PG 库
    # 或者我们强制使用 sqlite
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(db_engine):
    async_session = async_sessionmaker(db_engine, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    # 覆盖 get_async_db 依赖
    from database import get_async_db
    app.dependency_overrides[get_async_db] = lambda: db_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_phone():
    return "18997485868"


@pytest_asyncio.fixture
async def test_user(db_session, test_phone):
    """创建一个测试用户"""
    user = models.User(phone=test_phone, name="杜虎")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_token(test_user):
    """
    快速获取 Token 的 Fixture (内部服务)
    无需通过 OTP 流程，直接签发 Token
    """
    access_token = security.create_access_token(test_user.id)
    return access_token


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}
