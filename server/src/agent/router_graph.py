"""
Router Graph - 路由图

负责：
1. 根据用户输入判断路由目标 (QA / RAG / SQL)
2. 通过条件边分发到对应子 Agent
3. 事件流自动透传

注意：
- Router 只做路由，不注入业务工具
- Router 优先使用 LLM 路由（结合用户记忆和上下文）
- 关键词规则仅作为兜底 fallback
"""
from typing import Dict, Literal

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.base import BaseStore

from config import settings
from .llm import DeepSeekChat
from .state import RouterState
from services.logging_service import logger


# 路由规则关键词（仅作为 fallback）
SQL_KEYWORDS = [
    "sql", "数据库", "查询", "统计", "表", "字段",
    "database", "query", "table", "column", "record",
    "多少条", "有几条", "条数", "记录数",
]

RAG_KEYWORDS = [
    "文档", "知识库", "rag", "检索", "根据资料",
    "document", "knowledge", "retrieve", "search",
    "参考", "资料", "文件",
]


def _get_last_user_message(messages: list[BaseMessage]) -> str:
    """获取最后一条用户消息内容"""
    for msg in reversed(messages):
        if hasattr(msg, "type") and msg.type == "human":
            return msg.content
        if hasattr(msg, "content") and getattr(msg, "role", None) == "user":
            return msg.content
    return ""


def _route_by_keywords(text: str) -> Literal["qa", "rag", "sql"]:
    """基于关键词的 fallback 路由规则。"""
    text_lower = text.lower()

    for keyword in SQL_KEYWORDS:
        if keyword.lower() in text_lower:
            return "sql"

    for keyword in RAG_KEYWORDS:
        if keyword.lower() in text_lower:
            return "rag"

    return "qa"


def _normalize_route(raw: str | None) -> Literal["qa", "rag", "sql"] | None:
    if not raw:
        return None
    value = raw.strip().lower()
    if value in {"qa", "rag", "sql"}:
        return value  # type: ignore[return-value]
    return None


def _collect_router_memories(store: BaseStore, user_id: str, limit: int = 8) -> str:
    """读取用户长期记忆，供 Router LLM 决策。"""
    try:
        memories = store.search(("memories", user_id), limit=limit)
    except Exception as exc:
        logger.warning(f"RouterGraph: load memories failed for user={user_id}: {exc}")
        return ""

    lines: list[str] = []
    for mem in memories:
        value = getattr(mem, "value", {}) or {}
        content = value.get("content")
        if content:
            lines.append(f"- {content}")

    return "\n".join(lines)


def _collect_recent_history(messages: list[BaseMessage], limit: int = 6) -> str:
    recent = messages[-limit:]
    rows: list[str] = []
    for msg in recent:
        role = getattr(msg, "type", None) or getattr(msg, "role", "unknown")
        content = getattr(msg, "content", "")
        rows.append(f"{role}: {content}")
    return "\n".join(rows)


async def route_by_llm(
    query: str,
    messages: list[BaseMessage],
    user_id: str,
    store: BaseStore,
    llm: DeepSeekChat | None = None,
) -> Literal["qa", "rag", "sql"]:
    """
    使用 LLM + 用户记忆进行路由。

    返回严格三选一：qa / rag / sql，异常时 fallback 到关键词规则。
    """
    router_llm = llm or DeepSeekChat(
        model=settings.agent.deepseek_chat_model,
        api_key=settings.agent.deepseek_api_key,
        base_url=settings.agent.deepseek_base_url,
        temperature=0,
    )

    memories_text = _collect_router_memories(store=store, user_id=user_id)
    history_text = _collect_recent_history(messages=messages)

    system_prompt = (
        "You are a router for a multi-agent system. "
        "Select exactly ONE target agent from [qa, rag, sql].\n"
        "Return ONLY one token: qa or rag or sql.\n"
        "Decision policy:\n"
        "- sql: database/schema/query/aggregation/count/reporting requests.\n"
        "- rag: asks based on documents/knowledge base/files/retrieval or citations from corpus.\n"
        "- qa: everything else (general Q&A, conversation, writing, reasoning).\n"
        "Use user memory and recent conversation to disambiguate."
    )

    user_prompt = (
        f"[User ID]\n{user_id}\n\n"
        f"[User Memory]\n{memories_text if memories_text else '(none)'}\n\n"
        f"[Recent Conversation]\n{history_text if history_text else '(none)'}\n\n"
        f"[Current User Query]\n{query}\n\n"
        "Output one token only: qa or rag or sql"
    )

    try:
        response = await router_llm.ainvoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        )
        content = getattr(response, "content", "")
        route = _normalize_route(content)
        if route:
            logger.info(f"RouterGraph: llm route='{route}' for query='{query[:80]}'")
            return route
        logger.warning(f"RouterGraph: invalid llm route content='{content}', fallback to keywords")
    except Exception as exc:
        logger.warning(f"RouterGraph: llm routing failed: {exc}, fallback to keywords")

    return _route_by_keywords(query)


def _route_condition(state: RouterState) -> Literal["qa", "rag", "sql"]:
    """用于条件边，根据 state.route 返回下一个节点名称。"""
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

    def __init__(self, subapps: Dict[str, CompiledStateGraph], llm: DeepSeekChat | None = None):
        self.subapps = subapps
        self.llm = llm
        self._workflow = None

    def _build_workflow(self) -> StateGraph:
        workflow = StateGraph(RouterState)
        workflow.add_node("route_node", self._route_node)

        for name, subapp in self.subapps.items():
            workflow.add_node(name, subapp)

        workflow.add_edge(START, "route_node")
        workflow.add_conditional_edges(
            "route_node",
            _route_condition,
            {"qa": "qa", "rag": "rag", "sql": "sql"},
        )

        for name in self.subapps.keys():
            workflow.add_edge(name, END)

        return workflow

    async def _route_node(self, state: RouterState, config, store: BaseStore) -> dict:
        messages = state.get("messages", [])
        user_text = _get_last_user_message(messages)

        metadata = config.get("metadata", {}) if config else {}
        user_id = metadata.get("user_id") or config.get("configurable", {}).get("thread_id", "default_user")

        route = await route_by_llm(
            query=user_text,
            messages=messages,
            user_id=user_id,
            store=store,
            llm=self.llm,
        )

        logger.info(f"RouterGraph: route decision='{route}' for user={user_id} input='{user_text[:50]}'")
        return {"route": route}

    def compile(self, checkpointer=None, store=None) -> CompiledStateGraph:
        workflow = self._build_workflow()
        return workflow.compile(checkpointer=checkpointer, store=store)
