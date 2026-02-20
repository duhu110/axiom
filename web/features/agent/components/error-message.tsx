"use client"

import { AlertCircle, RefreshCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorMessageProps {
  error: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorMessage({ error, onRetry, onDismiss, className }: ErrorMessageProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-destructive",
      className
    )}>
      <AlertCircle size={16} className="shrink-0" />
      <span className="text-sm flex-1">{error}</span>
      <div className="flex items-center gap-2">
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry} className="h-7 px-2">
            <RefreshCcw size={14} className="mr-1" />
            重试
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-7 w-7 p-0">
            <X size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}
