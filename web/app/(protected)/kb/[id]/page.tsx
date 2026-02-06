"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Lock, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/components/page-header";
import { useState } from "react";

import { useKB, useDeleteKB } from "@/features/kb/hooks/use-kb";
import { useDocuments, useDeleteDocument, useRetryDocument } from "@/features/kb/hooks/use-documents";
import { useDocumentUpload } from "@/features/kb/hooks/use-document-upload";
import DocumentUpload from "@/features/kb/components/document-upload";
import DocumentList from "@/features/kb/components/document-list";
import SearchTestPanel from "@/features/kb/components/search-test-panel";

interface KBDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function KBDetailPage({ params }: KBDetailPageProps) {
  const { id: kbId } = use(params);
  const router = useRouter();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 获取知识库详情
  const { kb, loading: kbLoading, error: kbError } = useKB(kbId);

  // 获取文档列表
  const {
    items: documents,
    loading: docsLoading,
    refetch: refetchDocs,
  } = useDocuments(kbId);

  // 上传文档
  const { uploadFiles, uploading, uploadingFiles } = useDocumentUpload(kbId);

  // 删除知识库
  const { deleteKB, loading: deleting } = useDeleteKB();

  // 删除文档
  const { deleteDocument } = useDeleteDocument();

  // 重试文档
  const { retryDocument } = useRetryDocument();

  const handleUpload = async (files: File[]) => {
    const results = await uploadFiles(files);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      toast.success(`成功上传 ${successCount} 个文件`);
      refetchDocs();
    }
    if (failCount > 0) {
      toast.error(`${failCount} 个文件上传失败`);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument(docId);
      toast.success("文档已删除");
      refetchDocs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除文档失败");
    }
  };

  const handleRetryDocument = async (docId: string) => {
    try {
      await retryDocument(docId);
      toast.success("已重新提交处理");
      refetchDocs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重试失败");
    }
  };

  const handleDeleteKB = async () => {
    try {
      await deleteKB(kbId);
      toast.success("知识库已删除");
      router.push("/kb");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除知识库失败");
    }
  };

  if (kbLoading) {
    return (
      <main className="flex min-h-screen flex-col">
        <PageHeader title="加载中..." />
        <div className="mt-16"></div>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (kbError || !kb) {
    return (
      <main className="flex min-h-screen flex-col">
        <PageHeader title="知识库" />
        <div className="mt-16"></div>
        <div className="mx-auto w-full max-w-5xl p-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            {kbError?.message || "知识库不存在或无权访问"}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => router.push("/kb")}>
              <ArrowLeft className="size-4" />
              返回列表
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title={kb.name} />
      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-12">
        {/* 头部信息 */}
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/kb")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{kb.name}</h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
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
              {kb.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {kb.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>模型: {kb.embedding_model.split("/").pop()}</span>
                <span>分块大小: {kb.chunk_size}</span>
                <span>重叠: {kb.chunk_overlap}</span>
              </div>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="size-4" />
            删除知识库
          </Button>
        </div>

        {/* 文档上传 */}
        <DocumentUpload
          onUpload={handleUpload}
          uploading={uploading}
          uploadingFiles={uploadingFiles}
        />

        {/* 文档列表 */}
        <DocumentList
          documents={documents}
          loading={docsLoading}
          onDelete={handleDeleteDocument}
          onRetry={handleRetryDocument}
        />

        {/* 检索测试 */}
        <SearchTestPanel kbId={kbId} />
      </div>

      {/* 删除知识库确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除知识库 &ldquo;{kb.name}&rdquo; 吗？此操作将同时删除所有相关文档和向量数据，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKB}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
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
    </main>
  );
}
