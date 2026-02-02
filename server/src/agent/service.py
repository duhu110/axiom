from typing import Annotated, List, AsyncGenerator
from typing_extensions import TypedDict

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.store.base import BaseStore

from config import settings
from .utils import convert_to_vercel_sse
from .schemas import ChatMessage
from .tools import get_current_weather, upsert_memory
from .dependencies import get_checkpointer, get_store


# DeepSeek API 配置
DEEPSEEK_API_KEY="sk-69fb5637b84b4934a0c1be8e18f23643"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_THINK_MODEL="deepseek-reasoner"


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

class AgentService:
    def __init__(self):
        # 初始化 LLM
        # 使用 DeepSeek 配置
        self.llm = ChatOpenAI(
            model=DEEPSEEK_MODEL,
            api_key=DEEPSEEK_API_KEY,
            base_url=DEEPSEEK_BASE_URL
        )
        
        # 绑定工具
        # 添加记忆工具 upsert_memory
        self.tools = [get_current_weather, upsert_memory]
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # 构建图
        workflow = StateGraph(AgentState)
        
        # 添加节点
        workflow.add_node("agent", self.call_model)
        workflow.add_node("tools", ToolNode(self.tools))
        
        # 添加边
        workflow.add_edge(START, "agent")
        workflow.add_conditional_edges(
            "agent",
            tools_condition,
        )
        workflow.add_edge("tools", "agent")
        
        # 使用 Postgres Checkpointer 和 Store (懒加载)
        # 注意：这里我们不在 __init__ 中获取依赖，因为它们在 lifespan 中初始化
        # 我们需要在第一次调用时或者懒加载时获取
        self.workflow = workflow
        self._app = None

    @property
    def app(self):
        if self._app is None:
            checkpointer = get_checkpointer()
            store = get_store()
            self._app = self.workflow.compile(checkpointer=checkpointer, store=store)
        return self._app

    async def call_model(self, state: AgentState, config: RunnableConfig, store: BaseStore):
        messages = state["messages"]
        
        # 注入记忆上下文
        # 1. 获取当前 User ID (优先从 metadata 获取，否则尝试 thread_id)
        # 这里的 user_id 必须与 tools 中获取的 user_id 逻辑一致
        metadata = config.get("metadata", {})
        user_id = metadata.get("user_id")
        
        if not user_id:
            # Fallback (尽量避免，因为 thread_id 是 session 级的)
            user_id = config.get("configurable", {}).get("thread_id", "default_user")
        
        # 2. 从 Store 中检索记忆
        namespace = ("memories", user_id)
        memories = store.search(namespace)
        
        # 3. 构建 System Prompt
        memory_content = "\n".join([f"- {m.value['content']}" for m in memories])
        system_msg = f"""You are a helpful assistant with long-term memory.
        
Current User ID: {user_id}

Here are some things you remember about this user:
{memory_content if memory_content else "No memories yet."}

You can use the `upsert_memory` tool to save new important information about the user.
"""
        
        # 4. 组合消息 (System Prompt + History)
        # 注意：这里我们不直接修改 state['messages']，而是构造调用 LLM 的输入
        # 如果 state['messages'] 第一个是 SystemMessage，则替换，否则插入
        
        # 简单策略：总是将 System Message 放在最前面
        input_messages = [SystemMessage(content=system_msg)] + messages
        
        response = await self.llm_with_tools.ainvoke(input_messages)
        return {"messages": [response]}

    async def chat(self, query: str, history: List[ChatMessage], session_id: str = "default"):
        """
        非流式对话
        """
        input_messages = [HumanMessage(content=query)]
        config = {
            "configurable": {"thread_id": session_id},
            "metadata": {"user_id": session_id} # 简单起见，暂用 session_id 作为 user_id
        }
        
        # 注意: 使用 Checkpointer 时，LangGraph 会自动加载历史
        # 如果需要合并前端传来的 history，可以在这里处理，但通常有了 Memory 后不需要前端传历史
        
        result = await self.app.ainvoke({"messages": input_messages}, config=config)
        return result["messages"][-1].content

    async def chat_stream(self, query: str, history: List[ChatMessage], session_id: str, user_id: str = "default_user") -> AsyncGenerator[str, None]:
        """
        流式对话，返回符合 Vercel AI SDK 格式的 SSE 数据
        """
        input_messages = [HumanMessage(content=query)]
        
        # 将 user_id 放入 metadata 中
        config = {
            "configurable": {"thread_id": session_id},
            "metadata": {"user_id": user_id} 
        }
        
        async for event in self.app.astream_events(
            {"messages": input_messages},
            config=config,
            version="v2"
        ):
            chunk = convert_to_vercel_sse(event)
            if chunk:
                yield chunk
