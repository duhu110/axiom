"""
Agent Service - Agent 服务层

使用 Router + Multi-SubAgent 架构：
- 使用 LLM Router（结合用户记忆与上下文）决定子 Agent
- 然后调用对应子 Agent
- 确保 store 和 checkpointer 正确传递
"""
from typing import List, AsyncGenerator

from langchain_core.messages import HumanMessage, AIMessage

from .utils import convert_to_vercel_sse
from .schemas import ChatMessage
from .dependencies import get_checkpointer, get_store
from .subagents import QAAgent, RAGAgent, SQLAgent
from .router_graph import route_by_llm
from services.logging_service import logger
from llm_usage.service import record_usage


class AgentService:
    """Agent 服务。"""

    def __init__(self):
        self._apps = None
        self._qa_agent = None
        self._rag_agent = None
        self._sql_agent = None
        self._store = None

    def _init_agents(self):
        if self._apps is not None:
            return

        logger.info("AgentService: initializing SubAgents...")
        checkpointer = get_checkpointer()
        store = get_store()
        self._store = store

        self._qa_agent = QAAgent()
        self._rag_agent = RAGAgent()
        self._sql_agent = SQLAgent()

        self._apps = {
            "qa": self._qa_agent.compile(checkpointer=checkpointer, store=store),
            "rag": self._rag_agent.compile(checkpointer=checkpointer, store=store),
            "sql": self._sql_agent.compile(checkpointer=checkpointer, store=store),
        }

        logger.info("AgentService: SubAgents initialized successfully")

    def _get_app(self, route: str):
        self._init_agents()
        return self._apps.get(route, self._apps["qa"])

    @staticmethod
    def _build_input_messages(query: str, history: List[ChatMessage]):
        messages = []
        for item in history or []:
            role = (item.role or "").lower()
            if role in {"user", "human"}:
                messages.append(HumanMessage(content=item.content))
            elif role in {"assistant", "ai"}:
                messages.append(AIMessage(content=item.content))
        messages.append(HumanMessage(content=query))
        return messages

    async def _decide_route(self, query: str, history: List[ChatMessage], user_id: str) -> str:
        self._init_agents()
        input_messages = self._build_input_messages(query=query, history=history)
        route = await route_by_llm(
            query=query,
            messages=input_messages,
            user_id=user_id,
            store=self._store,
        )
        logger.info(f"AgentService: route decision='{route}' for query: {query[:80]}")
        return route

    async def chat(self, query: str, history: List[ChatMessage], session_id: str = "default", kb_id: str | None = None):
        route = await self._decide_route(query=query, history=history, user_id=session_id)
        app = self._get_app(route)

        input_messages = self._build_input_messages(query=query, history=history)
        config = {
            "configurable": {"thread_id": session_id},
            "metadata": {"user_id": session_id, "kb_id": kb_id},
        }

        result = await app.ainvoke({"messages": input_messages}, config=config)
        return result["messages"][-1].content

    async def chat_stream(
        self,
        query: str,
        history: List[ChatMessage],
        session_id: str,
        user_id: str = "default_user",
        kb_id: str | None = None,
    ) -> AsyncGenerator[str, None]:
        route = await self._decide_route(query=query, history=history, user_id=user_id)
        app = self._get_app(route)

        input_messages = self._build_input_messages(query=query, history=history)
        config = {
            "configurable": {"thread_id": session_id},
            "metadata": {"user_id": user_id, "kb_id": kb_id},
        }

        # 用于收集最终的usage信息
        final_usage = None
        final_model_name = None

        async for event in app.astream_events(
            {"messages": input_messages},
            config=config,
            version="v2",
        ):
            try:
                event_name = event.get('event')
                logger.debug(f"Agent event: {event_name} name={event.get('name')}")

                # 监听模型输出结束事件，记录usage
                if event_name == "on_chat_model_end":
                    event_data = event.get('data', {})
                    output = event_data.get('output')

                    # 提取usage信息
                    final_usage = None
                    final_model_name = 'deepseek-chat'

                    if output and hasattr(output, 'response_metadata') and output.response_metadata:
                        raw_usage = output.response_metadata.get('usage')

                        if raw_usage:
                            # CompletionUsage对象需要转换为字典
                            logger.info(f"Found raw usage: {raw_usage}")
                            try:
                                # 转换CompletionUsage为简单字典
                                if hasattr(raw_usage, 'model_dump'):
                                    final_usage = raw_usage.model_dump()
                                else:
                                    # 手动提取字段
                                    final_usage = {
                                        "prompt_tokens": getattr(raw_usage, 'prompt_tokens', 0),
                                        "completion_tokens": getattr(raw_usage, 'completion_tokens', 0),
                                        "total_tokens": getattr(raw_usage, 'total_tokens', 0),
                                    }
                                logger.info(f"Converted usage to dict: {final_usage}")
                            except Exception as e:
                                logger.warning(f"Failed to convert usage to dict: {e}")
                    else:
                        logger.warning("No response_metadata found on AIMessage")

                    # 记录到数据库
                    if final_usage and user_id:
                        try:
                            logger.info(f"Recording LLM usage for user_id={user_id}, model={final_model_name}")
                            await record_usage(
                                user_id=user_id,
                                model_name=final_model_name,
                                usage=final_usage,
                            )
                            logger.info("✓ LLM usage record saved successfully")
                        except Exception as exc:
                            logger.warning(f"Failed to record LLM usage: {exc}")

            except Exception as exc:
                logger.warning(f"log agent event failed: {exc}")

            chunk = convert_to_vercel_sse(event)
            if chunk:
                yield chunk
