"""
Agent Service - Agent 服务层

使用 Router + Multi-SubAgent 架构：
- 先进行路由判断
- 然后直接调用对应子 Agent 的流式方法
- 确保 store 和 checkpointer 正确传递
"""
from typing import List, AsyncGenerator

from langchain_core.messages import HumanMessage

from .utils import convert_to_vercel_sse
from .schemas import ChatMessage
from .dependencies import get_checkpointer, get_store
from .subagents import QAAgent, RAGAgent, SQLAgent
from .router_graph import _route_by_keywords
from services.logging_service import logger


class AgentService:
    """
    Agent 服务
    
    使用 Router + Multi-SubAgent 架构：
    1. 根据输入判断路由目标
    2. 直接调用对应子 Agent
    3. 返回子 Agent 的响应
    """
    
    def __init__(self):
        """
        初始化 Agent 服务
        
        采用懒加载策略，避免启动期间数据库连接阻塞
        """
        self._apps = None
        self._qa_agent = None
        self._rag_agent = None
        self._sql_agent = None

    def _init_agents(self):
        """初始化所有子 Agent"""
        if self._apps is not None:
            return
        
        logger.info("AgentService: initializing SubAgents...")
        
        # 获取依赖
        checkpointer = get_checkpointer()
        store = get_store()
        
        # 初始化并编译子 Agents（带 checkpointer 和 store）
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
        """根据路由获取对应的 Agent app"""
        self._init_agents()
        return self._apps.get(route, self._apps["qa"])

    async def chat(self, query: str, history: List[ChatMessage], session_id: str = "default", kb_id: str | None = None):
        """
        非流式对话
        
        Args:
            query: 用户输入
            history: 聊天历史
            session_id: 会话 ID
            
        Returns:
            str: Agent 回复内容
        """
        # 路由判断
        route = _route_by_keywords(query)
        logger.info(f"AgentService: route decision = '{route}' for query: {query[:50]}...")
        
        # 获取对应 Agent
        app = self._get_app(route)
        
        input_messages = [HumanMessage(content=query)]
        config = {
            "configurable": {"thread_id": session_id},
            "metadata": {"user_id": session_id, "kb_id": kb_id}
        }
        
        result = await app.ainvoke({"messages": input_messages}, config=config)
        return result["messages"][-1].content

    async def chat_stream(self, query: str, history: List[ChatMessage], session_id: str, user_id: str = "default_user", kb_id: str | None = None) -> AsyncGenerator[str, None]:
        """
        流式对话
        
        返回符合 Vercel AI SDK 格式的 SSE 数据
        
        Args:
            query: 用户输入
            history: 聊天历史
            session_id: 会话 ID
            user_id: 用户 ID
            
        Yields:
            str: SSE 数据块
        """
        # 路由判断
        route = _route_by_keywords(query)
        logger.info(f"AgentService: route decision = '{route}' for query: {query[:50]}...")
        
        # 获取对应 Agent
        app = self._get_app(route)
        
        input_messages = [HumanMessage(content=query)]
        
        config = {
            "configurable": {"thread_id": session_id},
            "metadata": {"user_id": user_id, "kb_id": kb_id} 
        }
        
        async for event in app.astream_events(
            {"messages": input_messages},
            config=config,
            version="v2"
        ):
            try:
                logger.debug(
                    f"Agent event: {event.get('event')} name={event.get('name')}"
                )
            except Exception as exc:
                logger.warning(f"log agent event failed: {exc}")
            
            chunk = convert_to_vercel_sse(event)
            if chunk:
                yield chunk
