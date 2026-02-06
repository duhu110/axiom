"""
QA Agent - 通用问答 Agent

下沉自原有 AgentService 中的 Agent 逻辑
负责：
- 通用对话
- 工具调用（天气、记忆）
- 长期记忆注入
"""
from typing import Annotated, List
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage, AIMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.store.base import BaseStore
from langgraph.graph.state import CompiledStateGraph

from config import settings
from ..llm import DeepSeekChat
from ..tools import get_current_weather, upsert_memory
from llm_usage.service import record_usage_from_response
from services.logging_service import logger


class QAAgentState(TypedDict):
    """QA Agent 状态"""
    messages: Annotated[List[BaseMessage], add_messages]


class QAAgent:
    """
    QA Agent - 通用问答
    
    继承自原有单一 Agent 的完整功能：
    - DeepSeek Reasoner LLM
    - 工具绑定（天气、记忆）
    - 长期记忆注入
    - usage 记录
    """
    
    def __init__(self, llm=None):
        """
        初始化 QA Agent
        
        Args:
            llm: 可选的 LLM 实例，为空则使用默认 DeepSeek 配置
        """
        # 初始化 LLM
        if llm is None:
            self.llm = DeepSeekChat(
                model=settings.agent.deepseek_think_model,
                api_key=settings.agent.deepseek_api_key,
                base_url=settings.agent.deepseek_base_url,
            )
        else:
            self.llm = llm
        
        # 绑定工具
        self.tools = [get_current_weather, upsert_memory]
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # 构建图
        self.workflow = StateGraph(QAAgentState)
        
        # 添加节点
        self.workflow.add_node("agent", self.call_model)
        self.workflow.add_node("tools", ToolNode(self.tools))
        
        # 添加边
        self.workflow.add_edge(START, "agent")
        self.workflow.add_conditional_edges(
            "agent",
            tools_condition,
        )
        self.workflow.add_edge("tools", "agent")
    
    async def call_model(self, state: QAAgentState, config: RunnableConfig, store: BaseStore):
        """
        模型调用节点
        
        实现：
        1. 获取用户 ID
        2. 从 Store 检索记忆
        3. 构建 System Prompt（含记忆上下文）
        4. 调用 LLM
        5. 记录 usage
        """
        messages = state["messages"]
        
        # 1. 获取当前 User ID (优先从 metadata 获取)
        metadata = config.get("metadata", {})
        user_id = metadata.get("user_id")
        
        if not user_id:
            # Fallback
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
        input_messages = [SystemMessage(content=system_msg)] + messages

        # DeepSeek reasoner 要求 assistant message 带 reasoning_content
        # 补齐历史消息中的 reasoning_content
        for idx, msg in enumerate(input_messages):
            if isinstance(msg, AIMessage):
                if "reasoning_content" not in msg.additional_kwargs:
                    msg.additional_kwargs["reasoning_content"] = ""
                if "reasoning_content" not in msg.response_metadata:
                    msg.response_metadata["reasoning_content"] = ""
                logger.debug(
                    f"QAAgent: patch AIMessage idx={idx}"
                )
            elif isinstance(msg, dict):
                role = msg.get("role") or msg.get("type")
                if role in ("assistant", "ai") and "reasoning_content" not in msg:
                    msg["reasoning_content"] = ""
                logger.debug(
                    f"QAAgent: patch dict idx={idx} role={role}"
                )

        response = await self.llm_with_tools.ainvoke(input_messages)

        # 调试日志：查看模型响应与用量元数据
        try:
            usage_metadata = getattr(response, "usage_metadata", None)
            response_metadata = getattr(response, "response_metadata", None)
            logger.debug(f"QAAgent response usage_metadata: {usage_metadata}")
            logger.debug(f"QAAgent response_metadata keys: {list(response_metadata.keys()) if isinstance(response_metadata, dict) else None}")
        except Exception as exc:
            logger.warning(f"QAAgent: log response metadata failed: {exc}")

        # 5. 记录 LLM 用量
        try:
            metadata = config.get("metadata", {})
            user_id = metadata.get("user_id")
            model_name = getattr(self.llm, "model_name", None) or getattr(self.llm, "model", "unknown")
            if user_id:
                logger.info(f"QAAgent: Recording LLM usage for user_id={user_id}, model={model_name}")
                await record_usage_from_response(
                    user_id=user_id,
                    response=response,
                    model_name=model_name,
                )
        except Exception as exc:
            logger.warning(f"QAAgent: record_usage failed: {exc}")

        return {"messages": [response]}
    
    def compile(self, checkpointer=None, store=None) -> CompiledStateGraph:
        """
        编译并返回 Agent 图
        
        Args:
            checkpointer: 检查点服务（会话持久化）
            store: 存储服务（长期记忆）
            
        Returns:
            编译后的 CompiledGraph
        """
        return self.workflow.compile(checkpointer=checkpointer, store=store)
