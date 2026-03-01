import {
  SSEEvent,
  TextEvent,
  ReasoningEvent,
  ToolCallEvent,
  ToolResultEvent,
  RetrievalEvent,
  DebugEvent,
  AgentStreamError,
  AgentChatRequest,
} from './types'

const AGENT_API_URL = '/api/agent/chat/stream'

// 解析 SSE 行为事件
function parseSSELine(line: string): SSEEvent | null {
  if (!line || line.startsWith(':')) return null // 注释或空行

  const prefix = line[0]
  const colonIndex = line.indexOf(':')
  if (colonIndex === -1) return null

  const dataStr = line.slice(colonIndex + 1)
  const timestamp = Date.now()

  try {
    const data = JSON.parse(dataStr)

    switch (prefix) {
      case '0': // 文本内容
        return { type: 'text', content: data, timestamp } as TextEvent

      case '2': // 推理内容
        return { type: 'reasoning', content: data, timestamp } as ReasoningEvent

      case '9': // 工具调用
        return { type: 'tool_call', ...data, timestamp } as ToolCallEvent

      case 'a': // 工具结果
        return { type: 'tool_result', ...data, timestamp } as ToolResultEvent

      case 'r': // RAG 检索
        return { type: 'retrieval', ...data, timestamp } as RetrievalEvent

      case 'e': // 调试事件
        return {
          type: 'debug',
          event: data.event || '',
          name: data.name || '',
          run_id: data.run_id || '',
          data: data.data || data,
          raw: data,
          timestamp,
        } as DebugEvent

      default:
        return { type: 'debug', event: 'unknown', name: '', data, raw: line, timestamp } as DebugEvent
    }
  } catch {
    // JSON 解析失败，可能是纯文本
    if (prefix === '0') {
      return { type: 'text', content: dataStr, timestamp } as TextEvent
    }
    return null
  }
}

// 流式聊天
export async function* chatStream(
  query: string,
  sessionId: string,
  options: {
    kbId?: string
    modelId?: string
    chatHistory?: Array<{ role: string; content: string }>
    signal?: AbortSignal
  } = {}
): AsyncGenerator<SSEEvent> {
  const { kbId, modelId, chatHistory = [], signal } = options

  const response = await fetch(AGENT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      query,
      session_id: sessionId,
      kb_id: kbId,
      model_id: modelId,
      chat_history: chatHistory,
    } satisfies AgentChatRequest),
  })

  if (!response.ok) {
    // 处理不同 HTTP 状态码
    if (response.status === 401 || response.status === 403) {
      throw new AgentStreamError('认证失效，请重新登录', response.status)
    }
    if (response.status === 429) {
      throw new AgentStreamError('请求过于频繁，请稍后再试', response.status)
    }
    throw new AgentStreamError(`请求失败: ${response.statusText}`, response.status)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new AgentStreamError('无响应内容')

  const decoder = new TextDecoder()
  let buffer = ''

  console.log('[Agent SSE] Stream started')

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log('[Agent SSE] Stream ended')
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      console.log('[Agent SSE] Received chunk:', chunk.substring(0, 100))
      buffer += chunk

      // 按行分割处理
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留最后一个不完整的行

      for (const line of lines) {
        const event = parseSSELine(line)
        if (event) {
          console.log('[Agent SSE] Parsed event:', event.type)
          yield event
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
