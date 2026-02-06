"""
Agent Service - Agent 服务层

使用 Router Agent + Multi-SubAgent 架构：
- RouterGraph: 路由分发
- QAAgent: 通用问答
- RAGAgent: 知识库检索（stub）
- SQLAgent: SQL 查询（stub）
"""
from typing import List, AsyncGenerator

from langchain_core.messages import HumanMessage

from .utils import convert_to_vercel_sse
from .schemas import ChatMessage
from .dependencies import get_checkpointer, get_store
from .subagents import QAAgent, RAGAgent, SQLAgent
from .router_graph import RouterGraph
from services.logging_service import logger


class AgentService:
    """
    Agent 服务
    
    使用 Router + Multi-SubAgent 架构：
    1. RouterGraph 根据输入判断路由目标
    2. 分发到对应子 Agent 处理
    3. 返回子 Agent 的响应
    """
    
    def __init__(self):
        """
        初始化 Agent 服务
        
        采用懒加载策略，避免启动期间数据库连接阻塞
        """
        self._app = None
        self._qa_agent = None
        self._rag_agent = None
        self._sql_agent = None

    @property
    def app(self):
        """
        获取编译后的路由图
        
        懒加载：首次访问时编译
        """
        if self._app is None:
            logger.info("AgentService: initializing Router + SubAgents...")
            
            # 获取依赖
            checkpointer = get_checkpointer()
            store = get_store()
            
            # 初始化子 Agents
            self._qa_agent = QAAgent()
            self._rag_agent = RAGAgent()
            self._sql_agent = SQLAgent()
            
            # 编译子 Agents
            qa_app = self._qa_agent.compile(checkpointer=checkpointer, store=store)
            rag_app = self._rag_agent.compile(checkpointer=checkpointer, store=store)
            sql_app = self._sql_agent.compile(checkpointer=checkpointer, store=store)
            
            # 初始化 RouterGraph
            router = RouterGraph({
                "qa": qa_app,
                "rag": rag_app,
                "sql": sql_app,
            })
            
            # 编译 RouterGraph
            self._app = router.compile()
            
            logger.info("AgentService: Router + SubAgents initialized successfully")
        
        return self._app

    async def chat(self, query: str, history: List[ChatMessage], session_id: str = "default"):
        """
        非流式对话
        
        Args:
            query: 用户输入
            history: 聊天历史
            session_id: 会话 ID
            
        Returns:
            str: Agent 回复内容
        """
        input_messages = [HumanMessage(content=query)]
        config = {
            "configurable": {"thread_id": session_id},
            "metadata": {"user_id": session_id}
        }
        
        result = await self.app.ainvoke({"messages": input_messages}, config=config)
        return result["messages"][-1].content

    async def chat_stream(self, query: str, history: List[ChatMessage], session_id: str, user_id: str = "default_user") -> AsyncGenerator[str, None]:
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
        input_messages = [HumanMessage(content=query)]
        
        config = {
            "configurable": {"thread_id": session_id},
            "metadata": {"user_id": user_id} 
        }
        
        async for event in self.app.astream_events(
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
