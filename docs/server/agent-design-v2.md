好，下面这份就是**给 CODING AGENT 直接喂的 Markdown 指引**。
你可以**原封不动**丢给 Claude Code / Cursor / Copilot / 自建 Coding Agent，它能按步骤照着改。

---

```md
# Router Agent + Multi-SubAgent 改造 · Coding 指引（FastAPI + LangGraph）

## 目标

在不改变现有 FastAPI 接口行为的前提下：

- 保留 `/chat`、`/chat/stream`
- 保留 SSE（`astream_events(version="v2")` + Vercel 协议）
- 将当前 **单一 Agent 图** 改造成：
  
  **Router Agent + 多子 Agent（QA / RAG / SQL）**

- 当前单 Agent 逻辑下沉为 `QAAgent`
- RAG / SQL 先用 stub 跑通路由

---

## 约束（必须遵守）

- ❌ 不要把 HTTP / SSE 逻辑写进 LangGraph 节点
- ❌ 不要在 Router 中注入长期记忆
- ❌ 不要修改 `/chat` 和 `/chat/stream` 的对外行为
- ✅ Router 只做路由
- ✅ 子 Agent 负责最终回答
- ✅ 记忆仍通过 Tool + Store 注入

---

## Step 0：准备

1. 定位当前 Agent 模块目录（包含 `service.py / router.py / tools.py / utils.py / dependencies.py`）。
2. 确认现有 Agent 是通过：
   - `self.app.ainvoke()`
   - `self.app.astream_events(version="v2")`
3. 不删除任何现有代码，先“下沉 + 包装”。

---

## Step 1：新增目录结构

在 Agent 模块目录下新增：

```

subagents/
**init**.py
qa_agent.py
rag_agent.py
sql_agent.py
router_graph.py
state.py   # 可选

````

---

## Step 2：下沉现有 Agent → QAAgent

### 文件：`subagents/qa_agent.py`

**目标**  
把当前 `AgentService.__init__` 中构建的 `StateGraph + ToolNode + edges`  
完整迁移为一个类 `QAAgent`。

### QAAgent 必须包含

- `__init__(self, llm)`
- 原有 tools（至少 `upsert_memory`）
- 原有 `call_model()` 实现（包括）：
  - 长期记忆注入
  - reasoning_content patch
  - usage 记录
- `compile(checkpointer, store)` → 返回 graph app

### 产出标准

```python
qa_app = QAAgent(llm).compile(checkpointer, store)
````

能够 **完全复现当前聊天能力**。

---

## Step 3：新增 RouterGraph（只做路由 + 转发）

### 文件：`router_graph.py`

### RouterState（最小）

```python
{
  messages: add_messages
  route: "qa" | "rag" | "sql"
}
```

### 图结构（固定）

```
START → route → dispatch → END
```

---

### route 节点（第一版：规则）

* 使用字符串规则（不要用 LLM）：

  * 包含：`SQL / 数据库 / 查询 / 统计 / 表 / 字段` → `"sql"`
  * 包含：`文档 / 知识库 / RAG / 检索 / 根据资料` → `"rag"`
  * 否则 → `"qa"`

返回：

```python
{"route": "qa" | "rag" | "sql"}
```

---

### dispatch 节点

* RouterGraph 初始化时接收：

```python
subapps = {
  "qa": qa_app,
  "rag": rag_app,
  "sql": sql_app,
}
```

* dispatch 行为：

  1. 读取 `state["route"]`
  2. 调用对应子 agent：

```python
result = await subapp.ainvoke(
  {"messages": state["messages"]},
  config=config
)
```

3. 原样返回子 agent 的 messages：

```python
return {"messages": result["messages"]}
```

---

## Step 4：新增 RAGAgent / SQLAgent（Stub 版本）

### 文件：`subagents/rag_agent.py`

* Graph：`START → answer → END`
* answer 返回固定文本：

```text
(RAGAgent stub) 后续接向量检索
```

---

### 文件：`subagents/sql_agent.py`

* 同样 stub：

```text
(SQLAgent stub) 后续接 SQL Agent
```

---

## Step 5：改造 `service.py`（核心）

### 原行为

* `self.workflow.compile(checkpointer, store)`

### 新行为

1. 获取依赖：

   * `checkpointer = get_checkpointer()`
   * `store = get_store()`
2. 初始化子 agents：

   * `qa_app`
   * `rag_app`
   * `sql_app`
3. 初始化 RouterGraph：

   * `router_app = RouterGraph(...).compile(checkpointer, store)`
4. 设置：

   * `self._app = router_app`

### 保证

* `chat()` 不改
* `chat_stream()` 不改
* SSE 自动从 RouterGraph 的 `astream_events()` 发出

---

## Step 6：SSE 不动

* 继续使用：

  * `astream_events(version="v2")`
  * `convert_to_vercel_sse(event)`
* RouterGraph + 子 agent 的事件会自动进入 SSE 流

---

## Step 7：记忆策略（严格遵守）

* 长期记忆：

  * 仍使用 `upsert_memory` Tool
  * 仍通过 `InjectedStore + metadata.user_id`
* 记忆注入：

  * **只在最终回答子 agent（QA/RAG/SQL）中**
* RouterGraph：

  * ❌ 不注入记忆
  * ❌ 不拼 system prompt

---

## Step 8：安全修复（必须）

* 删除所有硬编码 API Key
* 从 `settings / config` 读取
* 更新示例配置
* 视情况清理 git 历史

---

## Step 9：验收清单

必须通过以下测试：

1. `/chat` 返回结构不变
2. `/chat/stream` 前端可流式解析
3. 路由测试：

   * “查数据库有多少条记录” → SQLAgent stub
   * “根据文档解释一下…” → RAGAgent stub
   * 普通对话 → QAAgent
4. QAAgent 工具调用仍可触发

---

## Step 10：后续演进（现在不要实现）

* RAGAgent → Agentic RAG
* SQLAgent → LangChain SQL Agent + 校验
* route 节点 → LLM Router Prompt + fallback
* Summary / Memory Agent

---

## 结论

* 这是一次 **“下沉 + 包装”**，不是重写
* Router 是稳定器，不是业务 Agent
* 子 Agent 必须小、专、可替换

**完成以上步骤，即可得到 Router + Multi-Agent 的稳定内核。**

```

---

如果你需要，我可以再给你一份：

- **「给 Cursor / Claude Code 的 TODO checklist 版」**
- 或 **把这份 MD 拆成多个 commit 级任务说明**

你直接说一声就行。
```
