"use client"

import { cn } from "@/lib/utils"
import { Message, MessageContent, MessageActions, MessageAction } from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { Pencil, Trash, Copy, CheckCircle2 } from "lucide-react"
import { useState } from "react"

interface UserMessageProps {
  content: string
  onEdit?: () => void
  onDelete?: () => void
}

export function UserMessage({ content, onEdit, onDelete }: UserMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Message className={cn("mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-end")}>
      <div className="group flex flex-col items-end gap-1">
        <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
          {content}
        </MessageContent>
        <MessageActions
          className={cn(
            "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          )}
        >
          {onEdit && (
            <MessageAction tooltip="编辑" delayDuration={100}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Pencil size={16} />
              </Button>
            </MessageAction>
          )}
          {onDelete && (
            <MessageAction tooltip="删除" delayDuration={100}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Trash size={16} />
              </Button>
            </MessageAction>
          )}
          <MessageAction tooltip={copied ? "已复制" : "复制"} delayDuration={100}>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleCopy}>
              {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
            </Button>
          </MessageAction>
        </MessageActions>
      </div>
    </Message>
  )
}
