"""
RAG Agent - 知识库检索增强生成 Agent

实现要点：
1. 支持显式 kb_id 检索
2. 未指定 kb_id 时，默认检索：当前用户私有知识库 + 全部公开知识库
3. Agentic RAG 流程：Rewrite question -> Search -> Generate answer
"""
from uuid import UUID
from typing import Annotated, List
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.graph.state import CompiledStateGraph

from config import settings
from database import AsyncSessionLocal
from knowledgebase.services.kb_service import KBService
from knowledgebase.services.retriever_factory import RetrieverFactory
from ..llm import DeepSeekChat
from services.logging_service import logger


class RAGAgentState(TypedDict, total=False):
    """RAG Agent 状态"""
    messages: Annotated[List[BaseMessage], add_messages]
    query: str
    rewritten_query: str
    documents: list


class RAGAgent:
    """RAG Agent - 基于知识库检索增强回答"""

    def __init__(self, llm=None):
        """初始化 RAG Agent"""
        if llm is None:
            self.llm = DeepSeekChat(
                model=settings.agent.deepseek_model,
                api_key=settings.agent.deepseek_api_key,
                base_url=settings.agent.deepseek_base_url,
            )
        else:
            self.llm = llm

        self.workflow = StateGraph(RAGAgentState)
        self.workflow.add_node("rewrite", self._rewrite_question)
        self.workflow.add_node("search", self._search)
        self.workflow.add_node("answer", self._answer)

        self.workflow.add_edge(START, "rewrite")
        self.workflow.add_edge("rewrite", "search")
        self.workflow.add_edge("search", "answer")
        self.workflow.add_edge("answer", END)

    @staticmethod
    def _get_last_user_message(messages: List[BaseMessage]) -> str:
        for msg in reversed(messages):
            if isinstance(msg, HumanMessage):
                return msg.content
            if getattr(msg, "type", None) == "human":
                return getattr(msg, "content", "")
        return ""

    async def _resolve_retriever(self, user_id: str, kb_id: str | None):
        """解析检索器：优先单 KB，否则走默认可访问知识库范围"""
        if kb_id:
            try:
                kb_uuid = UUID(kb_id)
            except ValueError:
                logger.warning("RAGAgent: invalid kb_id=%s, fallback to accessible scope", kb_id)
            else:
                return RetrieverFactory.create_retriever(kb_id=kb_uuid, k=5)

        try:
            user_uuid = UUID(user_id)
        except ValueError as exc:
            raise ValueError("RAG 查询需要有效的 user_id(UUID) 以解析默认知识库范围") from exc

        async with AsyncSessionLocal() as session:
            service = KBService(session)
            kb_ids = await service.get_accessible_kb_ids(user_uuid)

        return RetrieverFactory.create_accessible_retriever(kb_ids=kb_ids, k=5)

    async def _rewrite_question(self, state: RAGAgentState, config: RunnableConfig):
        """Rewrite user question to improve retrieval accuracy."""
        messages = state.get("messages", [])
        query = self._get_last_user_message(messages)
        if not query:
            return {"query": "", "rewritten_query": ""}

        system_prompt = (
            "你是检索改写助手。请将用户问题改写为更适合检索的简洁查询，"
            "保持原意、保留关键实体和约束。只输出改写后的问题，不要解释。"
        )
        user_prompt = f"原问题：{query}\n\n改写："

        try:
            response = await self.llm.ainvoke(
                [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
            )
            rewritten = getattr(response, "content", "").strip()
        except Exception as exc:
            logger.exception("RAGAgent: rewrite failed")
            rewritten = query

        return {"query": query, "rewritten_query": rewritten or query}

    async def _search(self, state: RAGAgentState, config: RunnableConfig):
        """Retrieve documents using rewritten query."""
        metadata = config.get("metadata", {}) if config else {}
        user_id = metadata.get("user_id")
        kb_id = metadata.get("kb_id")

        query = state.get("rewritten_query") or state.get("query")
        if not query:
            return {"documents": []}

        if not user_id:
            logger.warning("RAGAgent: missing user_id for retrieval")
            return {"documents": []}

        try:
            retriever = await self._resolve_retriever(user_id=user_id, kb_id=kb_id)
            docs = await retriever.ainvoke(query)
        except Exception:
            logger.exception("RAGAgent: retrieval failed")
            docs = []

        return {"documents": docs}

    async def _answer(self, state: RAGAgentState, config: RunnableConfig):
        """Generate final answer from retrieved documents."""
        messages = state.get("messages", [])
        query = state.get("query") or self._get_last_user_message(messages)
        docs = state.get("documents", [])

        if not query:
            return {"messages": [AIMessage(content="请先输入要检索的问题。")]} 

        context_blocks = []
        for idx, doc in enumerate(docs[:5], 1):
            snippet = (getattr(doc, "page_content", None) or "").strip()
            if snippet:
                context_blocks.append(f"[{idx}] {snippet[:1200]}")

        if not context_blocks:
            return {"messages": [AIMessage(content="未检索到相关知识库内容，请尝试换个问法。")]} 

        system_prompt = (
            "你是一个基于知识库回答问题的助手。"
            "请严格依据提供的检索片段作答；"
            "若证据不足，请明确说明。"
        )
        user_prompt = (
            f"用户问题：{query}\n\n"
            f"检索到的知识片段：\n{chr(10).join(context_blocks)}\n\n"
            "请基于上述片段给出简洁、准确的中文回答。"
        )

        response = await self.llm.ainvoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        )

        return {"messages": [response]}

    def compile(self, checkpointer=None, store=None) -> CompiledStateGraph:
        """编译并返回 Agent 图"""
        return self.workflow.compile(checkpointer=checkpointer, store=store)
