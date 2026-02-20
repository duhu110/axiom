"use client"

import { ChevronDown, ChevronRight, Copy, FileText, Settings2, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Message, MessageContent, MessageActions, MessageAction } from "@/components/prompt-kit/message"
import { cn } from "@/lib/utils"
import { ChatMessage } from "../types"
import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface AssistantMessageProps {
  message: ChatMessage
  isLastMessage?: boolean
}

export function AssistantMessage({ message, isLastMessage }: AssistantMessageProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const [toolCallsOpen, setToolCallsOpen] = useState(true)
  const [retrievalOpen, setRetrievalOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 查找工具调用对应的结果
  const getToolResult = (toolCallId: string) => {
    return message.toolResults?.find(r => r.toolCallId === toolCallId)
  }

  // 获取工具调用的状态
  const getToolStatus = (toolCallId: string) => {
    const result = getToolResult(toolCallId)
    if (result) return 'done'
    return 'running'
  }

  return (
    <Message className={cn("mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start")}>
      <div className="group flex w-full flex-col gap-3">
        {/* 推理内容 */}
        {message.reasoning && (
          <Collapsible open={reasoningOpen} onOpenChange={setReasoningOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground h-7 px-2"
              >
                {reasoningOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-xs font-medium">思考过程</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-5">
              <div className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-3 py-1">
                {message.reasoning}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* RAG 检索结果 */}
        {message.retrievalResults && message.retrievalResults.length > 0 && (
          <Collapsible open={retrievalOpen} onOpenChange={setRetrievalOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground h-7 px-2"
              >
                {retrievalOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FileText size={14} />
                <span className="text-xs font-medium">
                  检索到 {message.retrievalResults.flatMap(r => r.documents).length} 个文档片段
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pl-5">
              {message.retrievalResults.map((result, idx) => (
                <div key={idx} className="space-y-1">
                  {result.documents.map((doc, docIdx) => (
                    <div
                      key={docIdx}
                      className="text-xs bg-muted/50 rounded p-2 border-l-2 border-primary/50"
                    >
                      <div className="font-medium text-foreground mb-1">
                        文档片段 {docIdx + 1}
                      </div>
                      <div className="text-muted-foreground line-clamp-3">
                        {doc.content}
                      </div>
                      {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            元数据
                          </summary>
                          <pre className="text-[10px] text-muted-foreground mt-1 overflow-x-auto">
                            {JSON.stringify(doc.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 工具调用 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <Collapsible open={toolCallsOpen} onOpenChange={setToolCallsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground h-7 px-2"
              >
                {toolCallsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Settings2 size={14} />
                <span className="text-xs font-medium">
                  {message.toolCalls.length} 个工具调用
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pl-5">
              {message.toolCalls.map((toolCall, idx) => {
                const status = getToolStatus(toolCall.toolCallId)
                const result = getToolResult(toolCall.toolCallId)

                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs">
                      {status === 'running' ? (
                        <Loader2 size={12} className="animate-spin text-muted-foreground" />
                      ) : (
                        <CheckCircle2 size={12} className="text-green-500" />
                      )}
                      <span className="font-medium text-foreground">{toolCall.toolName}</span>
                      <span className="text-muted-foreground">#{toolCall.toolCallId.slice(0, 8)}</span>
                    </div>
                    <div className="text-xs bg-muted/50 rounded p-2">
                      <div className="font-medium text-foreground mb-1">参数</div>
                      <pre className="text-muted-foreground overflow-x-auto">
                        {JSON.stringify(toolCall.args, null, 2)}
                      </pre>
                      {result && (
                        <>
                          <div className="font-medium text-foreground mb-1 mt-2">结果</div>
                          <div className="text-muted-foreground max-h-32 overflow-y-auto">
                            {typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 主要内容 */}
        {message.content ? (
          <MessageContent
            className="text-foreground prose flex-1 rounded-lg bg-transparent p-0 max-w-none"
            markdown
          >
            {message.content}
          </MessageContent>
        ) : (
          // 流式输出时的占位符
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 size={14} className="animate-spin" />
            <span>思考中...</span>
          </div>
        )}

        {/* 操作按钮 */}
        <MessageActions
          className={cn(
            "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
            isLastMessage && "opacity-100"
          )}
        >
          <MessageAction tooltip={copied ? "已复制" : "复制"} delayDuration={100}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={handleCopy}
            >
              {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
            </Button>
          </MessageAction>
        </MessageActions>
      </div>
    </Message>
  )
}
