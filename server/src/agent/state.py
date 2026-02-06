"""
Agent 状态定义模块

定义 Router 和 SubAgent 使用的状态类型
"""
from typing import Annotated, List, Literal
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """基础 Agent 状态"""
    messages: Annotated[List[BaseMessage], add_messages]


class RouterState(AgentState):
    """Router 状态，包含路由结果"""
    route: Literal["qa", "rag", "sql"]
