这是一个非常标准且优秀的FastAPI模块化结构。要将LangChain Agent集成到这个体系中，核心原则是**将Agent视为一个“服务（Service）”**，并将其组件拆分到现有的层级中，而不是创建一个完全独立的“孤岛”。

针对你提到的SQL Assistant和RAG场景，建议的集成方案如下：

### 1. 核心映射策略 (Mapping Strategy)

你需要将LangChain的各个概念映射到你现有的9个文件中：

* **`service.py` (业务逻辑核心)**: 这是Agent的“大脑”。
* **职责**: 初始化Agent/Graph，执行`agent.invoke()`或`agent.stream()`。
* **内容**: 在这里组装LLM、Prompt和Tools。如果是复杂的LangGraph，建议将图的构建逻辑放在这里，或者单独拆分一个`agent_graph.py`并在service中调用。


* **`schemas.py` (数据契约)**: 定义Agent的输入输出。
* **内容**: `ChatRequest` (包含`query`, `history`等) 和 `ChatResponse` (包含`answer`, `sources`, `tool_calls`等)。


* **`dependencies.py` (依赖注入)**: 管理有状态的组件。
* **职责**: 注入`Runnable`、`LLM`实例或数据库连接。
* **关键点**: 如果你的Agent需要记忆（Memory），在这里注入`get_db_session`，并传递给Agent用于读取/保存历史记录（Checkpointer）。


* **`utils.py` / `tools.py` (工具集)**:
* **扩展**: 你需要在模块下新增一个 `tools.py`（或在`utils.py`中），专门存放自定义工具（Tools），例如`@tool`装饰的函数。
* **SQL场景**: 你的SQL查询工具、数据库Schema获取工具应该放在这里。


* **`config.py`**: 存放 `OPENAI_API_KEY`、`MODEL_NAME`、`VECTOR_DB_URL` 等。

### 2. 推荐的目录结构设计

为了保持模块化，建议在你的模块（例如 `modules/sql_chat/`）内部稍微扩展一下：

```text
app/
├── modules/
│   └── sql_agent/          # 你的特定业务模块
│       ├── __init__.py
│       ├── router.py       # 定义 POST /chat, POST /stream 端点
│       ├── schemas.py      # 定义 ChatInput, AgentState
│       ├── models.py       # SQL ChatHistory 表定义
│       ├── service.py      # 定义 run_agent_logic(query, db)
│       ├── tools.py        # [新增] 定义 search_sql_tool, get_schema_tool
│       ├── prompts.py      # [新增/可选] 存放 System Prompts 模板
│       ├── dependencies.py # 获取 LLM 实例，获取 DB Session
│       ├── config.py       # 模块级配置
│       └── utils.py        # 辅助函数 (如 format_docs, parse_tool_output)
├── core/                   # 全局核心
│   └── database.py         # 全局数据库连接
└── main.py

```

### 3. 集成代码示例

**A. `schemas.py` (定义输入)**

```python
from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str
    content: str

class AgentRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    chat_history: List[ChatMessage] = []

```

**B. `tools.py` (定义工具)**

```python
from langchain.tools import tool
# 如果是 SQL Agent，可以使用 LangChain 内置的 create_sql_agent，
# 但如果是自定义逻辑，在这里定义
@tool
def check_inventory(product_name: str):
    """查询特定产品的库存数量"""
    # 实际业务逻辑
    return "100"

```

**C. `service.py` (构建与执行)**

```python
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from .tools import check_inventory
from .prompts import SYSTEM_PROMPT # 假设你提取了prompt

class AgentService:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4")
        self.tools = [check_inventory]
        # 初始化 Agent (或者 LangGraph)
        self.agent = create_tool_calling_agent(self.llm, self.tools, SYSTEM_PROMPT)
        self.agent_executor = AgentExecutor(agent=self.agent, tools=self.tools)

    async def chat(self, query: str, history: list):
        # 执行 Agent
        result = await self.agent_executor.ainvoke({
            "input": query,
            "chat_history": history
        })
        return result["output"]

```

**D. `router.py` (暴露接口)**

```python
from fastapi import APIRouter, Depends
from .schemas import AgentRequest
from .service import AgentService

router = APIRouter()

# 依赖注入 Service，避免每次请求都重新初始化耗时资源
def get_agent_service():
    return AgentService()

@router.post("/chat")
async def chat_endpoint(
    request: AgentRequest,
    service: AgentService = Depends(get_agent_service)
):
    response = await service.chat(request.query, request.chat_history)
    return {"answer": response}

```

### 4. 关键注意事项

1. **流式传输 (Streaming)**: 如果需要打字机效果，不要在 `service.py` 中直接 `await invoke`，而是返回一个生成器，并在 `router.py` 中使用 `StreamingResponse` 包装 `agent.astream_events()`。
2. **状态管理 (Memory)**: 对于生产环境，不要将记忆存在内存中。利用 `dependencies.py` 获取数据库 Session，并在 `service.py` 中使用 `SQLChatMessageHistory` 或 LangGraph 的 `PostgresCheckpointer` 将状态持久化到你的 `models.py` 定义的表中。
3. **生命周期**: LLM 客户端的初始化（如 `ChatOpenAI`）会有开销。尽量在 `dependencies.py` 中使用 `@lru_cache` 缓存这些对象的创建，或者作为单例模式注入。

... [Integrating LangGraph RAG Agent with FastAPI | Production Setup](https://www.youtube.com/watch?v=t209A887UpY)

这个视频详细演示了如何将LangGraph Agent（支持RAG和记忆）集成到FastAPI中，并讲解了如何处理Session和数据库历史记录，非常符合你目前的架构需求。