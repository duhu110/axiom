"use client"

import { useEffect, useRef, useState } from "react"
import { useAgentStore } from "../store"
import { AssistantMessage } from "./assistant-message"
import { UserMessage } from "./user-message"
import { ErrorMessage } from "./error-message"
import { SettingsDialog } from "./settings-dialog"
import { DebugPanel } from "./debug-panel"
import { ModelSelectorButton } from "./model-selector-button"
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  ArrowUp,
  Plus,
  Globe,
  MoreHorizontal,
  Mic,
  Bug,
  Trash2,
  Loader2,
  X,
} from "lucide-react"

export function ChatContent() {
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    clearError,
    clearMessages,
    retryLastMessage,
    cancelRequest,
    debugEvents,
    showDebugPanel,
    toggleDebugPanel,
  } = useAgentStore()

  const [prompt, setPrompt] = useState("")
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollContainer = chatContainerRef.current.querySelector('[data-scroll-container]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isStreaming])

  const handleSubmit = () => {
    if (!prompt.trim() || isLoading) return
    const query = prompt.trim()
    setPrompt("")
    sendMessage(query)
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <div className="text-foreground font-medium">AI Agent</div>
        </div>
        <div className="flex items-center gap-2">
          {/* 调试面板开关 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDebugPanel}
            className={showDebugPanel ? "bg-muted" : ""}
          >
            <Bug size={18} />
          </Button>
          {/* 清空对话 */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              title="清空对话"
            >
              <Trash2 size={18} />
            </Button>
          )}
          {/* 设置 */}
          <SettingsDialog />
        </div>
      </header>

      {/* Chat Area */}
      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent
            className="space-y-0 px-5 py-12"
            data-scroll-container
          >
            {messages.length === 0 ? (
              // 空状态
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="max-w-md space-y-4">
                  <h1 className="text-2xl font-semibold">你好，我是 AI Agent</h1>
                  <p className="text-muted-foreground">
                    我可以帮你回答问题、搜索信息、执行任务。有什么可以帮助你的吗？
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1

                if (message.role === "user") {
                  return <UserMessage
                    key={message.id}
                    id={message.id}
                    content={message.content}
                  />
                }

                return <AssistantMessage
                  key={message.id}
                  message={message}
                  isLastMessage={isLastMessage}
                />
              })
            )}

            {/* 错误消息 */}
            {error && (
              <div className="mx-auto max-w-3xl px-6">
                <ErrorMessage
                  error={error}
                  onRetry={retryLastMessage}
                  onDismiss={clearError}
                />
              </div>
            )}

            {/* 加载指示器 */}
            {isLoading && !error && (
              <div className="mx-auto max-w-3xl px-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  <span>思考中...</span>
                  {isStreaming && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelRequest}
                      className="ml-auto h-7 px-2"
                    >
                      <X size={14} className="mr-1" />
                      取消
                    </Button>
                  )}
                </div>
              </div>
            )}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <DebugPanel events={debugEvents} />
      )}

      {/* Input Area */}
      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            isLoading={isLoading}
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={handleSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder="输入你的问题..."
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="添加附件">
                    <Button variant="outline" size="icon" className="size-9 rounded-full">
                      <Plus size={18} />
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="搜索">
                    <Button variant="outline" className="rounded-full">
                      <Globe size={18} />
                      搜索
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="选择模型">
                    <ModelSelectorButton />
                  </PromptInputAction>

                  <PromptInputAction tooltip="更多操作">
                    <Button variant="outline" size="icon" className="size-9 rounded-full">
                      <MoreHorizontal size={18} />
                    </Button>
                  </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="语音输入">
                    <Button variant="outline" size="icon" className="size-9 rounded-full">
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction>

                  <Button
                    size="icon"
                    disabled={!prompt.trim() || isLoading}
                    onClick={handleSubmit}
                    className="size-9 rounded-full"
                  >
                    {!isLoading ? (
                      <ArrowUp size={18} />
                    ) : (
                      <Loader2 size={18} className="animate-spin" />
                    )}
                  </Button>
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
  )
}
