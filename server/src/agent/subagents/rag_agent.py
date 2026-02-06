"""
RAG Agent - 知识库检索增强生成 Agent (Stub)

TODO: 后续接入向量检索
"""
from typing import Annotated, List
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.graph.state import CompiledStateGraph

from services.logging_service import logger


class RAGAgentState(TypedDict):
    """RAG Agent 状态"""
    messages: Annotated[List[BaseMessage], add_messages]


class RAGAgent:
    """
    RAG Agent - 知识库检索增强生成 (Stub 版本)
    
    TODO: 后续实现：
    - 向量检索
    - 文档分块
    - 上下文增强
    """
    
    def __init__(self):
        """初始化 RAG Agent"""
        # 构建图
        self.workflow = StateGraph(RAGAgentState)
        
        # 添加节点
        self.workflow.add_node("answer", self._answer)
        
        # 添加边
        self.workflow.add_edge(START, "answer")
        self.workflow.add_edge("answer", END)
    
    async def _answer(self, state: RAGAgentState, config: RunnableConfig):
        """
        回答节点 (Stub)
        
        返回固定文本，后续接入向量检索
        """
        logger.info("RAGAgent: stub response triggered")
        
        stub_response = AIMessage(
            content="(RAGAgent stub) 后续接向量检索。当前 RAG 功能尚未实现，请稍后重试。"
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
