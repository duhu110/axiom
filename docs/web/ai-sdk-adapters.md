# AI SDK Adapters：将 FastAPI/LangGraph Agent 事件流“完美”渲染到 Web

本文面向本仓库的当前架构：**Agent 在 Python(FastAPI + LangGraph/LangChain) 侧执行并流式输出**，Web(Next.js + Vercel AI SDK) 侧负责把“文本流 + 工具调用 + 工具结果 + 自定义事件(如思考/推理)”渲染成可靠、可扩展的 UI。

核心结论：
- 你现在的 `server` 已经在输出 **Vercel AI SDK Data Stream Protocol v1**（`0:`/`2:`/`9:`/`a:` 前缀的数据流），这是前端 `useChat` 最容易消费的协议形态。
- 真正决定“完美渲染”的不是“是否 SSE”，而是：**事件类型是否齐全、ID 是否稳定、工具定义/命名是否一致、以及前端是否以正确的协议模式解析**。
- `@ai-sdk/langchain` 适配器在“Node/Next 侧直接跑 LangChain/LangGraph”时价值最大；对本仓库“Python 侧已按 Vercel 协议输出”的方案，它更多是**设计对标与备用路径**。

---

## 1. 本仓库的现状（Server 输出什么）

### 1.1 流式接口与关键 Header

当前 Agent 流式接口在：
- [router.py](file:///d:/project/FullStack/axiom/server/src/agent/router.py#L28-L48)：`POST /agent/chat/stream`

它返回 `StreamingResponse(..., media_type="text/event-stream")`，并设置：
- `X-Vercel-AI-Data-Stream: v1`

这个 Header 是关键：它告诉 Vercel AI SDK 客户端“这是 Data Stream Protocol v1 数据流”。

### 1.2 事件来源：LangGraph 的 astream_events(v2)

事件由 LangGraph 输出：
- [AgentService.chat_stream](file:///d:/project/FullStack/axiom/server/src/agent/service.py#L128-L147)：`self.app.astream_events(..., version="v2")`

`astream_events(version="v2")` 的优势是：能捕获模型 token 流、工具调用 start/end、以及更多链路事件，适合做“可观测 + 可渲染”的细粒度 UI。

### 1.3 事件转换：LangGraph event → Vercel Data Stream Protocol

转换函数在：
- [convert_to_vercel_sse](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L5-L78)

当前映射关系（已覆盖“完美渲染”的核心三件套）：
- `on_chat_model_stream` → 文本增量 `0:`；以及（DeepSeek）推理内容 `2:`
- `on_tool_start` → 工具调用定义 `9:`
- `on_tool_end` → 工具调用结果 `a:`

---

## 2. Vercel AI SDK 在页面里是怎么渲染的（你需要对齐什么）

在 Vercel AI SDK（本仓库使用 `ai@^6` + `@ai-sdk/react@^3`）里，前端渲染的基本单位不是“字符串”，而是：
- `messages[]`：对话消息数组（user/assistant/tool 等角色）
- `message.parts[]`：消息的“分片”，例如：
  - `text`：逐字输出（打字机效果）
  - `tool-*`：工具输入/输出、执行状态
  - 以及可选的自定义数据分片（用来做思考面板、进度条、引用、检索证据等）

你要达到“完美渲染”，必须保证后端流里：
- 文本 delta 用 `0:` 连续输出
- 工具调用至少要有 `9:`（开始/输入）和 `a:`（结果）且 **toolCallId 一致**
- 自定义过程（如 reasoning/thought/progress）用 **可解析、可归属到消息的 data part** 输出

---

## 3. Data Stream Protocol v1：本项目需要用到的那部分规范

### 3.1 数据行的基本形态

Data Stream Protocol v1 的核心是“前缀 + JSON”：
- `0:<json>`：文本增量（一般是 JSON 字符串）
- `2:<json>`：自定义数据（建议是 JSON 对象，带 `type` 字段）
- `9:<json>`：工具调用定义（tool call）
- `a:<json>`：工具调用结果（tool result）

在你当前实现里，每个 chunk 以 `\n` 结束（见 [utils.py](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L21-L41) / [utils.py](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L43-L76)）。

### 3.2 工具调用（9 / a）的最小正确性条件

要让前端稳定生成 `tool-*` 分片并展示“调用中 → 已完成/失败”的状态，至少要满足：
- `9:` 里包含：
  - `toolCallId`：唯一且稳定（同一次调用的 start/end 必须一致）
  - `toolName`：稳定命名（决定前端分片类型与渲染路径）
  - `args`：JSON 可序列化对象
- `a:` 里包含：
  - `toolCallId`：与 `9:` 完全一致
  - `result`：建议为 JSON 对象；如果是字符串，前端仍可展示，但可视化能力会变弱

当前实现使用 `run_id` 作为 `toolCallId`，并把 tool end 输出强转为字符串（见 [utils.py](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L45-L76)）。这能跑通，但如果你希望前端做更丰富的结构化展示，建议后续把 `result` 保持为对象而不是字符串。

### 3.3 自定义数据（2）的推荐约定（用于“思考/推理/进度”）

你当前把 DeepSeek 的 `reasoning_content` 直接作为 `2:<json-string>` 输出（见 [utils.py](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L27-L35)）。这能让前端“拿到一段数据”，但要做到可扩展、可复用的渲染，建议把 `2:` 的 payload 统一成对象：
- 必带：`type`（用于前端路由/渲染）
- 建议：`id`（让数据能持久归属到当前 assistant message.parts，而不是只在回调里一闪而过）
- 其他字段：`data`/`delta`/`meta` 视需求设计

示例（仅表达协议形态）：
- `2:{"type":"reasoning_delta","delta":"...","id":"reasoning-<messageId>"}`
- `2:{"type":"progress","data":{"stage":"retrieval","percent":30}}`

---

## 4. LangGraph 事件 → 前端渲染：建议的映射表

本仓库当前只映射了三类事件（文本、工具 start/end），对“完美渲染”来说已经是 80 分。但如果你要做“更像 ChatGPT 的 Agent UI”，建议把更多事件归一到 `2:` 自定义数据：

| LangGraph/LangChain 事件 | 目标 UI 体验 | 推荐输出 |
|---|---|---|
| `on_chat_model_stream` | 打字机文本 | `0:`（text delta） |
| `on_chat_model_stream` 的 reasoning 字段 | 思考面板（可折叠） | `2:`（reasoning delta/segment） |
| `on_tool_start` | “正在调用工具” + 参数展示 | `9:`（toolCallDef） |
| `on_tool_end` | 工具输出展示 | `a:`（toolResult） |
| `on_chain_start/end`、`on_retriever_start/end` 等 | 进度条/步骤树/调试视图 | `2:`（progress/trace） |

注意：把“链路调试信息”都放进 `2:` 很方便，但也最容易泄露敏感信息（见第 8 节）。

---

## 5. Web 侧如何“正确消费”这条流（关键在协议模式与 API 形态）

### 5.1 两种集成模式

**模式 A（推荐）：Next.js 作为网关，前端只打同源 `/api/chat`**
- Web 页面的 `useChat()` 默认请求同源 `web/app/api/chat/route.ts`（见 [route.ts](file:///d:/project/FullStack/axiom/web/app/api/chat/route.ts#L13-L54) 与 [page.tsx](file:///d:/project/FullStack/axiom/web/app/chat/page.tsx#L6-L45)）。
- 但你当前的 Python 接口 `POST /agent/chat/stream` 入参是 `{query, session_id, chat_history}`（见 [schemas.py](file:///d:/project/FullStack/axiom/server/src/agent/schemas.py#L4-L11)），与 AI SDK 默认的 `{messages: UIMessage[]}` **不一致**。
- 因此，若想“无痛使用 AI SDK 的 hooks + UI 组件”，最佳实践是让 Next API 作为适配层：
  - 入参保持 AI SDK 约定（`messages[]`）
  - 服务端提取最后一条 user 消息作为 `query`
  - 服务端管理 `session_id`（通常用 userId 或 threadId）
  - 服务端把 Python 流“透传”给浏览器（保持 `X-Vercel-AI-Data-Stream: v1`）

收益：
- 不需要浏览器处理跨域与鉴权细节
- 允许在 Next 侧统一做“用户身份 → session/thread_id → 后端 metadata”映射
- 允许灰度：同一个前端 UI 可以切换“Next 本地模型流”（UIMessageStream）与“Python Agent 流”（Data Stream）

**模式 B：浏览器直接请求 FastAPI 的 `/agent/chat/stream`**
- 必须解决：
  - CORS（包括 preflight、credentials、allowed headers）
  - 鉴权（`/agent/chat/stream` 依赖登录态，见 [router.py](file:///d:/project/FullStack/axiom/server/src/agent/router.py#L29-L33)）
  - 入参形态不匹配（AI SDK hooks 默认发 `{messages}`）
- 若仍选择此模式，通常意味着你不会直接用默认 `useChat()` 的请求约定，而会做额外的 transport/适配。

结论：要“完美利用 Vercel AI SDK”，优先选模式 A。

### 5.2 “为什么我有流但页面不渲染”的排查清单

多数渲染失败来自这几类错位：
- **请求体不匹配**：后端期待 `{query}`，前端发 `{messages}`，导致后端直接报 422/400，前端表现为“没流”。
- **协议模式不匹配**：后端发 Data Stream Protocol，但前端按 UIMessageStream 解析（或反过来）。
- **Header 缺失**：漏了 `X-Vercel-AI-Data-Stream: v1`，AI SDK 不会按 data-stream 解析。
- **工具 ID 不一致**：`9:` 和 `a:` 的 `toolCallId` 对不上，工具分片无法闭合。
- **工具名漂移**：toolName 改了但前端还在按旧的 `tool-*` type 渲染。

---

## 6. 工具渲染“完美”的工程化规范（强烈建议固化）

### 6.1 工具命名规范

后端输出的 `toolName` 会直接影响前端 `message.parts` 里工具分片的类型与渲染路径。

本仓库 Python 侧工具为：
- `get_current_weather`
- `upsert_memory`
见 [tools.py](file:///d:/project/FullStack/axiom/server/src/agent/tools.py#L12-L83)

而 Web 侧示例页面目前只显式处理：
- `tool-weather`
- `tool-convertFahrenheitToCelsius`
见 [page.tsx](file:///d:/project/FullStack/axiom/web/app/chat/page.tsx#L14-L25)

这意味着：即使后端工具事件正确输出，前端也可能“不展示/只展示默认 JSON”，因为渲染分支没有覆盖新的 `tool-*` 类型。

建议：
- 工具名一旦对外公布就视为 API，避免频繁改名
- 在 Web 侧用“通用工具卡片组件”（而不是 switch 写死少量工具名）来渲染 `ToolUIPart/DynamicToolUIPart`

### 6.2 工具结果的结构化约定

为了让前端更容易做 UI（表格、卡片、链接、图片、文件、引用等），建议 `a:` 的 `result` 遵循：
- 优先 JSON 对象
- 包含稳定字段，例如：`ok`、`data`、`error`、`meta`

当前实现把 `output` 强转为字符串（见 [utils.py](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L68-L76)），会让前端丢失结构化信息；如果你希望“完美渲染”，这是后续最值得改进的一点。

---

## 7. @ai-sdk/langchain 适配器：什么时候用、怎么和本项目对上

来源要点（对齐到你的目标）：
- `toBaseMessages`：把 AI SDK 的 `UIMessage[]` 转成 LangChain 的 `BaseMessage[]`
- `toUIMessageStream`：把 LangChain/LangGraph 的流转成 AI SDK 可渲染的 UI 消息流（支持文本、工具、多模态、以及 `streamEvents()` 的细粒度事件）

这些能力在以下场景最有价值：
- 你把 Agent 逻辑搬到 Next.js（Node runtime）里跑 LangChain/LangGraph
- 或者你需要把 LangGraph “事件流”直接接到 AI SDK UI（不想手写 `0/9/a/2` 的映射）

对本仓库当前“Python 侧已经输出 Data Stream Protocol”的路径：
- 前端并不必须使用 `@ai-sdk/langchain`
- 但适配器的设计思想可以用来审视你的 Python 映射是否“齐全、结构化、可观测”

---

## 8. 安全与合规：想要“完美”，先定义“哪些事件允许渲染”

做 Agent UI 时最容易踩的坑：为了“过程可见”，把不该暴露的信息也推到了浏览器。

建议把事件分成三档并写入规范：
- **必须输出**：`0:`（最终回答文本 delta）、`9/a:`（工具调用与结果，但需要脱敏）
- **可选输出**：`2:`（推理/思考/检索过程），默认关闭或仅对管理员/调试环境开启
- **禁止输出**：包含密钥、内部 prompt、数据库连接串、用户隐私原文、以及任何“系统策略/安全规则”细节

特别提示：你当前把 DeepSeek 的 `reasoning_content` 直接输出（见 [utils.py](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L27-L35)）。如果你计划面向真实用户开放“思考面板”，务必先做策略：哪些 reasoning 可见、如何脱敏、是否需要开关与审计。

---

## 9. 可靠性须知（生产环境常见问题）

- **反向代理缓冲**：Nginx/网关/CDN 可能会缓冲流，导致前端“很久才一下子吐完”。通常需要关闭 buffering，并确保 chunk 能及时 flush。
- **连接保活**：长工具调用可能导致连接空闲；建议周期性输出 `2:` 的 progress/heartbeat（或确保网关不超时）。
- **取消/中断**：前端用户停止生成时，理想行为是后端也能取消 LangGraph run，避免资源浪费（需要链路支持 abort）。
- **错误表达**：仅靠断开连接很难让 UI 呈现友好的错误状态；建议定义错误数据分片（同样可用 `2:` 自定义 error 事件）并在前端统一展示。

---

## 10. 与本仓库代码的对应关系（便于你快速定位）

- Server 流式入口：[router.py](file:///d:/project/FullStack/axiom/server/src/agent/router.py#L28-L48)
- Server 事件源与流式循环：[service.py](file:///d:/project/FullStack/axiom/server/src/agent/service.py#L128-L147)
- Server 协议转换（0/2/9/a）：[utils.py](file:///d:/project/FullStack/axiom/server/src/agent/utils.py#L5-L78)
- Server 工具命名（影响 toolName/type）：[tools.py](file:///d:/project/FullStack/axiom/server/src/agent/tools.py#L12-L83)
- Web 当前默认聊天 API（UIMessageStream）：[route.ts](file:///d:/project/FullStack/axiom/web/app/api/chat/route.ts#L13-L54)
- Web 当前聊天页面渲染逻辑：[page.tsx](file:///d:/project/FullStack/axiom/web/app/chat/page.tsx#L6-L45)
