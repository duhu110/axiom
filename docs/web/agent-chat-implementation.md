# Agent 聊天页面实现

**日期**: 2026-02-20

## 概述

在 `web/app/(protected)/agent/page.tsx` 中集成了后端 AGENT 流式接口，实现了完整的 AI 对话功能。

## 架构设计

### 文件结构

```
web/features/agent/
├── types.ts                    # 类型定义
├── api.ts                      # SSE 流式 API 封装
├── store.ts                    # Zustand 状态管理
├── components/
│   ├── chat-content.tsx        # 主容器
│   ├── assistant-message.tsx   # 助手消息组件
│   ├── user-message.tsx        # 用户消息组件
│   ├── debug-panel.tsx         # 调试面板
│   ├── settings-dialog.tsx     # 设置对话框
│   ├── error-message.tsx       # 错误提示
│   └── agent-tool.tsx          # (保留)
└── data.ts                     # (保留，空文件)
```

### 核心模块

#### 1. 类型定义 (`types.ts`)

- **SSE 事件类型**: `TextEvent`, `ReasoningEvent`, `ToolCallEvent`, `ToolResultEvent`, `RetrievalEvent`, `DebugEvent`
- **消息类型**: `ChatMessage` - 包含 content, reasoning, toolCalls, retrievalResults
- **请求类型**: `AgentChatRequest`
- **错误类型**: `AgentStreamError`

#### 2. API 层 (`api.ts`)

`chatStream()` 函数：
- 使用 `fetch` 直接调用后端 `/api/agent/chat/stream`
- 解析 Vercel AI SDK 格式的 SSE 流 (`0:`, `2:`, `9:`, `a:`, `r:`, `e:`)
- 支持 `AbortSignal` 取消请求
- 返回 `AsyncGenerator<SSEEvent>`

#### 3. 状态管理 (`store.ts`)

Zustand store 包含：
- `messages` - 聊天消息列表
- `sessionId` - 会话 ID (持久化到 localStorage)
- `kbId` / `modelId` - 配置选项
- `isLoading` / `isStreaming` - 加载状态
- `debugEvents` - 调试事件流
- 操作方法: `sendMessage`, `setSettings`, `clearMessages`, `retryLastMessage`, `cancelRequest`

#### 4. 组件

**AssistantMessage**:
- 渲染助手消息内容 (Markdown)
- 可折叠的推理内容 (`<Collapsible>`)
- 可折叠的工具调用列表
- 可折叠的 RAG 检索结果
- 复制按钮

**UserMessage**:
- 渲染用户消息 (气泡样式)
- 复制、编辑、删除按钮

**DebugPanel**:
- 展示所有 SSE 调试事件
- 按时间排序
- 可展开查看事件详情
- 不同事件类型用不同颜色标识

**SettingsDialog**:
- 知识库选择 (预留，待 API 完善)
- 模型选择 (预留，待 API 完善)

**ChatContent** (主容器):
- Header: 标题、调试开关、清空按钮、设置按钮
- 聊天区域: 消息列表 + 自动滚动
- DebugPanel: 可折叠的调试面板
- 输入框: 支持多行、Enter 发送、Shift+Enter 换行

## 后端接口

### 端点

```
POST /api/agent/chat/stream
```

### 请求体

```typescript
{
  query: string
  session_id: string
  kb_id?: string
  model_id?: string
  chat_history: Array<{ role: string; content: string }>
}
```

### SSE 事件格式

| 前缀 | 类型 | 说明 |
|------|------|------|
| `0:` | 文本 | AI 回复内容 |
| `2:` | 推理 | DeepSeek 推理过程 |
| `9:` | 工具调用 | `{ toolCallId, toolName, args }` |
| `a:` | 工具结果 | `{ toolCallId, result }` |
| `r:` | RAG 结果 | `{ documents: [{ content, metadata }] }` |
| `e:` | 调试 | 原始 LangGraph 事件 |

## 特性

- ✅ 流式响应实时显示
- ✅ 推理过程折叠展示
- ✅ 工具调用可视化
- ✅ RAG 检索结果展示
- ✅ 完整调试事件流
- ✅ 会话持久化 (localStorage)
- ✅ 错误处理与重试
- ✅ 取消正在进行的请求
- ✅ 自动滚动到底部
- ✅ Markdown 渲染

## 待完善

1. **知识库 API**: 需要添加获取知识库列表的 API
2. **模型 API**: 需要添加获取可用模型列表的 API
3. **消息编辑**: 用户消息编辑功能需要实现
4. **消息删除**: 用户消息删除功能需要实现
5. **多会话管理**: 当前只支持单个会话
6. **文件上传**: 附件功能预留，待实现

## 技术栈

- **状态管理**: Zustand + persist 中间件
- **UI 组件**: shadcn/ui + prompt-kit
- **样式**: Tailwind CSS v4
- **Markdown**: streamdown
- **HTTP**: 原生 fetch API
