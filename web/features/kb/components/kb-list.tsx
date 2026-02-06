"use client";

import {
  BookOpen,
  Folder,
  Globe,
  Loader2,
  Lock,
  MoreVertical,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { KnowledgeBase } from "../types";

export interface KBListProps {
  knowledgeBases: KnowledgeBase[];
  loading?: boolean;
  onDelete?: (kbId: string) => Promise<void>;
  onCreateClick?: () => void;
  className?: string;
  showSearch?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function KBList({
  knowledgeBases = [],
  loading = false,
  onDelete,
  onCreateClick,
  className,
  showSearch = true,
}: KBListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [kbToDelete, setKbToDelete] = useState<KnowledgeBase | null>(null);

  const filteredKBs = knowledgeBases.filter((kb) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      kb.name.toLowerCase().includes(query) ||
      kb.description?.toLowerCase().includes(query)
    );
  });

  const handleCardClick = (kbId: string) => {
    router.push(`/kb/${kbId}`);
  };

  const handleDeleteClick = (e: Event, kb: KnowledgeBase) => {
    e.stopPropagation();
    setKbToDelete(kb);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!kbToDelete || !onDelete) return;

    setActionLoading(kbToDelete.id);
    try {
      await onDelete(kbToDelete.id);
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setKbToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full shadow-xs", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("w-full shadow-xs", className)}>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col flex-wrap gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <CardTitle>知识库</CardTitle>
                <CardDescription>
                  共 {knowledgeBases.length} 个知识库
                </CardDescription>
              </div>
              {onCreateClick && (
                <Button
                  className="w-full shrink-0 md:w-auto"
                  type="button"
                  onClick={onCreateClick}
                >
                  <BookOpen className="size-4" />
                  新建知识库
                </Button>
              )}
            </div>
            {showSearch && knowledgeBases.length > 0 && (
              <InputGroup>
                <InputGroupAddon>
                  <Search className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  placeholder="搜索知识库..."
                  type="search"
                  value={searchQuery}
                />
              </InputGroup>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredKBs.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Folder className="size-6" />
                </EmptyMedia>
                <EmptyTitle>
                  {searchQuery ? "未找到匹配的知识库" : "暂无知识库"}
                </EmptyTitle>
                {!searchQuery && (
                  <EmptyDescription>
                    创建你的第一个知识库，开始管理文档
                  </EmptyDescription>
                )}
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredKBs.map((kb) => (
                <div
                  className="group flex cursor-pointer flex-col justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:shadow-sm"
                  key={kb.id}
                  onClick={() => handleCardClick(kb.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="size-5 text-primary" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h3 className="wrap-break-word font-semibold text-base leading-tight">
                          {kb.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-fit text-xs",
                            kb.visibility === "public"
                              ? "border-green-500/50 text-green-600"
                              : "border-gray-500/50 text-gray-600"
                          )}
                        >
                          {kb.visibility === "public" ? (
                            <>
                              <Globe className="mr-1 size-3" />
                              公开
                            </>
                          ) : (
                            <>
                              <Lock className="mr-1 size-3" />
                              私有
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`${kb.name} 的更多操作`}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {actionLoading === kb.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreVertical className="size-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        collisionPadding={8}
                        sideOffset={4}
                      >
                        <DropdownMenuItem
                          onSelect={() => handleCardClick(kb.id)}
                        >
                          <BookOpen className="size-4" />
                          查看详情
                        </DropdownMenuItem>
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(e) => handleDeleteClick(e, kb)}
                              variant="destructive"
                            >
                              <Trash2 className="size-4" />
                              删除
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {kb.description && (
                    <p className="wrap-break-word line-clamp-2 text-muted-foreground text-sm">
                      {kb.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>模型: {kb.embedding_model.split("/").pop()}</span>
                    <span>更新于 {formatDate(kb.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除知识库 &ldquo;{kbToDelete?.name}&rdquo; 吗？此操作将同时删除所有相关文档和向量数据，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
