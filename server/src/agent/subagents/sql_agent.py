"""
SQL Agent - 数据库查询 Agent (Stub)

TODO: 后续接入 SQL Agent
"""
from typing import Annotated, List
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.graph.state import CompiledStateGraph

from services.logging_service import logger


class SQLAgentState(TypedDict):
    """SQL Agent 状态"""
    messages: Annotated[List[BaseMessage], add_messages]


class SQLAgent:
    """
    SQL Agent - 数据库查询 (Stub 版本)
    
    TODO: 后续实现：
    - SQL 生成
    - 查询执行
    - 结果格式化
    - 安全校验
    """
    
    def __init__(self):
        """初始化 SQL Agent"""
        # 构建图
        self.workflow = StateGraph(SQLAgentState)
        
        # 添加节点
        self.workflow.add_node("answer", self._answer)
        
        # 添加边
        self.workflow.add_edge(START, "answer")
        self.workflow.add_edge("answer", END)
    
    async def _answer(self, state: SQLAgentState, config: RunnableConfig):
        """
        回答节点 (Stub)
        
        返回固定文本，后续接入 SQL Agent
        """
        logger.info("SQLAgent: stub response triggered")
        
        stub_response = AIMessage(
            content="(SQLAgent stub) 后续接 SQL Agent。当前 SQL 查询功能尚未实现，请稍后重试。"
        )
        
        return {"messages": [stub_response]}
    
    def compile(self, checkpointer=None, store=None) -> CompiledStateGraph:
        """
        编译并返回 Agent 图
        
        Args:
            checkpointer: 检查点服务
            store: 存储服务
            
        Returns:
            编译后的 CompiledGraph
        """
        return self.workflow.compile(checkpointer=checkpointer, store=store)
