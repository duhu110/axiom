"use client";

import { useState } from "react";
import { Search, Loader2, X, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

import { useSearchTest } from "../hooks/use-search-test";
import { DEFAULT_SEARCH_TOP_K, MAX_SEARCH_TOP_K } from "../constants";

export interface SearchTestPanelProps {
  kbId: string;
  className?: string;
}

export default function SearchTestPanel({
  kbId,
  className,
}: SearchTestPanelProps) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(DEFAULT_SEARCH_TOP_K);
  const [scoreThreshold, setScoreThreshold] = useState<number | undefined>(
    undefined
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(
    new Set()
  );

  const { search, loading, results, hasResults, clearResults } =
    useSearchTest(kbId);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("请输入查询内容");
      return;
    }

    try {
      await search(query, topK, scoreThreshold);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "检索失败");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      handleSearch();
    }
  };

  const toggleResult = (index: number) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleClear = () => {
    setQuery("");
    clearResults();
    setExpandedResults(new Set());
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>检索测试</CardTitle>
        <CardDescription>测试知识库的向量检索效果</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索框 */}
        <div className="flex gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="输入查询内容..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </InputGroup>
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            搜索
          </Button>
        </div>

        {/* 高级选项 */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              {showAdvanced ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              高级选项
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>返回结果数量</Label>
                <span className="text-sm text-muted-foreground">{topK}</span>
              </div>
              <Slider
                value={[topK]}
                onValueChange={([value]) => setTopK(value)}
                min={1}
                max={MAX_SEARCH_TOP_K}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>相似度阈值</Label>
                <span className="text-sm text-muted-foreground">
                  {scoreThreshold !== undefined
                    ? scoreThreshold.toFixed(2)
                    : "不限"}
                </span>
              </div>
              <Slider
                value={[scoreThreshold ?? 0]}
                onValueChange={([value]) =>
                  setScoreThreshold(value === 0 ? undefined : value)
                }
                min={0}
                max={1}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground">
                设为 0 表示不限制相似度
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 搜索结果 */}
        {hasResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                搜索结果 ({results.length})
              </h4>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                清除结果
              </Button>
            </div>
            <div className="space-y-2">
              {results.map((result, index) => {
                const isExpanded = expandedResults.has(index);
                const content = result.content;
                const shouldTruncate = content.length > 200;
                const displayContent =
                  shouldTruncate && !isExpanded
                    ? content.slice(0, 200) + "..."
                    : content;

                return (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <Badge variant="outline" className="font-mono text-xs">
                          相似度: {(result.score * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      {result.metadata?.doc_id ? (
                        <span className="text-xs text-muted-foreground">
                          文档ID: {String(result.metadata.doc_id).slice(0, 8)}...
                        </span>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {displayContent}
                    </p>
                    {shouldTruncate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => toggleResult(index)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="size-4" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-4" />
                            展开
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!hasResults && !loading && query && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search className="size-6" />
              </EmptyMedia>
              <EmptyTitle>未找到相关结果</EmptyTitle>
              <EmptyDescription>
                尝试使用不同的关键词或调整搜索参数
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
