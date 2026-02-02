这是一个非常关键的架构设计点。要实现 LangChain/LangGraph Agent 通过 FastAPI 对外提供 SSE（Server-Sent Events）服务，并**完整输出思考过程（Thought）、工具调用（Tool Calls）和工具结果（Tool Outputs）**，最推荐的方案是遵循 **Vercel AI SDK Data Stream Protocol**。

这种协议已成为现代 AI 前端（如 React/Next.js）的事实标准，能让前端通过 `useChat` 钩子极其轻松地渲染打字机效果、工具调用状态和中间推理步骤。

以下是结合您的 `server` 基础架构设计（v2.0）的完整实现方案。

---

### 1. 核心架构原理

我们需要在 FastAPI 和 LangChain 之间构建一个**适配层（Adapter）**：

1.  **输入源**：LangGraph 的 `astream_events`（它能捕获 LLM 流、工具开始/结束等所有细粒度事件）。
2.  **转换器**：一个异步生成器，将 LangChain 的内部事件转换为 Vercel AI SDK 支持的 SSE 格式字符串。
3.  **输出响应**：FastAPI 的 `StreamingResponse`。

### 2. 实现步骤

#### 第一步：定义流式转换器 (Stream Transformer)

我们需要一个工具函数，将 LangChain 的事件映射为前端能看懂的协议。

> **协议参考**：
> *   `0:"text_delta"`: 文本增量
> *   `9:{toolCallDef}`: 工具调用定义
> *   `a:{toolResult}`: 工具调用结果

在 `src/utils/stream.py` (新建) 或 `src/agent/utils.py` 中：

```python
import json
from typing import AsyncGenerator
from langchain_core.messages import BaseMessage
from langchain_core.runnables.schema import StreamEvent

async def langgraph_to_vercel_stream(
    input_stream: AsyncGenerator[StreamEvent, None]
) -> AsyncGenerator[str, None]:
    """
    将 LangGraph 的 astream_events 转换为 Vercel AI SDK Data Stream Protocol
    """
    async for event in input_stream:
        kind = event["event"]
        
        # 1. 处理 LLM 生成的文本流 (Thought/Answer)
        if kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                # 0: 代表文本部分
                yield f'0:{json.dumps(content)}\n'

        # 2. 处理工具调用请求 (Tool Call)
        elif kind == "on_tool_start":
            # 注意：LangChain 的 tool_start 通常包含完整输入
            # 为了前端能显示“正在调用工具...”，我们需要发送工具元数据
            # 协议 9: 代表 Data Part (通常用于 Tool Call 定义)
            tool_name = event["name"]
            inputs = event["data"].get("input")
            # 这里简化处理，实际可能需要处理 tool_id 匹配
            # 很多前端库通过 detecting text patterns，但 Vercel SDK 推荐结构化
            # 此处演示发送一个自定义的数据块，前端可用于显示状态
            tool_info = {
                "type": "tool_start",
                "tool": tool_name,
                "input": inputs
            }
            # 2: 代表自定义数据 (Data Part)
            yield f'2:{json.dumps([tool_info])}\n'

        # 3. 处理工具执行结果 (Tool Output)
        elif kind == "on_tool_end":
            tool_name = event["name"]
            output = event["data"].get("output")
            # 序列化结果，如果是对象则转 JSON 字符串
            if not isinstance(output, str):
                output = json.dumps(output)
            
            tool_result = {
                "type": "tool_result",
                "tool": tool_name,
                "result": output
            }
            # 2: 继续使用自定义数据块发送结果
            yield f'2:{json.dumps([tool_result])}\n'
            
    # 结束流 (可选，FastAPI 会自动关闭连接)
    # yield 'd:{"finishReason":"stop"}\n' 
```

*注意：如果你希望前端像 ChatGPT 一样完美渲染“思考框”和“工具卡片”，建议使用更严格的 `tool-call` (9) 和 `tool-result` (a) 协议前缀，或者使用 `langchain-aisdk-adapter` 库 来自动处理这种复杂的映射。*

#### 第二步：在 Service 层调用 LangGraph

在 `src/agent/service.py` 中：

```python
from src.infrastructure.database import AsyncSession
from src.agent.graph import app_graph # 假设你的 LangGraph 实例
from src.agent.utils import langgraph_to_vercel_stream

class AgentService:
    async def chat_stream(self, message: str, thread_id: str):
        """
        执行 Agent 并返回流式生成器
        """
        input_data = {"messages": [("user", message)]}
        config = {"configurable": {"thread_id": thread_id}}

        # 使用 astream_events 获取最细粒度的事件
        # version="v2" 是必须的，标准化了输出
        event_stream = app_graph.astream_events(
            input_data, 
            config=config, 
            version="v2"
        )

        return langgraph_to_vercel_stream(event_stream)
```

#### 第三步：FastAPI 路由实现

在 `src/agent/router.py` 中，使用 `StreamingResponse`：

```python
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from src.agent.service import AgentService
from src.auth.dependencies import get_current_user # 复用之前设计的鉴权

router = APIRouter()
agent_service = AgentService()

@router.post("/chat/stream")
async def chat_stream_endpoint(
    request: dict, # 包含 { "messages": ... }
    user = Depends(get_current_user)
):
    # 提取用户最新的一条消息
    last_message = request["messages"][-1]["content"]
    # 使用 user.id 作为 thread_id 的一部分，实现用户隔离
    thread_id = str(user.id)

    # 获取生成器
    stream_generator = await agent_service.chat_stream(
        message=last_message,
        thread_id=thread_id
    )

    return StreamingResponse(
        stream_generator,
        media_type="text/event-stream",
        headers={
            # 这是一个关键 Header，告诉 Vercel SDK 这是一个数据流
            "X-Vercel-AI-Data-Stream": "v1",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

---

### 3. 为什么这个方案符合你的设计？

1.  **解耦 (Decoupling)**：
    *   **Router** 只负责 HTTP 协议转换（StreamingResponse）。
    *   **Service** 负责调用 Graph。
    *   **Utils** 负责协议格式化（langgraph -> vercel protocol）。
    *   不需要在 Graph 内部写任何 HTTP 相关的代码。

2.  **全链路监控 (Observability)**：
    *   `astream_events` 不仅包含 token，还包含 `on_chain_start`, `on_retriever_end` 等。你可以在 `langgraph_to_vercel_stream` 转换器中，利用 Loguru 记录关键节点的耗时日志，实现无侵入的监控。

3.  **兼容性**：
    *   前端可以直接使用 Vercel AI SDK 的 standard hooks：
        ```javascript
        // 前端代码示例 (React)
        import { useChat } from 'ai/react';
        
        const { messages, input, handleInputChange, handleSubmit } = useChat({
          api: 'http://localhost:8000/api/v1/agent/chat/stream',
          // 自定义处理工具结果
          onToolCall: async (toolCall) => {
             console.log("Agent is calling tool:", toolCall);
          }
        });
        ```

### 4. 进阶优化：处理长时间运行的任务

根据你之前提到的 `Worker` 架构 [Source: 之前对话]，如果 Agent 的工具调用非常耗时（例如 FastEmbed 解析大文件），`StreamingResponse` 可能会遇到超时问题。

**优化方案：**
对于极耗时的任务，不要直接在 Stream 中等待结果。
1.  Agent 决定调用工具（例如 `embed_file`）。
2.  Agent 发出 `tool_call` 事件。
3.  后端工具逻辑**不直接执行**，而是向 Redis 队列推任务（Task Manager），并立即返回一个 "Processing..." 的中间状态给前端。
4.  前端收到状态后，通过轮询或另外的 SSE 通道监听任务状态。
5.  或者，Agent 进入 `interrupt` 状态（LangGraph 的 Human-in-the-loop 能力），等待外部 Worker 完成后，通过 API 唤醒 Agent 继续执行。

### 总结

要对外提供 SSE 并输出全部思考与工具调用：
1.  使用 **FastAPI `StreamingResponse`**。
2.  使用 **LangGraph `astream_events(version="v2")`** 捕获所有中间步骤。
3.  实现一个**适配器**，将 `on_tool_start`/`on_tool_end` 等事件转换为 **Vercel AI SDK Data Stream Protocol** 格式（`0:"text"`, `2:[json]`）。
4.  利用 `X-Vercel-AI-Data-Stream: v1` 响应头确保前端 SDK 自动解析。