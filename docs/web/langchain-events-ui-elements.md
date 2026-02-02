# LangChain/LangGraph Events ↔ AI SDK UI Elements：实现 ChainOfThought 效果的映射规范

本文目标：把 LangChain/LangGraph（尤其是 LangGraph `astream_events(version="v2")`）产生的事件流，转换成前端可稳定消费的结构化数据，从而在 UI 上实现类似 [ChainOfThought](https://ai-sdk.dev/elements/components/chain-of-thought) 的“可折叠步骤面板、进度状态、搜索结果徽章、图片展示”等效果。

本文不要求你把“原始推理全文”暴露给用户；相反，更推荐输出“可解释但可控”的步骤摘要与结构化证据。

---

## 1. 你已经具备的基础

### 1.1 现有事件源与流式协议

当前 `server` 侧已经在做：
- LangGraph 事件源：`app.astream_events(..., version="v2")`
- 对外数据流：Vercel AI SDK Data Stream Protocol v1（通过 `0:`/`2:`/`9:`/`a:`）

对应实现参考：
- [AgentService.chat_stream](file:///d:/project/FullStack/axiom/server/src/agent/service.py#L128-L147)
- [convert_to_vercel_sse](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L5-L78)

### 1.2 已引入的 ChainOfThought UI 组件

Web 侧已存在 ChainOfThought 组件实现（与官方示例同构），包括：
- `ChainOfThought` / `ChainOfThoughtHeader` / `ChainOfThoughtContent`
- `ChainOfThoughtStep`：支持 `complete | active | pending`
- `ChainOfThoughtSearchResults` / `ChainOfThoughtSearchResult`
- `ChainOfThoughtImage`

对应代码：
- [chain-of-thought.tsx](file:///d:/project/FullStack/axiom/web/components/ai-elements/chain-of-thought.tsx)

这意味着：你缺的不是 UI 组件，而是“事件 → 步骤数据模型 → 渲染”的中间层契约。

---

## 2. LangChain/LangGraph 的事件模型：你需要关心哪些

在 LangChain Runnable / LangGraph 体系里，事件通常以 `event` 字段区分，常见类别包括：

- 模型生命周期
  - `on_chat_model_start`：开始调用模型
  - `on_chat_model_stream`：token/分片流式输出（最重要）
  - `on_chat_model_end`：一次模型调用结束
- 工具生命周期
  - `on_tool_start`：工具调用开始（工具名 + 输入参数）
  - `on_tool_end`：工具调用结束（输出/异常）
- 链/节点生命周期（用于步骤化 UI）
  - `on_chain_start` / `on_chain_end`
- 检索生命周期（如果你将来接入 Retriever/RAG）
  - `on_retriever_start` / `on_retriever_end`

你不需要把所有事件都映射给 UI。要做 ChainOfThought，核心是把事件分层为“可读步骤”，并维护步骤状态机。

---

## 3. ChainOfThought 在 UI 上“需要什么数据”

### 3.1 最小步骤模型（Step）

`ChainOfThoughtStep` 的最小输入可以抽象为：
- `id`：步骤唯一标识（同一轮回答内唯一即可）
- `label`：步骤标题（面向用户）
- `description`：步骤说明（面向用户，可选）
- `status`：`pending | active | complete`

建议额外引入（可选但强烈推荐）：
- `order`：排序（避免并发事件导致顺序抖动）
- `kind`：步骤类型（如 `model | tool | retrieval | system`）
- `meta`：调试字段（仅开发环境可见）

### 3.2 搜索结果模型（SearchResult）

`ChainOfThoughtSearchResult` 适合展示“短 badge”，因此建议每个结果项只放“可短显示”的信息：
- `label`：例如文档标题、站点名、kb 条目名
- `href`：可选，点击跳转
- `source`：可选，区分 `web | kb | file`

### 3.3 图片模型（Image）

`ChainOfThoughtImage` 支持：
- 图片内容（可为 URL、Base64、或由前端组件渲染）
- `caption`：图片说明

重要：图片通常与某个步骤绑定（例如“生成图像”“OCR 结果”“图表”）。

---

## 4. “事件 → 步骤”映射：推荐做法（可复用且可控）

### 4.1 不直接暴露原始推理，而是输出“步骤摘要”

为了实现类似 ChainOfThought 的效果，不需要把模型的隐式推理全文输出。更安全且更稳定的方案是：
- 后端把 LangGraph 事件归一为有限的步骤集合
- 每个步骤只输出“发生了什么”和“进度状态”，而不是模型内部推理细节

### 4.2 统一用 Data Part（2）承载 ChainOfThought 数据

你现在已经在输出 `2:`（自定义数据）。建议把 ChainOfThought 相关的所有 UI 数据都走 `2:`，并统一使用 `type` 路由：

- `cot_step_upsert`：新增/更新步骤（包含 `id`/`label`/`description`/`status`）
- `cot_step_append`：为某步骤追加内容（例如更长的“过程描述”，按 delta 追加）
- `cot_search_results`：给某步骤写入搜索结果列表
- `cot_image`：给某步骤附加一张图片
- `cot_reset`：可选，用于明确开始新一轮（或清理前一轮残留）

建议每个事件都带上：
- `turnId`：本次回答的唯一 ID（同一轮输出一致）
- `stepId`：绑定到具体步骤（无步骤时可省略）

### 4.3 映射表（从 LangGraph 事件到 ChainOfThought）

以下是一张“默认够用”的映射表（你可以按产品需求精简）：

| LangGraph/LangChain 事件 | UI 步骤建议 | Step status | 典型可展示内容 |
|---|---|---|---|
| `on_chain_start`（agent 节点） | “分析任务” | active | 任务类型、目标、约束（可选） |
| `on_chat_model_stream`（reasoning 可用时） | “思考中” | active | 简短摘要或“正在推理…”占位 |
| `on_tool_start` | “调用工具：{toolName}” | active | 参数摘要（脱敏） |
| `on_tool_end` | “调用工具：{toolName}” | complete | 结果摘要（结构化） |
| `on_retriever_start` | “检索资料” | active | 检索 query（脱敏） |
| `on_retriever_end` | “检索资料” | complete | 结果条目 badge 列表 |
| `on_chat_model_end`（最终回答阶段） | “生成答案” | complete | 可不显示或快速完成 |

关键点：
- “步骤”是产品语义，不必与 LangGraph 节点一一对应。
- 工具调用一定要围绕 `toolCallId`（或 run_id）保持一致性，才能在 UI 上正确闭合状态。

---

## 5. 与 AI SDK UI 的对接方式：把 COT 作为“伴随数据流”

### 5.1 两条并行的渲染通道

为了让用户既看到最终回答的打字机效果，也看到步骤面板：
- **文本回答**：继续走 `0:`（AI SDK 默认文本分片）
- **步骤面板**：走 `2:`（自定义 data parts），前端把它们聚合成“步骤状态树”

这样做的好处：
- 不影响现有消息渲染
- COT 可以按权限/开关控制（比如默认折叠、只在调试时打开）

### 5.2 前端聚合策略（无代码表述版）

前端要做的事情可以概括为：
- 为每次 assistant 回复维护一个 `turnId`（来自后端 data part）
- 收到 `cot_*` data part 时，根据 `turnId` 找到对应的“当前回复上下文”
- 按 `stepId` upsert 步骤，并根据 status 更新 UI
- 将搜索结果与图片挂载到对应 step 下
- 最终把聚合后的 steps 渲染进 `ChainOfThought` 组件

建议的 UI 结构：
- Assistant message 内部包含：
  - `ChainOfThought`（可折叠）
  - 正常文本回答（打字机）
  - 工具卡片（如果你也在渲染 tool parts）

---

## 6. “像官网那样”的体验：需要补齐哪些能力

ChainOfThought 官方组件的体验点包括：
- 可折叠（Header/Content）
- Step-by-step 状态（complete/active/pending）
- Search results 徽章
- 图片 + caption
- 可组合扩展（你可以在 Step children 里放更多内容）

要达到同等体验，你需要补齐三件事：

### 6.1 步骤状态机（最重要）

没有状态机就只有“日志列表”，不会像“进度面板”。

建议规则：
- 同一时刻最多 1 个 `active` 的高层步骤（例如“检索资料”“调用工具”）
- 未发生的步骤保持 `pending`
- 已完成步骤置为 `complete`

### 6.2 结构化搜索结果

当你未来引入 KB/RAG：
- `on_retriever_end` 里一般能拿到文档对象列表
- 后端将其压缩为 badge 可展示的 `label/href/source` 列表，通过 `cot_search_results` 输出

### 6.3 图片输出（可选）

图片通常来自：
- 工具产出（例如生成图、OCR 截图、图表）
- 或模型多模态输出

建议把图片作为“步骤附件”，不要混在文本流里。

---

## 7. 与 @ai-sdk/langchain 的关系：你什么时候需要它

如果你的 Agent 运行在 Node/Next 环境里（LangChain/LangGraph JS 版本），`@ai-sdk/langchain` 能直接把：
- AI SDK `UIMessage[]` → LangChain `BaseMessage[]`（`toBaseMessages`）
- LangChain/LangGraph 的 stream → AI SDK 的 UI stream（`toUIMessageStream`）

并且支持 `streamEvents()` 产生的细粒度事件流与 typed data events（`data-{type}`）。

但在你当前“Python 侧已经输出 Data Stream Protocol”架构下：
- 你不必依赖 `@ai-sdk/langchain`
- 你需要的是：定义好 `cot_*` 的 data part 规范，并在 Python 映射层稳定输出

---

## 8. 安全与产品原则（非常重要）

为了避免“把模型隐式推理/系统 prompt/敏感数据暴露给最终用户”，建议明确：
- 默认只输出步骤标题与状态，不输出推理全文
- 检索 query、工具参数、工具输出都要脱敏或摘要化
- COT 面板可设置为“仅管理员/调试环境可见”，或默认折叠

ChainOfThought 的价值是“解释过程”，不是“泄露内部思维链”。

---

## 9. 落地清单（按优先级）

- 第一步：定义 `cot_*` data parts 的字段与版本（至少包含 `turnId/stepId/type/status`）
- 第二步：后端把 `on_tool_start/on_tool_end` 映射为工具步骤（立刻能看到 active/complete）
- 第三步：引入“检索步骤”（未来接 RAG 时完善 search results badges）
- 第四步：把 reasoning 从“原文输出”改成“步骤摘要输出”（更安全、更可控）

