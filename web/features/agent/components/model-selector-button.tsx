"use client"

import { useState, useEffect, useMemo } from "react"
import { Cpu, Loader2, Check, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector"
import { useAgentStore } from "../store"
import { getLLMModels, LLMModel } from "@/lib/api/kb"

// Provider Logo 映射
const PROVIDER_LOGO_MAP: Record<string, string> = {
  deepseek: "deepseek",
  dashscope: "alibaba",
  openai_compatible: "openai",
  openai: "openai",
}

// Provider 显示名称映射
const PROVIDER_DISPLAY_NAME: Record<string, string> = {
  deepseek: "DeepSeek",
  dashscope: "阿里云百炼",
  openai_compatible: "OpenAI 兼容",
  openai: "OpenAI",
}

// 获取 provider 的 logo 标识
function getProviderLogo(provider: string): string {
  return PROVIDER_LOGO_MAP[provider] || provider
}

// 获取 provider 的显示名称
function getProviderDisplayName(provider: string): string {
  return PROVIDER_DISPLAY_NAME[provider] || provider
}

// 按 provider 分组模型
function groupModelsByProvider(models: LLMModel[]): Record<string, LLMModel[]> {
  return models.reduce(
    (groups, model) => {
      const provider = model.provider
      if (!groups[provider]) {
        groups[provider] = []
      }
      groups[provider].push(model)
      return groups
    },
    {} as Record<string, LLMModel[]>
  )
}

export function ModelSelectorButton() {
  const { modelId, kbId, setSettings } = useAgentStore()
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<LLMModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // 加载模型列表
  const loadModels = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getLLMModels()
      // 后端已过滤只返回已启用的模型
      setModels(response.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载模型失败")
    } finally {
      setLoading(false)
    }
  }

  // 对话框打开时加载模型
  useEffect(() => {
    if (open) {
      loadModels()
      setSearchQuery("")
    }
  }, [open])

  // 过滤和分组模型
  const filteredGroupedModels = useMemo(() => {
    const filtered = models.filter((model) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        model.model_name.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query)
      )
    })
    return groupModelsByProvider(filtered)
  }, [models, searchQuery])

  // 获取当前选中的模型
  const selectedModel = useMemo(() => {
    return models.find((m) => m.id === modelId)
  }, [models, modelId])

  // 处理模型选择
  const handleModelSelect = (model: LLMModel) => {
    setSettings({ modelId: model.id, kbId })
    setOpen(false)
  }

  // 清除模型选择（使用默认模型）
  const handleClearSelection = () => {
    setSettings({ modelId: undefined, kbId })
    setOpen(false)
  }

  const providerKeys = Object.keys(filteredGroupedModels)

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <Button
          variant="outline"
          className="h-9 rounded-full gap-1.5 px-3"
          title={selectedModel ? selectedModel.model_name : "选择模型"}
        >
          {selectedModel ? (
            <>
              <ModelSelectorLogo
                provider={getProviderLogo(selectedModel.provider)}
                className="size-4"
              />
              <span className="max-w-[100px] truncate text-sm">
                {selectedModel.model_name}
              </span>
            </>
          ) : (
            <>
              <Cpu size={16} />
              <span className="text-sm">模型</span>
            </>
          )}
        </Button>
      </ModelSelectorTrigger>

      <ModelSelectorContent title="选择模型" className="sm:max-w-md">
        <ModelSelectorInput
          placeholder="搜索模型..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <ModelSelectorList className="max-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={loadModels}>
                <RefreshCw size={14} className="mr-1" />
                重试
              </Button>
            </div>
          ) : providerKeys.length === 0 ? (
            <ModelSelectorEmpty>
              {searchQuery ? "未找到匹配的模型" : "暂无可用模型"}
            </ModelSelectorEmpty>
          ) : (
            <>
              {/* 默认模型选项 */}
              <ModelSelectorGroup heading="默认">
                <ModelSelectorItem
                  value="default"
                  onSelect={handleClearSelection}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Cpu size={12} className="text-muted-foreground" />
                    <ModelSelectorName>默认模型</ModelSelectorName>
                  </div>
                  {!modelId && <Check size={16} className="text-primary" />}
                </ModelSelectorItem>
              </ModelSelectorGroup>

              {/* 按 provider 分组的模型列表 */}
              {providerKeys.map((provider) => (
                <ModelSelectorGroup
                  key={provider}
                  heading={getProviderDisplayName(provider)}
                >
                  {filteredGroupedModels[provider].map((model) => (
                    <ModelSelectorItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => handleModelSelect(model)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <ModelSelectorLogo
                          provider={getProviderLogo(model.provider)}
                          className="size-4"
                        />
                        <ModelSelectorName>{model.model_name}</ModelSelectorName>
                      </div>
                      {modelId === model.id && (
                        <Check size={16} className="text-primary" />
                      )}
                    </ModelSelectorItem>
                  ))}
                </ModelSelectorGroup>
              ))}
            </>
          )}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
