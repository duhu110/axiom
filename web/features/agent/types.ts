// ============ 后端 SSE 事件类型 ============
export type SSEEventType = 'text' | 'reasoning' | 'tool_call' | 'tool_result' | 'retrieval' | 'debug'

export interface BaseSSEEvent {
  timestamp: number
}

// 文本内容事件 (0:)
export interface TextEvent extends BaseSSEEvent {
  type: 'text'
  content: string
}

// DeepSeek 推理内容事件 (2:)
export interface ReasoningEvent extends BaseSSEEvent {
  type: 'reasoning'
  content: string
}

// 工具调用事件 (9:)
export interface ToolCallEvent extends BaseSSEEvent {
  type: 'tool_call'
  toolCallId: string
  toolName: string
  args: unknown
}

// 工具结果事件 (a:)
export interface ToolResultEvent extends BaseSSEEvent {
  type: 'tool_result'
  toolCallId: string
  result: string
}

// RAG 检索结果事件 (r:)
export interface RetrievalDocument {
  content: string
  metadata: Record<string, unknown>
}

export interface RetrievalEvent extends BaseSSEEvent {
  type: 'retrieval'
  documents: RetrievalDocument[]
}

// 调试事件 (e:)
export interface DebugEvent extends BaseSSEEvent {
  type: 'debug'
  event: string
  name?: string
  run_id?: string
  data?: unknown
  raw?: unknown
}

// SSE 事件联合类型
export type SSEEvent = TextEvent | ReasoningEvent | ToolCallEvent | ToolResultEvent | RetrievalEvent | DebugEvent

// ============ 前端消息状态 ============
export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  reasoning?: string // DeepSeek 推理内容
  toolCalls?: ToolCallEvent[]
  toolResults?: ToolResultEvent[]
  retrievalResults?: RetrievalEvent[]
  timestamp: number
}

// ============ 请求类型 ============
export interface ChatHistoryItem {
  role: string
  content: string
}

export interface AgentChatRequest {
  query: string
  session_id: string
  kb_id?: string
  model_id?: string
  chat_history: ChatHistoryItem[]
}

// ============ 设置选项 ============
export interface AgentSettings {
  kbId?: string
  modelId?: string
}

// ============ 错误类型 ============
export class AgentStreamError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AgentStreamError'
  }
}
