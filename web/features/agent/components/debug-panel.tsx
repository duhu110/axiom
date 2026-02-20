"use client"

import { DebugEvent } from "../types"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DebugPanelProps {
  events: DebugEvent[]
  maxHeight?: string
}

export function DebugPanel({ events, maxHeight = "200px" }: DebugPanelProps) {
  // 事件类型颜色映射
  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      'on_chat_model_start': 'text-blue-400',
      'on_chat_model_end': 'text-green-400',
      'on_chat_model_stream': 'text-cyan-400',
      'on_tool_start': 'text-yellow-400',
      'on_tool_end': 'text-orange-400',
      'on_chain_start': 'text-purple-400',
      'on_chain_end': 'text-pink-400',
      'unknown': 'text-gray-400',
    }
    return colors[eventType] || colors.unknown
  }

  // 格式化时间戳
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + date.getMilliseconds().toString().padStart(3, '0')
  }

  return (
    <div className={cn("border-t bg-muted/30", maxHeight)} style={{ maxHeight }}>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <span className="text-xs font-medium text-foreground">
          调试事件流 ({events.length} 条)
        </span>
        <span className="text-[10px] text-muted-foreground">
          仅开发环境显示
        </span>
      </div>
      <ScrollArea className="h-[calc(100%-40px)]">
        <div className="px-4 py-2 font-mono text-[10px] space-y-1">
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              暂无事件
            </div>
          ) : (
            events.map((event, idx) => (
              <details
                key={idx}
                className="group/detail"
              >
                <summary className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 flex items-center gap-2">
                  <span className="text-muted-foreground">{formatTime(event.timestamp)}</span>
                  <span className={cn("font-semibold", getEventColor(event.event))}>
                    {event.event}
                  </span>
                  {event.name && (
                    <span className="text-muted-foreground">
                      / {event.name}
                    </span>
                  )}
                  {event.run_id && (
                    <span className="text-muted-foreground text-[9px] ml-auto">
                      #{event.run_id.slice(0, 8)}
                    </span>
                  )}
                </summary>
                <div className="ml-4 mt-1 pl-2 border-l-2 border-muted">
                  <pre className="text-muted-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(event.data || event.raw, null, 2)}
                  </pre>
                </div>
              </details>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
