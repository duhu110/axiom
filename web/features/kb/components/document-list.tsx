"use client";

import { useState } from "react";
import {
  FileText,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

import type { KBDocument, DocumentStatus } from "../types";
import { formatFileSize, getFileTypeLabel, getStatusConfig } from "../constants";

export interface DocumentListProps {
  documents: KBDocument[];
  loading?: boolean;
  onDelete?: (docId: string) => Promise<void>;
  onRetry?: (docId: string) => Promise<void>;
  className?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusIcon({ status }: { status: DocumentStatus }) {
  switch (status) {
    case "processing":
      return <Clock className="size-4 animate-pulse text-blue-500" />;
    case "indexed":
      return <CheckCircle className="size-4 text-green-500" />;
    case "failed":
      return <AlertCircle className="size-4 text-red-500" />;
    default:
      return null;
  }
}

export default function DocumentList({
  documents = [],
  loading = false,
  onDelete,
  onRetry,
  className,
}: DocumentListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<KBDocument | null>(null);

  const handleDeleteClick = (doc: KBDocument) => {
    setDocToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete || !onDelete) return;

    setActionLoading(docToDelete.id);
    try {
      await onDelete(docToDelete.id);
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    }
  };

  const handleRetry = async (doc: KBDocument) => {
    if (!onRetry) return;

    setActionLoading(doc.id);
    try {
      await onRetry(doc.id);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>文档列表</CardTitle>
          <CardDescription>
            共 {documents.length} 个文档
            {documents.filter((d) => d.status === "processing").length > 0 && (
              <span className="ml-2 text-blue-500">
                ({documents.filter((d) => d.status === "processing").length} 个处理中)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText className="size-6" />
                </EmptyMedia>
                <EmptyTitle>暂无文档</EmptyTitle>
                <EmptyDescription>
                  上传文档开始构建知识库
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文档名称</TableHead>
                    <TableHead className="w-[100px]">类型</TableHead>
                    <TableHead className="w-[100px]">大小</TableHead>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead className="w-[100px]">分块数</TableHead>
                    <TableHead className="w-[150px]">创建时间</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const statusConfig = getStatusConfig(doc.status);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">
                              {doc.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {getFileTypeLabel(doc.file_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <StatusIcon status={doc.status} />
                                  <Badge
                                    variant={statusConfig.variant}
                                    className={cn("text-xs", statusConfig.className)}
                                  >
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              {doc.error_msg && (
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs">{doc.error_msg}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.status === "indexed" ? doc.chunk_count : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(doc.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={actionLoading === doc.id}
                              >
                                {actionLoading === doc.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="size-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(doc.status === "failed" || doc.status === "processing") && onRetry && (
                                <>
                                  <DropdownMenuItem
                                    onSelect={() => handleRetry(doc)}
                                  >
                                    <RefreshCw className="size-4" />
                                    {doc.status === "failed" ? "重试处理" : "重新处理"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {onDelete && (
                                <DropdownMenuItem
                                  onSelect={() => handleDeleteClick(doc)}
                                  variant="destructive"
                                >
                                  <Trash2 className="size-4" />
                                  删除
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除文档 &ldquo;{docToDelete?.title}&rdquo; 吗？此操作将同时删除相关的向量数据，且无法恢复。
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
