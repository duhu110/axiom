"""
Router Graph - 路由图

负责：
1. 根据用户输入判断路由目标 (QA / RAG / SQL)
2. 分发请求到对应子 Agent
3. 返回子 Agent 的响应

注意：
- Router 只做路由，不注入记忆
- Router 不包含业务逻辑
"""
from typing import Dict, Literal
import re

from langchain_core.messages import BaseMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.graph.state import CompiledStateGraph

from .state import RouterState
from services.logging_service import logger


# 路由规则关键词
SQL_KEYWORDS = [
    "sql", "数据库", "查询", "统计", "表", "字段", 
    "database", "query", "table", "column", "record",
    "多少条", "有几条", "条数", "记录数"
]

RAG_KEYWORDS = [
    "文档", "知识库", "rag", "检索", "根据资料",
    "document", "knowledge", "retrieve", "search",
    "参考", "资料", "文件"
]


def _get_last_user_message(messages: list[BaseMessage]) -> str:
    """获取最后一条用户消息内容"""
    for msg in reversed(messages):
        if hasattr(msg, 'type') and msg.type == 'human':
            return msg.content
        elif hasattr(msg, 'content') and getattr(msg, 'role', None) == 'user':
            return msg.content
    return ""


def _route_by_keywords(text: str) -> Literal["qa", "rag", "sql"]:
    """
    基于关键词的路由规则
    
    Args:
        text: 用户输入文本
        
    Returns:
        路由目标: "qa" | "rag" | "sql"
    """
    text_lower = text.lower()
    
    # 检查 SQL 关键词
    for keyword in SQL_KEYWORDS:
        if keyword.lower() in text_lower:
            return "sql"
    
    # 检查 RAG 关键词
    for keyword in RAG_KEYWORDS:
        if keyword.lower() in text_lower:
            return "rag"
    
    # 默认 QA
    return "qa"


class RouterGraph:
    """
    路由图
    
    图结构: START → route → dispatch → END
    
    - route: 根据关键词判断路由目标
    - dispatch: 调用对应子 Agent 并返回结果
    """
    
    def __init__(self, subapps: Dict[str, CompiledStateGraph]):
        """
        初始化路由图
        
        Args:
            subapps: 子 Agent 映射 {"qa": qa_app, "rag": rag_app, "sql": sql_app}
        """
        self.subapps = subapps
        
        # 构建图
        self.workflow = StateGraph(RouterState)
        
        # 添加节点
        self.workflow.add_node("route", self._route_node)
        self.workflow.add_node("dispatch", self._dispatch_node)
        
        # 添加边
        self.workflow.add_edge(START, "route")
        self.workflow.add_edge("route", "dispatch")
        self.workflow.add_edge("dispatch", END)
    
    async def _route_node(self, state: RouterState, config: RunnableConfig) -> dict:
        """
        路由节点
        
        根据用户输入判断路由目标
        """
        messages = state.get("messages", [])
        user_text = _get_last_user_message(messages)
        
        route = _route_by_keywords(user_text)
        
        logger.info(f"RouterGraph: route decision = '{route}' for input: {user_text[:50]}...")
        
        return {"route": route}
    
    async def _dispatch_node(self, state: RouterState, config: RunnableConfig) -> dict:
        """
        分发节点
        
        调用对应子 Agent 并返回结果
        """
        route = state.get("route", "qa")
        messages = state.get("messages", [])
        
        subapp = self.subapps.get(route)
        if subapp is None:
            logger.warning(f"RouterGraph: unknown route '{route}', fallback to 'qa'")
            subapp = self.subapps.get("qa")
        
        logger.info(f"RouterGraph: dispatching to '{route}' agent")
        
        # 调用子 Agent
        result = await subapp.ainvoke(
            {"messages": messages},
            config=config
        )
        
        # 返回子 Agent 的 messages
        return {"messages": result.get("messages", [])}
    
    def compile(self, checkpointer=None, store=None) -> CompiledStateGraph:
        """
        编译并返回路由图
        
        注意：Router 本身不需要 checkpointer 和 store
        这里接收参数是为了保持接口一致性
        
        Args:
            checkpointer: 检查点服务（不使用）
            store: 存储服务（不使用）
            
        Returns:
            编译后的 CompiledGraph
        """
        # Router 不使用 checkpointer 和 store
        # 状态持久化由子 Agent 负责
        return self.workflow.compile()
