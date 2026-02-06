"""
Router Graph - 路由图

负责：
1. 根据用户输入判断路由目标 (QA / RAG / SQL)
2. 通过条件边分发到对应子 Agent
3. 事件流自动透传

注意：
- Router 只做路由，不注入记忆
- Router 不包含业务逻辑
- 使用条件边实现路由，确保事件流正确透传
"""
from typing import Dict, Literal

from langchain_core.messages import BaseMessage
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


def _route_condition(state: RouterState) -> Literal["qa", "rag", "sql"]:
    """
    路由条件函数
    
    用于条件边，根据 state.route 返回下一个节点名称
    """
    route = state.get("route", "qa")
    logger.info(f"RouterGraph: routing to '{route}' agent")
    return route


class RouterGraph:
    """
    路由图
    
    图结构: 
        START → route_node → (条件边) → qa/rag/sql → END
    
    使用条件边实现路由分发，确保子 Agent 的事件流正确透传
    """
    
    def __init__(self, subapps: Dict[str, CompiledStateGraph]):
        """
        初始化路由图
        
        Args:
            subapps: 子 Agent 映射 {"qa": qa_app, "rag": rag_app, "sql": sql_app}
        """
        self.subapps = subapps
        self._workflow = None
    
    def _build_workflow(self) -> StateGraph:
        """构建工作流图"""
        workflow = StateGraph(RouterState)
        
        # 添加路由节点
        workflow.add_node("route_node", self._route_node)
        
        # 添加子 Agent 作为子图节点
        for name, subapp in self.subapps.items():
            workflow.add_node(name, subapp)
        
        # 添加边：START → route_node
        workflow.add_edge(START, "route_node")
        
        # 添加条件边：route_node → qa/rag/sql
        workflow.add_conditional_edges(
            "route_node",
            _route_condition,
            {
                "qa": "qa",
                "rag": "rag",
                "sql": "sql",
            }
        )
        
        # 添加边：所有子 Agent → END
        for name in self.subapps.keys():
            workflow.add_edge(name, END)
        
        return workflow
    
    async def _route_node(self, state: RouterState) -> dict:
        """
        路由节点
        
        根据用户输入判断路由目标，设置 state.route
        """
        messages = state.get("messages", [])
        user_text = _get_last_user_message(messages)
        
        route = _route_by_keywords(user_text)
        
        logger.info(f"RouterGraph: route decision = '{route}' for input: {user_text[:50]}...")
        
        return {"route": route}
    
    def compile(self, checkpointer=None, store=None) -> CompiledStateGraph:
        """
        编译并返回路由图
        
        Args:
            checkpointer: 检查点服务
            store: 存储服务
            
        Returns:
            编译后的 CompiledStateGraph
        """
        workflow = self._build_workflow()
        
        # Router 可以使用 checkpointer 来保存路由状态
        # store 主要由子 Agent 使用
        return workflow.compile(checkpointer=checkpointer, store=store)
