"use client"

import { useState, useEffect } from "react"
import { Settings, Database, Cpu, Loader2 } from "lucide-react"
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
import { getKnowledgeBases, getLLMModels, KnowledgeBase, LLMModel } from "@/lib/api/kb"

export function SettingsDialog() {
  const { kbId, modelId, setSettings } = useAgentStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [models, setModels] = useState<LLMModel[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  // 打开对话框时加载数据
  useEffect(() => {
    if (!open) return

    const loadData = async () => {
      setLoading(true)
      setFetchError(null)

      try {
        const [kbResponse, modelsResponse] = await Promise.all([
          getKnowledgeBases({ limit: 100 }),
          getLLMModels(),
        ])
        setKnowledgeBases(kbResponse.items)
        setModels(modelsResponse.items)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : '加载数据失败')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open])

  const handleKbChange = (value: string) => {
    setSettings({ kbId: value || undefined, modelId })
  }

  const handleModelChange = (value: string) => {
    setSettings({ kbId, modelId: value || undefined })
  }

  // 获取选中的知识库名称
  const selectedKbName = knowledgeBases.find(kb => kb.id === kbId)?.name

  // 获取选中的模型名称
  const selectedModelName = models.find(m => m.id === modelId)?.name

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-full relative"
          title={selectedKbName || selectedModelName ? "当前设置" : "Agent 设置"}
        >
          <Settings size={18} />
          {(selectedKbName || selectedModelName) && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agent 设置</DialogTitle>
          <DialogDescription>
            配置知识库和 AI 模型
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">加载中...</span>
          </div>
        ) : fetchError ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>{fetchError}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(false)}>
              关闭
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 当前设置摘要 */}
            {(selectedKbName || selectedModelName) && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-medium text-muted-foreground">当前设置</div>
                {selectedKbName && (
                  <div className="text-sm flex items-center gap-2">
                    <Database size={14} />
                    <span>{selectedKbName}</span>
                  </div>
                )}
                {selectedModelName && (
                  <div className="text-sm flex items-center gap-2">
                    <Cpu size={14} />
                    <span>{selectedModelName}</span>
                  </div>
                )}
              </div>
            )}

            {/* 知识库选择 */}
            <div className="space-y-2">
              <Label htmlFor="kb-select" className="flex items-center gap-2">
                <Database size={16} />
                知识库
                {knowledgeBases.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({knowledgeBases.length} 个可用)
                  </span>
                )}
              </Label>
              <Select value={kbId || ""} onValueChange={handleKbChange}>
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
                        <div className="flex items-center gap-2">
                          <span>{kb.name}</span>
                          {kb.visibility === 'private' && (
                            <span className="text-[10px] bg-muted-foreground/20 px-1.5 rounded">
                              私有
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedKbName && (
                <p className="text-[10px] text-muted-foreground">
                  当前使用: {selectedKbName}
                </p>
              )}
            </div>

            {/* 模型选择 */}
            <div className="space-y-2">
              <Label htmlFor="model-select" className="flex items-center gap-2">
                <Cpu size={16} />
                AI 模型
                {models.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({models.length} 个可用)
                  </span>
                )}
              </Label>
              <Select value={modelId || ""} onValueChange={handleModelChange}>
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
                        <div className="flex flex-col">
                          <span>{model.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {model.provider} · {model.model_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedModelName && (
                <p className="text-[10px] text-muted-foreground">
                  当前使用: {selectedModelName}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setOpen(false)}>
            完成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
