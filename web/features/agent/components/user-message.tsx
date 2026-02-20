"use client"

import { cn } from "@/lib/utils"
import { Message, MessageContent, MessageActions, MessageAction } from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { Pencil, Trash, Copy, CheckCircle2, X } from "lucide-react"
import { useState } from "react"
import { useAgentStore } from "../store"
import { Textarea } from "@/components/ui/textarea"

interface UserMessageProps {
  id: string
  content: string
}

export function UserMessage({ id, content }: UserMessageProps) {
  const [copied, setCopied] = useState(false)
  const [editText, setEditText] = useState(content)
  const { deleteMessage, startEditing, stopEditing, resubmitEditedMessage, editingMessageId } = useAgentStore()

  const isEditing = editingMessageId === id

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = () => {
    deleteMessage(id)
  }

  const handleStartEdit = () => {
    setEditText(content)
    startEditing(id)
  }

  const handleCancelEdit = () => {
    stopEditing()
  }

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== content) {
      resubmitEditedMessage(id, editText.trim())
    } else {
      stopEditing()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <Message className={cn("mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-end")}>
      <div className="group flex flex-col items-end gap-1 w-full">
        {isEditing ? (
          // 编辑模式
          <div className="flex flex-col items-end gap-2 max-w-[85%] sm:max-w-[75%]">
            <div className="w-full bg-muted rounded-3xl p-3">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] max-h-[200px] resize-none bg-background border-0 focus-visible:ring-0 p-0 text-sm"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 px-2">
                <X size={14} className="mr-1" />
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="h-7 px-2"
              >
                <CheckCircle2 size={14} className="mr-1" />
                保存
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Enter 保存 · Esc 取消
            </p>
          </div>
        ) : (
          // 查看模式
          <>
            <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
              {content}
            </MessageContent>
            <MessageActions
              className={cn(
                "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              )}
            >
              <MessageAction tooltip="编辑" delayDuration={100}>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleStartEdit}>
                  <Pencil size={16} />
                </Button>
              </MessageAction>
              <MessageAction tooltip="删除" delayDuration={100}>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleDelete}>
                  <Trash size={16} />
                </Button>
              </MessageAction>
              <MessageAction tooltip={copied ? "已复制" : "复制"} delayDuration={100}>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleCopy}>
                  {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                </Button>
              </MessageAction>
            </MessageActions>
          </>
        )}
      </div>
    </Message>
  )
}
