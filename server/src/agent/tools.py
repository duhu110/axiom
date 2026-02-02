from langchain_core.tools import tool
from typing import Annotated
from langgraph.store.base import BaseStore
from langchain_core.runnables.config import RunnableConfig
from uuid import uuid4

# 注意: 这里使用 inject_store 会让 LangGraph 在运行时自动注入 Store 实例
# 但 Tool 定义本身是静态的，我们需要一种方式在运行时获取 Store
# LangGraph 0.2+ 支持在 Tool 中通过 Annotated[BaseStore, InjectedStore] 获取
from langgraph.prebuilt import InjectedStore

@tool
def upsert_memory(
    content: str,
    key: str,
    store: Annotated[BaseStore, InjectedStore],
    config: RunnableConfig
) -> str:
    """
    Save or update a piece of long-term memory about the user.
    Use this tool when the user provides important personal information, preferences, or facts that should be remembered for future conversations.
    
    This tool will first check if the memory already exists to avoid duplicates.
    
    Args:
        content: The information to remember (e.g., "User likes spicy food", "User works as a Python developer").
        key: A unique key for this memory. Can be descriptive (e.g., "food_preference", "job_title").
        store: The injected store instance (do not provide this manually).
        config: The runtime configuration (do not provide this manually).
    """
    # 获取当前用户 ID
    # 优先从 metadata 中获取 user_id (更稳定)
    # 如果没有，尝试使用 thread_id (但 thread_id 是 session 级别的，长期记忆应该跟随 user)
    metadata = config.get("metadata", {})
    user_id = metadata.get("user_id")
    
    if not user_id:
        # Fallback to configurable (for backward compatibility or testing)
        user_id = config.get("configurable", {}).get("user_id")
        
    if not user_id:
        # Last resort: default (but this means shared memory for all unknown users)
        user_id = "default_user"
    
    # Namespace tuple: ("memories", user_id)
    namespace = ("memories", user_id)
    
    # 1. 检查是否存在现有记忆
    existing_item = store.get(namespace, key)
    
    if existing_item:
        existing_content = existing_item.value.get("content")
        # 简单查重：如果内容完全一致，则跳过
        if existing_content == content:
            return f"Memory already exists: [{key}] {content}"
        
        # 复杂查重/更新逻辑：这里我们选择覆盖，但可以在 Prompt 中让 Agent 决定是 update 还是 new key
        # 或者比较相似度（如果有向量存储）
        # 目前策略：直接覆盖 (Upsert)
        pass
    
    # 2. 存储/更新记忆
    store.put(namespace, key, {"content": content})
    
    return f"Memory saved for user {user_id}: [{key}] {content}"

@tool
def get_current_weather(city: str) -> str:
    """
    Get the current weather for a given city.
    
    Args:
        city: The name of the city to get the weather for.
    """
    # 模拟数据
    if "beijing" in city.lower():
        return "Sunny, 25°C"
    elif "shanghai" in city.lower():
        return "Cloudy, 22°C"
    elif "new york" in city.lower():
        return "Rainy, 15°C"
    else:
        return "Unknown city, assuming Sunny, 20°C"
