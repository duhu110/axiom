from contextlib import asynccontextmanager, contextmanager
from typing import AsyncGenerator, Generator, Optional

from sqlalchemy import Engine, create_engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session, sessionmaker

from config import settings

# --- URI 适配 ---

def get_sync_uri(uri: str) -> str:
    """
    适配同步驱动
    postgresql:// -> postgresql+psycopg:// (psycopg v3)
    postgresql+asyncpg:// -> postgresql+psycopg://
    """
    if "+asyncpg" in uri:
        return uri.replace("+asyncpg", "+psycopg", 1)
    if uri.startswith("postgresql://"):
        return uri.replace("postgresql://", "postgresql+psycopg://", 1)
    return uri


def get_async_uri(uri: str) -> str:
    """
    适配异步驱动
    postgresql:// -> postgresql+asyncpg://
    """
    if uri.startswith("postgresql://"):
        return uri.replace("postgresql://", "postgresql+asyncpg://", 1)
    return uri


# --- 全局实例配置 ---

# 同步 Engine
sync_uri = get_sync_uri(settings.db.uri_app)
sync_connect_args = (
    {"options": f"-c timezone={settings.timezone}"}
    if sync_uri.startswith("postgresql+psycopg://")
    else {}
)
engine = create_engine(
    sync_uri,
    echo=settings.db.echo,
    pool_size=settings.db.pool_size,
    max_overflow=settings.db.max_overflow,
    connect_args=sync_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# 异步 Engine
async_uri = get_async_uri(settings.db.uri_app)
async_connect_args = (
    {"server_settings": {"timezone": settings.timezone}}
    if async_uri.startswith("postgresql+asyncpg://")
    else {}
)
async_engine = create_async_engine(
    async_uri,
    echo=settings.db.echo,
    pool_size=settings.db.pool_size,
    max_overflow=settings.db.max_overflow,
    connect_args=async_connect_args,
)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# --- 工厂函数（主要用于测试或多库支持） ---

def get_engine(url: Optional[str] = None) -> Engine:
    """获取同步引擎，支持自定义 URL"""
    if url:
        if "sqlite" in url:
            connect_args = {"check_same_thread": False}
        elif url.startswith("postgresql+psycopg://") or url.startswith("postgresql://"):
            connect_args = {"options": f"-c timezone={settings.timezone}"}
        else:
            connect_args = {}
        return create_engine(url, connect_args=connect_args)
    return engine


def get_async_engine(url: Optional[str] = None) -> AsyncEngine:
    """获取异步引擎，支持自定义 URL"""
    if url:
        connect_args = (
            {"server_settings": {"timezone": settings.timezone}}
            if url.startswith("postgresql+asyncpg://") or url.startswith("postgresql://")
            else {}
        )
        return create_async_engine(url, connect_args=connect_args)
    return async_engine


def get_session(url: Optional[str] = None) -> Generator[Session, None, None]:
    """获取同步 Session 生成器"""
    if url:
        _engine = get_engine(url)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        db = _SessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        # 使用全局 SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()


async def get_async_session(url: Optional[str] = None) -> AsyncGenerator[AsyncSession, None]:
    """获取异步 Session 生成器"""
    if url:
        _engine = get_async_engine(url)
        _AsyncSessionLocal = async_sessionmaker(bind=_engine, class_=AsyncSession, expire_on_commit=False)
        async with _AsyncSessionLocal() as session:
            yield session
    else:
        # 使用全局 AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            yield session


# --- FastAPI 依赖 ---

def get_db() -> Generator[Session, None, None]:
    """FastAPI 同步依赖"""
    yield from get_session()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 异步依赖"""
    async for session in get_async_session():
        yield session


# --- 上下文管理器 ---

@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """同步 Session 上下文管理器，自动 commit/rollback"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@asynccontextmanager
async def async_session_scope() -> AsyncGenerator[AsyncSession, None]:
    """异步 Session 上下文管理器，自动 commit/rollback"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
