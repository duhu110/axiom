import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChatMessage, ToolCallEvent, ToolResultEvent, RetrievalEvent, TextEvent, ReasoningEvent, DebugEvent, AgentStreamError } from './types'
import { chatStream } from './api'

// 生成唯一 ID
function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// 生成或恢复 session ID
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  const existing = localStorage.getItem('agent_session_id')
  if (existing) return existing
  const newId = crypto.randomUUID()
  localStorage.setItem('agent_session_id', newId)
  return newId
}

interface AgentState {
  // ============ 状态 ============
  messages: ChatMessage[]
  sessionId: string
  kbId?: string
  modelId?: string
  isLoading: boolean
  isStreaming: boolean
  error?: string
  abortController?: AbortController

  // 调试事件流（所有原始事件）
  debugEvents: DebugEvent[]
  showDebugPanel: boolean

  // ============ 操作 ============
  sendMessage: (query: string) => Promise<void>
  setSettings: (settings: { kbId?: string; modelId?: string }) => void
  toggleDebugPanel: () => void
  clearMessages: () => void
  retryLastMessage: () => Promise<void>
  cancelRequest: () => void
  clearError: () => void
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      // 初始状态
      messages: [],
      sessionId: getOrCreateSessionId(),
      kbId: undefined,
      modelId: undefined,
      isLoading: false,
      isStreaming: false,
      debugEvents: [],
      showDebugPanel: false,

      // 发送消息
      sendMessage: async (query: string) => {
        const { messages, sessionId, kbId, modelId } = get()

        // 取消之前的请求
        const prevController = get().abortController
        prevController?.abort()

        // 创建新的 AbortController
        const abortController = new AbortController()
        set({ abortController, isLoading: true, isStreaming: true, error: undefined })

        // 添加用户消息
        const userMessage: ChatMessage = {
          id: createId(),
          role: 'user',
          content: query,
          timestamp: Date.now(),
        }
        set({ messages: [...messages, userMessage] })

        // 创建空的助手消息
        const assistantMessage: ChatMessage = {
          id: createId(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        }
        set({ messages: [...get().messages, assistantMessage] })

        // 准备历史记录
        const chatHistory = get().messages
          .filter(m => m.role !== 'assistant' || m.content) // 排除空 assistant 消息
          .map(m => ({ role: m.role, content: m.content }))

        try {
          for await (const event of chatStream(query, sessionId, {
            kbId,
            modelId,
            chatHistory,
            signal: abortController.signal,
          })) {
            const state = get()

            switch (event.type) {
              case 'text': {
                set({
                  messages: state.messages.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: msg.content + (event as TextEvent).content }
                      : msg
                  ),
                  isStreaming: true,
                })
                break
              }

              case 'reasoning': {
                set({
                  messages: state.messages.map(msg =>
                    msg.id === assistantMessage.id
                      ? {
                          ...msg,
                          reasoning: (msg.reasoning || '') + (event as ReasoningEvent).content,
                        }
                      : msg
                  ),
                })
                break
              }

              case 'tool_call': {
                set({
                  messages: state.messages.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, toolCalls: [...(msg.toolCalls || []), event as ToolCallEvent] }
                      : msg
                  ),
                })
                break
              }

              case 'tool_result': {
                set({
                  messages: state.messages.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, toolResults: [...(msg.toolResults || []), event as ToolResultEvent] }
                      : msg
                  ),
                })
                break
              }

              case 'retrieval': {
                set({
                  messages: state.messages.map(msg =>
                    msg.id === assistantMessage.id
                      ? {
                          ...msg,
                          retrievalResults: [...(msg.retrievalResults || []), event as RetrievalEvent],
                        }
                      : msg
                  ),
                })
                break
              }

              case 'debug': {
                set(state => ({
                  debugEvents: [...state.debugEvents, event as DebugEvent],
                }))
                break
              }
            }
          }

          set({ isLoading: false, isStreaming: false, abortController: undefined })
        } catch (err) {
          // 如果是主动取消，不显示错误
          if (err instanceof Error && err.name === 'AbortError') {
            set({
              isLoading: false,
              isStreaming: false,
              abortController: undefined,
            })
            return
          }

          let errorMessage = '发生未知错误'
          if (err instanceof AgentStreamError) {
            if (err.code === 401) {
              errorMessage = '登录已过期，请重新登录'
            } else if (err.code === 429) {
              errorMessage = '请求太频繁，请稍后再试'
            } else {
              errorMessage = err.message
            }
          } else if (err instanceof Error) {
            errorMessage = err.message
          }

          set({
            isLoading: false,
            isStreaming: false,
            error: errorMessage,
            abortController: undefined,
            // 移除空的 assistant 消息
            messages: get().messages.filter(m => m.id !== assistantMessage.id),
          })
        }
      },

      // 设置配置
      setSettings: settings => {
        set({ kbId: settings.kbId, modelId: settings.modelId })
      },

      // 切换调试面板
      toggleDebugPanel: () => set(state => ({ showDebugPanel: !state.showDebugPanel })),

      // 清空消息
      clearMessages: () => {
        // 取消正在进行的请求
        get().abortController?.abort()
        set({
          messages: [],
          debugEvents: [],
          error: undefined,
          isLoading: false,
          isStreaming: false,
          abortController: undefined,
        })
      },

      // 重试最后一条消息
      retryLastMessage: async () => {
        const { messages } = get()
        // 找到最后一条用户消息
        const lastUserMsgIndex = messages.map(m => m.role).lastIndexOf('user')
        if (lastUserMsgIndex === -1) return

        const lastUserMsg = messages[lastUserMsgIndex]

        // 移除该用户消息之后的所有消息
        const messagesToKeep = messages.slice(0, lastUserMsgIndex)
        set({ messages: messagesToKeep })

        await get().sendMessage(lastUserMsg.content)
      },

      // 取消请求
      cancelRequest: () => {
        get().abortController?.abort()
        set({ isLoading: false, isStreaming: false, abortController: undefined })
      },

      // 清除错误
      clearError: () => set({ error: undefined }),
    }),
    {
      name: 'agent-storage',
      partialize: state => ({
        messages: state.messages,
        sessionId: state.sessionId,
        kbId: state.kbId,
        modelId: state.modelId,
      }),
    }
  )
)
