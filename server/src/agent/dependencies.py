from typing import Optional
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.store.postgres import PostgresStore
from psycopg_pool import AsyncConnectionPool
from config import settings

# 全局实例
checkpointer: Optional[AsyncPostgresSaver] = None
store: Optional[PostgresStore] = None
_pool: Optional[AsyncConnectionPool] = None

async def init_agent_dependencies():
    """初始化 Agent 依赖 (Checkpointer, Store)"""
    global checkpointer, store, _pool
    
    # 转换 URI: postgresql+asyncpg:// -> postgresql://
    # LangGraph PostgresSaver 使用 psycopg，我们需要兼容的连接字符串
    db_uri = settings.db.uri_agent.replace("+asyncpg", "")
    
    # 创建连接池
    # 修复: open=False 避免构造函数中直接打开连接，由 await _pool.open() 显式控制
    # 并且移除 kwargs={"autocommit": True} 因为 AsyncConnectionPool 不直接支持这个参数，
    # 而是应该在 configure 中设置，或者由使用者控制。
    # 不过 LangGraph 文档建议直接传入 conn_string 给 Saver，让 Saver 自己管理连接池，
    # 或者传入一个已打开的 pool。
    # 这里的错误是 `PostgresStore` 或 `AsyncPostgresSaver` 内部 setup 时可能对 pool 状态有要求。
    # 实际上，AsyncPostgresSaver 接受 conn_string 或 pool。
    
    # 让我们简化一下，不再手动创建 pool，而是让 AsyncPostgresSaver 和 PostgresStore 分别管理自己的连接，
    # 或者如果我们想共享连接池，我们需要确保正确初始化。
    
    # 根据报错: `AsyncConnectionPool` 构造时如果没传 open=False 就会尝试打开，但会有 warning。
    # 且报错 `TypeError: Invalid connection type: <class 'psycopg_pool.pool_async.AsyncConnectionPool'>`
    # 说明 PostgresStore/Saver 可能期望的是同步连接或者其他对象，或者我们传参方式不对。
    
    # 检查源码/文档发现，PostgresSaver(conn) 如果传入的是 pool，它会直接使用。
    # 但是报错显示 `_cursor` 方法中 `with _pg_internal.get_connection(self.conn) as conn:` 失败。
    # 看起来 `langgraph` 的 `PostgresStore` (同步版) 不支持 `AsyncConnectionPool`。
    # 我们需要使用 `AsyncPostgresStore` 吗？ LangGraph 文档中 Store 部分通常是同步/异步分开的。
    # 但是 langgraph.store.postgres 只有 PostgresStore? 
    # 实际上，LangGraph Store API 目前主要是同步的，或者我们需要确认是否有 AsyncPostgresStore。
    # 假如没有 AsyncPostgresStore，我们需要用同步连接池。
    
    # 修正方案：
    # 1. Checkpointer 是 AsyncPostgresSaver -> 需要 AsyncConnectionPool
    # 2. Store 是 PostgresStore -> 可能是同步的，需要 ConnectionPool (同步)
    
    # 让我们先尝试分别为它们创建合适的连接池。
    
    # 1. Checkpointer (Async)
    _pool = AsyncConnectionPool(conninfo=db_uri, max_size=20, open=False, kwargs={"autocommit": True})
    await _pool.open()
    checkpointer = AsyncPostgresSaver(_pool)
    await checkpointer.setup()
    
    # 2. Store (Sync for now, as PostgresStore usually implies sync, or we verify if it supports async)
    # 如果 PostgresStore 是同步的，我们需要一个同步的 ConnectionPool。
    # 但是在一个 async def init_agent_dependencies 中初始化同步池是可以的。
    # 不过，为了避免阻塞 loop，最好确认 Store 是否有 Async 实现。
    # 如果没有，我们暂时用同步连接池给 Store。
    
    # 实际上，langgraph 0.2+ 可能还没有 AsyncPostgresStore。
    # 如果必须用 Store，且只有同步版，那我们在 async 路由中使用它可能会阻塞 loop。
    # 但根据报错 `TypeError: Invalid connection type: ...AsyncConnectionPool`，
    # 明确了 PostgresStore 不接受异步池。
    
    # 为了解决这个问题，我们为 Store 创建一个同步池。
    from psycopg_pool import ConnectionPool
    global _sync_pool
    _sync_pool = ConnectionPool(conninfo=db_uri, max_size=20, open=False, kwargs={"autocommit": True})
    _sync_pool.open()
    store = PostgresStore(_sync_pool)
    store.setup()
    
_sync_pool = None

async def close_agent_dependencies():
    """关闭 Agent 依赖"""
    global _pool, _sync_pool
    if _pool:
        await _pool.close()
    if _sync_pool:
        _sync_pool.close()

def get_checkpointer() -> AsyncPostgresSaver:
    if checkpointer is None:
        raise RuntimeError("Agent dependencies not initialized")
    return checkpointer

def get_store() -> PostgresStore:
    if store is None:
        raise RuntimeError("Agent dependencies not initialized")
    return store
