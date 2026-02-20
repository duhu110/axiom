"use client"

import { useState } from "react"
import { Settings, Database, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAgentStore } from "../store"

export function SettingsDialog() {
  const { kbId, modelId, setSettings } = useAgentStore()
  const [open, setOpen] = useState(false)

  // TODO: 从 API 获取实际的列表
  // 这些是示例数据，需要后续替换为真实 API 调用
  const knowledgeBases: { id: string; name: string }[] = [
    // { id: "kb-1", name: "产品文档" },
    // { id: "kb-2", name: "技术文档" },
  ]

  const models: { id: string; name: string; provider: string }[] = [
    // { id: "model-1", name: "GPT-4o", provider: "OpenAI" },
    // { id: "model-2", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
    // { id: "model-3", name: "DeepSeek V3", provider: "DeepSeek" },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-9 rounded-full">
          <Settings size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agent 设置</DialogTitle>
          <DialogDescription>
            配置知识库和 AI 模型
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 知识库选择 */}
          <div className="space-y-2">
            <Label htmlFor="kb-select" className="flex items-center gap-2">
              <Database size={16} />
              知识库
            </Label>
            <Select
              value={kbId || ""}
              onValueChange={(value) => setSettings({ kbId: value || undefined, modelId })}
            >
              <SelectTrigger id="kb-select">
                <SelectValue placeholder="使用默认知识库（无）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">默认（无知识库）</SelectItem>
                {knowledgeBases.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    暂无可用知识库
                  </SelectItem>
                ) : (
                  knowledgeBases.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {knowledgeBases.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                知识库功能开发中，敬请期待
              </p>
            )}
          </div>

          {/* 模型选择 */}
          <div className="space-y-2">
            <Label htmlFor="model-select" className="flex items-center gap-2">
              <Cpu size={16} />
              AI 模型
            </Label>
            <Select
              value={modelId || ""}
              onValueChange={(value) => setSettings({ kbId, modelId: value || undefined })}
            >
              <SelectTrigger id="model-select">
                <SelectValue placeholder="使用默认模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">默认模型</SelectItem>
                {models.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    暂无可用模型
                  </SelectItem>
                ) : (
                  models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                      {model.provider && (
                        <span className="text-muted-foreground ml-2">
                          ({model.provider})
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {models.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                模型选择功能开发中，使用系统默认模型
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setOpen(false)}>
            完成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
