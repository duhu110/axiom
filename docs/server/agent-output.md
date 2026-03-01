# Agent 输出事件文档

本文档详细描述 AXIOM Agent 系统中通过 SSE (Server-Sent Events) 输出的所有事件类型、格式、判断值和示例。

**文档版本**: v1.0
**最后更新**: 2026-02-19
**测试状态**: 已验证

## 概述

Agent 系统使用 LangGraph 的 `astream_events` API 生成事件流，并通过 `convert_to_vercel_sse` 函数转换为符合 [Vercel AI SDK Data Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/data-stream-protocol) 的 SSE 格式。

### SSE 事件格式基础

所有 SSE 事件遵循以下格式：

```
<event_type>:<json_payload>\n
e:<debug_event_json>\n
```

其中：
- `event_type` - 单字符事件类型标识
- `json_payload` - JSON 序列化的数据
- `e:` - 调试事件（始终包含原始事件详情）

### 事件类型映射表

| LangGraph 事件 | SSE 类型 | 说明 |
|---------------|---------|------|
| `on_chat_model_stream` | `0:`, `2:` | 模型生成的文本流 |
| `on_tool_start` | `9:` | 工具调用开始 |
| `on_tool_end` | `a:` | 工具执行结果 |
| `on_chain_end` (search节点) | `r:` | RAG 检索结果 |
| 其他所有事件 | `e:` | 调试透传事件 |

---

## 1. 路由事件 (Router Events)

### 1.1 路由决策事件

路由层使用 LLM 结合用户记忆和对话上下文决定路由目标。

**事件名称**: `on_chain_start`, `on_chain_end`

**路由目标**: `qa`, `rag`, `sql`

**判断逻辑**:

```python
# 1. LLM 路由（优先）
system_prompt = "Select exactly ONE target agent from [qa, rag, sql]."
- sql: database/schema/query/aggregation/count/reporting requests
- rag: asks based on documents/knowledge base/files/retrieval
- qa: everything else

# 2. 关键词 Fallback
SQL_KEYWORDS = ["sql", "数据库", "查询", "统计", "表", "字段", ...]
RAG_KEYWORDS = ["文档", "知识库", "rag", "检索", "根据资料", ...]
```

**事件示例**:

```json
// 路由开始 (e: 事件)
{
  "captured_at": "2026-02-19T12:00:00.000Z",
  "event": "on_chain_start",
  "name": "route_node",
  "run_id": "uuid-xxxx",
  "metadata": {
    "user_id": "user-uuid",
    "kb_id": null
  },
  "data": {
    "input": {
      "messages": [{"type": "human", "content": "你好"}]
    }
  }
}

// 路由结束 (e: 事件)
{
  "event": "on_chain_end",
  "name": "route_node",
  "data": {
    "output": {"route": "qa"}
  }
}
```

---

## 2. QA Agent 事件

### 2.1 模型流事件 (on_chat_model_stream)

QA Agent 处理通用对话，可调用工具（天气查询、记忆存储）。

**SSE 格式**:

```
0:"文本内容"\n
e:{调试事件}\n
```

**判断特征**:
- `event === "on_chat_model_stream"`
- `name === "agent"` 或 `name === "QAAgent"`
- `chunk.content` 存在

**带 Reasoning 的流事件** (DeepSeek-Reasoner):

```
2:"推理思考内容"\n
0:"正常回复内容"\n
e:{调试事件}\n
```

**判断推理内容**:
```javascript
if (chunk.additional_kwargs?.reasoning_content) {
  // 输出 2: 事件
}
```

**事件示例**:

```json
// 标准文本流
{
  "captured_at": "2026-02-19T12:00:01.000Z",
  "event": "on_chat_model_stream",
  "name": "agent",
  "chunk_snapshot": {
    "type": "ChatMessageChunk",
    "content": "你好！我是",
    "additional_kwargs": {},
    "response_metadata": {}
  }
}

// 带推理的流 (DeepSeek-Reasoner)
{
  "event": "on_chat_model_stream",
  "chunk_snapshot": {
    "content": "根据我的分析",
    "additional_kwargs": {
      "reasoning_content": "用户在问候，需要友好回应..."
    }
  }
}
```

### 2.2 工具调用事件 (on_tool_start)

QA Agent 可调用以下工具：
- `get_current_weather` - 天气查询
- `upsert_memory` - 存储用户记忆

**SSE 格式**:

```
9:{"toolCallId":"run-id","toolName":"get_current_weather","args":{"city":"北京"}}\n
e:{调试事件}\n
```

**判断特征**:
- `event === "on_tool_start"`
- `name` 为工具名称
- `data.input` 包含工具参数

**工具调用示例**:

```json
// 天气查询
{
  "captured_at": "2026-02-19T12:00:02.000Z",
  "event": "on_tool_start",
  "name": "get_current_weather",
  "run_id": "uuid-tool-call",
  "data": {
    "input": {
      "city": "北京"
    }
  }
}

// 记忆存储
{
  "event": "on_tool_start",
  "name": "upsert_memory",
  "data": {
    "input": {
      "content": "用户喜欢编程",
      "user_id": "user-uuid"
    }
  }
}
```

### 2.3 工具结果事件 (on_tool_end)

**SSE 格式**:

```
a:{"toolCallId":"run-id","result":"返回结果字符串"}\n
e:{调试事件}\n
```

**示例**:

```json
// 天气查询结果
{
  "captured_at": "2026-02-19T12:00:03.000Z",
  "event": "on_tool_end",
  "name": "get_current_weather",
  "run_id": "uuid-tool-call",
  "data": {
    "output": "北京今天晴天，气温 15-25°C"
  }
}
```

---

## 3. RAG Agent 事件

### 3.1 RAG 流程节点

RAG Agent 采用 Agentic RAG 流程：
1. `rewrite` - 问题改写
2. `search` - 知识库检索
3. `answer` - 生成回答

### 3.2 问题改写事件

**事件名称**: `on_chain_start` / `on_chain_end` with `name === "rewrite"`

**判断特征**:
- `event === "on_chain_start"` 且 `name === "rewrite"`
- 属于 RAG Agent 的第一个节点

**事件示例**:

```json
{
  "captured_at": "2026-02-19T12:01:00.000Z",
  "event": "on_chain_start",
  "name": "rewrite",
  "run_id": "uuid-rewrite",
  "data": {
    "input": {
      "messages": [{"type": "human", "content": "怎么使用文档搜索功能？"}],
      "query": "怎么使用文档搜索功能？"
    }
  }
}
```

### 3.3 检索事件

**事件名称**: `on_chain_start` / `on_chain_end` with `name === "search"`

**判断特征**:
- `event === "on_chain_start"` 且 `name === "search"`
- `data.input.rewritten_query` 包含改写后的查询

**事件示例**:

```json
// 检索开始
{
  "captured_at": "2026-02-19T12:01:01.000Z",
  "event": "on_chain_start",
  "name": "search",
  "data": {
    "input": {
      "query": "怎么使用文档搜索功能？",
      "rewritten_query": "文档搜索功能 使用方法 教程"
    }
  }
}

// 检索结束
{
  "event": "on_chain_end",
  "name": "search",
  "data": {
    "output": {
      "documents": [
        {
          "page_content": "文档搜索功能使用指南...",
          "metadata": {"kb_id": "xxx", "doc_id": "yyy", "score": 0.85}
        }
      ]
    }
  }
}
```

### 3.4 RAG 回答生成事件

**事件名称**: `on_chat_model_stream` with `name === "answer"`

**判断特征**:
- `event === "on_chat_model_stream"`
- `name === "answer"`
- 响应基于检索到的文档

**SSE 输出**: 与 QA Agent 相同的 `0:` 文本流

### 3.5 无检索结果事件

当知识库检索无结果时：

**响应内容**: "未检索到相关知识库内容，请尝试换个问法。"

**判断**:
- `event === "on_chain_end"`
- `name === "answer"`
- `data.output.messages[0].content` 包含"未检索到"

### 3.6 检索结果事件 (r:)

RAG Agent 的文档检索完成后，会输出专门的检索结果事件。

**SSE 格式**:

```
r:{"documents": [{"content": "...", "metadata": {...}}, ...]}\n
e:{调试事件}\n
```

**判断特征**:
- 事件以 `r:` 开头
- 只在 RAG Agent 的 `search` 节点完成时触发

**检索结果数据结构**:

```json
{
  "documents": [
    {
      "content": "文档内容片段（最多500字符）",
      "metadata": {
        "source": "pdf",
        "page": 2,
        "kb_id": "uuid",
        "doc_id": "uuid",
        "title": "文档标题"
      }
    }
  ]
}
```

**事件示例** (实际输出):

```
r:{"documents": [
  {"content": "3. 技术方案\n一个基于FastAPI...", "metadata": {"source": "pdf", "page": 2, "title": "开发进度"}},
  {"content": "- **任务队列**: Celery...", "metadata": {"source": "pdf", "page": 3}}
]}
```

**前端处理示例**:

```javascript
function parseSSELine(line) {
  const prefix = line.split(':')[0];

  if (prefix === 'r') {
    const data = JSON.parse(line.substring(2));
    handleRetrievalResult(data);
  }
}

function handleRetrievalResult(data) {
  const docs = data.documents || [];
  console.log(`检索到 ${docs.length} 个文档`);

  // 显示检索来源
  docs.forEach((doc, idx) => {
    console.log(`来源 ${idx + 1}:`);
    console.log(`  内容: ${doc.content.substring(0, 100)}...`);
    console.log(`  文件: ${doc.metadata.source || 'N/A'}`);
    if (doc.metadata.page) {
      console.log(`  页码: ${doc.metadata.page}`);
    }
  });
}
```

---

## 4. SQL Agent 事件

### 4.1 Stub 响应事件

当前 SQL Agent 为 Stub 实现，返回固定提示。

**事件名称**: `on_chain_start` / `on_chain_end` with `name === "answer"`

**判断特征**:
- 路由到 `sql` Agent
- `name === "SQLAgent"` 或 `name === "answer"`

**事件示例**:

```json
{
  "captured_at": "2026-02-19T12:02:00.000Z",
  "event": "on_chain_start",
  "name": "answer",
  "data": {
    "input": {
      "messages": [{"type": "human", "content": "查询用户表有多少条记录"}]
    }
  }
}

// Stub 响应
{
  "event": "on_chain_end",
  "name": "answer",
  "data": {
    "output": {
      "messages": [{
        "type": "ai",
        "content": "(SQLAgent stub) 后续接 SQL Agent。当前 SQL 查询功能尚未实现，请稍后重试。"
      }]
    }
  }
}
```

---

## 5. 模型结束事件 (on_chat_model_end)

### 5.1 Usage 记录事件

**事件名称**: `on_chat_model_end`

**用途**: 记录 LLM 使用量（tokens）

**判断特征**:
- `event === "on_chat_model_end"`
- `data.output.response_metadata.usage` 存在

**Usage 数据结构**:

```json
{
  "prompt_tokens": 150,
  "completion_tokens": 50,
  "total_tokens": 200
}
```

**事件示例**:

```json
{
  "captured_at": "2026-02-19T12:00:05.000Z",
  "event": "on_chat_model_end",
  "name": "agent",
  "data": {
    "output": {
      "content": "完整的回复内容",
      "response_metadata": {
        "token_usage": {
          "prompt_tokens": 150,
          "completion_tokens": 50,
          "total_tokens": 200
        },
        "model": "deepseek-chat",
        "finish_reason": "stop"
      }
    }
  }
}
```

---

## 6. 事件判断参考

### 6.1 JavaScript 前端判断示例

```javascript
// 解析 SSE 行
function parseSSELine(line) {
  if (!line || !line.includes(':')) return null;

  const [type, data] = line.split(':', 2);
  const prefix = type.trim();

  switch (prefix) {
    case '0': // 文本流
      return { type: 'text', content: JSON.parse(data) };
    case '2': // 推理内容
      return { type: 'reasoning', content: JSON.parse(data) };
    case '9': // 工具调用
      return { type: 'tool_call', ...JSON.parse(data) };
    case 'a': // 工具结果
      return { type: 'tool_result', ...JSON.parse(data) };
    case 'r': // RAG 检索结果
      return { type: 'retrieval', ...JSON.parse(data) };
    case 'e': // 调试事件
      const debugEvent = JSON.parse(data);
      return {
        type: 'debug',
        eventType: debugEvent.event,
        name: debugEvent.name,
        raw: debugEvent
      };
    default:
      return { type: 'unknown', prefix, data };
  }
}

// 判断事件类型
function getEventType(debugEvent) {
  const { event, name } = debugEvent;

  // 路由事件
  if (name === 'route_node') return 'router';

  // RAG 事件
  if (name === 'rewrite') return 'rag_rewrite';
  if (name === 'search') return 'rag_search';

  // 工具事件
  if (event === 'on_tool_start') return 'tool_start';
  if (event === 'on_tool_end') return 'tool_end';

  // 模型事件
  if (event === 'on_chat_model_stream') return 'model_stream';
  if (event === 'on_chat_model_end') return 'model_end';

  return 'other';
}
```

### 6.2 Python 后端判断参考

```python
# utils.py 中的判断逻辑
def convert_to_vercel_sse(event: dict) -> str:
    kind = event.get("event")

    # 1. 模型流事件
    if kind == "on_chat_model_stream":
        chunk = event.get("data", {}).get("chunk")
        if chunk:
            # 检查推理内容
            if hasattr(chunk, "additional_kwargs"):
                reasoning = chunk.additional_kwargs.get("reasoning_content")
                if reasoning:
                    yield f'2:{json.dumps(reasoning)}\n'

            # 标准内容
            if hasattr(chunk, "content") and chunk.content:
                yield f'0:{json.dumps(chunk.content)}\n'

    # 2. 工具调用事件
    elif kind == "on_tool_start":
        tool_name = event.get("name")
        tool_input = event.get("data", {}).get("input")
        run_id = event.get("run_id")
        yield f'9:{json.dumps({"toolCallId": run_id, "toolName": tool_name, "args": tool_input})}\n'

    # 3. 工具结果事件
    elif kind == "on_tool_end":
        output = event.get("data", {}).get("output")
        run_id = event.get("run_id")
        yield f'a:{json.dumps({"toolCallId": run_id, "result": str(output)})}\n'

    # 4. 其他事件透传
    yield f'e:{json.dumps(event)}\n'
```

---

## 7. 完整事件流示例

### 7.1 QA Agent 完整对话流程

```
// 用户: "北京今天天气怎么样？"

e:{"event":"on_chain_start","name":"route_node",...}     // 路由开始
e:{"event":"on_chain_end","name":"route_node","data":{"output":{"route":"qa"}},...}  // 路由到 QA
e:{"event":"on_chain_start","name":"agent",...}         // QA Agent 开始
e:{"event":"on_chat_model_start","name":"agent",...}    // 模型调用开始
0:"让我"                                                   // 文本流
0:"查询一下"                                               // 文本流
e:{"event":"on_chat_model_stream","name":"agent",...}    // 流事件详情
e:{"event":"on_chat_model_end","name":"agent",...}       // 模型调用结束
9:{"toolCallId":"xxx","toolName":"get_current_weather","args":{"city":"北京"}}  // 工具调用
e:{"event":"on_tool_start","name":"get_current_weather",...}
a:{"toolCallId":"xxx","result":"北京今天晴天，15-25°C"}  // 工具结果
e:{"event":"on_tool_end","name":"get_current_weather",...}
e:{"event":"on_chat_model_start","name":"agent",...}    // 再次模型调用
0:"北京今天"                                                // 回复流
0:"晴天，"                                                 //
0:"气温"                                                   //
0:"15-25°C。"                                              //
e:{"event":"on_chat_model_end",...}                       // 结束
e:{"event":"on_chain_end","name":"agent",...}            // QA Agent 结束
```

### 7.2 RAG Agent 完整流程

```
// 用户: "文档搜索功能怎么用？"

e:{"event":"on_chain_start","name":"route_node",...}     // 路由开始
e:{"event":"on_chain_end","name":"route_node","data":{"output":{"route":"rag"}},...}  // 路由到 RAG
e:{"event":"on_chain_start","name":"rewrite",...}        // 问题改写开始
e:{"event":"on_chat_model_end","name":"rewrite",...}     // 改写完成
e:{"event":"on_chain_end","name":"rewrite","data":{"output":{"rewritten_query":"文档搜索 使用教程"}},...}
e:{"event":"on_chain_start","name":"search",...}         // 检索开始
e:{"event":"on_chain_end","name":"search","data":{"output":{"documents":[...]}},...}  // 检索完成
e:{"event":"on_chain_start","name":"answer",...}         // 生成回答开始
0:"根据文档，"                                              // 回复流
0:"文档搜索功能的使用方法如下："                              //
e:{"event":"on_chat_model_end","name":"answer",...}      // 生成完成
e:{"event":"on_chain_end","name":"answer",...}           // RAG 结束
```

### 7.3 DeepSeek-Reasoner 推理流程

```
// 用户: "解释一下量子纠缠"

e:{"event":"on_chat_model_stream",...}
2:"首先，我需要理解量子纠缠的基本概念。"                      // 推理内容
2:"量子纠缠是量子力学中的一个现象，"                          //
2:"两个粒子即使相隔很远也能相互影响。"                        //
0:"量子纠缠是量子力学中"                                     // 正式回复开始
0:"一个非常有趣的现象。"                                     //
2:"我应该用更通俗的语言解释。"                               // 继续推理
0:"简单来说，"                                              //
0:"当两个粒子发生纠缠后，"                                   //
0:"它们之间就建立了一种特殊的联系。"                           //
```

---

## 8. 调试事件结构 (e: 事件)

所有事件都会附带一个调试事件，包含完整的事件详情：

```typescript
interface DebugEvent {
  captured_at: string;      // 捕获时间 (ISO 8601)
  event: string;            // 事件类型 (on_chat_model_stream, on_tool_start, etc.)
  name: string | null;      // 节点/工具名称
  run_id: string;           // 运行 ID
  parent_ids: string[];     // 父事件 ID 列表
  tags: string[];           // 事件标签
  metadata: Record<string, any>;  // 元数据
  data: Record<string, any>;     // 事件数据
  keys: string[];           // 原始事件的键列表
  raw: Record<string, any>;      // 完整原始事件

  // chunk_snapshot (仅 on_chat_model_stream)
  chunk_snapshot?: {
    type: string;           // Chunk 类型名称
    content: string;        // 文本内容
    additional_kwargs: Record<string, any>;
    response_metadata: Record<string, any>;
    tool_call_chunks: any[];
  };
}
```

---

## 9. 事件处理最佳实践

### 9.1 前端 SSE 连接处理

```javascript
const eventSource = new EventSource('/api/agent/chat/stream', {
  method: 'POST',
  body: JSON.stringify({ query: '你好', session_id: 'xxx' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // 保留不完整的行

  for (const line of lines) {
    if (!line.trim()) continue;
    const event = parseSSELine(line);
    handleEvent(event);
  }
}
```

### 9.2 事件类型处理优先级

1. **高优先级** - `0:` 文本流 (立即显示)
2. **中优先级** - `2:` 推理内容 (可折叠显示)
3. **中优先级** - `9:` 工具调用 (显示加载状态)
4. **中优先级** - `a:` 工具结果 (显示执行结果)
5. **低优先级** - `e:` 调试事件 (开发环境记录)

---

## 10. 常见问题

### Q1: 如何判断当前使用的是哪个 Agent？

检查路由结束事件：
```javascript
if (debugEvent.event === 'on_chain_end' && debugEvent.name === 'route_node') {
  const route = debugEvent.data.output.route; // 'qa' | 'rag' | 'sql'
}
```

### Q2: 如何区分普通文本和推理内容？

- 普通文本以 `0:` 开头
- 推理内容以 `2:` 开头

### Q3: 工具调用和结果的对应关系？

通过 `toolCallId` (即 `run_id`) 匹配：
```javascript
const toolCalls = new Map();
// on_tool_start 时记录
toolCalls.set(run_id, { toolName, args });
// on_tool_end 时关联
const call = toolCalls.get(run_id);
call.result = result;
```

### Q4: 如何获取最终的 token 使用量？

监听 `on_chat_model_end` 事件：
```javascript
if (debugEvent.event === 'on_chat_model_end') {
  const usage = debugEvent.data.output.response_metadata?.token_usage;
  if (usage) {
    console.log(`Tokens: ${usage.total_tokens}`);
  }
}
```

---

## 附录: LangGraph 事件参考

完整 LangGraph 事件列表请参考:
- https://langchain-ai.github.io/langgraph/concepts/low_level/#streaming-events

常用事件类型:

| 事件名称 | 触发时机 | SSE 输出 |
|---------|---------|----------|
| `on_chain_start` | 链/节点开始执行 | `e:` 透传 |
| `on_chain_end` | 链/节点执行结束 | `e:` 透传 (含输出数据) |
| `on_chain_stream` | 链/节点流式中间状态 | `e:` 透传 |
| `on_chat_model_start` | LLM 调用开始 | `e:` 透传 |
| `on_chat_model_stream` | LLM 流式输出 | `0:` 文本 / `2:` 推理 + `e:` 透传 |
| `on_chat_model_end` | LLM 调用结束 | `e:` 透传 (含 usage) |
| `on_tool_start` | 工具调用开始 | `9:` 工具调用 + `e:` 透传 |
| `on_tool_end` | 工具调用结束 | `a:` 工具结果 + `e:` 透传 |
| `on_llm_start` | LLM 原始调用开始 | `e:` 透传 |
| `on_llm_end` | LLM 原始调用结束 | `e:` 透传 |

### on_chain_stream 事件

`on_chain_stream` 是 LangGraph 在节点执行过程中产生的中间状态事件。对于 RAG Agent，每个节点 (rewrite/search/answer) 都可能产生此事件。

**特征**:
- 包含节点当前的中间状态
- `data` 字段包含部分更新后的状态
- 常用于显示长时间操作的进度

**示例**:

```json
{
  "event": "on_chain_stream",
  "name": "search",
  "data": {
    // 可能包含部分检索结果或进度信息
  }
}
```

---

## 附录: 实际测试验证结果

以下是通过实际 API 测试收集的事件数据统计：

### QA Agent 测试
**输入**: "你好"
**路由**: qa (默认)
**事件统计**:
- 总事件行数: 69
- 文本块数: 28
- 工具调用数: 0
- 事件类型分布:
  - `on_chat_model_stream`: 31 次
  - `on_chain_start/end`: 各 3 次
  - `on_chat_model_start/end`: 各 1 次

### RAG Agent 测试
**输入**: "文档搜索功能怎么用？"
**路由**: rag
**节点流程**: rewrite → search → answer
**事件统计**:
- 总事件行数: 25
- 文本块数: 5
- 检索结果事件: 1 次 (`r:`)
- 事件类型分布:
  - `on_chat_model_stream`: 5 次
  - `on_chain_start/end/stream`: 各节点事件
  - **新增**: `r:` 检索结果事件

### SQL Agent 测试
**输入**: "查询用户表有多少条记录"
**路由**: sql
**响应**: Stub 响应 "(SQLAgent stub) 后续接 SQL Agent..."

### 工具调用测试
**输入**: "北京今天天气怎么样？"
**路由**: qa
**工具调用**: `get_current_weather`
**参数**: `{"city": "北京"}`
**结果**: `Unknown city, assuming Sunny, 20°C`

---

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/agent/chat/stream` | POST | SSE 流式对话 |

### 请求格式
```json
{
  "query": "用户问题",
  "session_id": "会话ID (可选)",
  "kb_id": "知识库ID (可选)",
  "model_id": "模型ID (可选)",
  "chat_history": [{"role": "user", "content": "..."}]
}
```

### 请求头
```
Authorization: Bearer <access_token>
Content-Type: application/json
```
