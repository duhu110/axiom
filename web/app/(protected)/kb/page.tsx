"use client";

import { useState } from "react";
import { toast } from "sonner";
import KBList from "@/features/kb/components/kb-list";
import KBCreateDialog from "@/features/kb/components/kb-create-dialog";
import { PageHeader } from "@/components/page-header";
import { useKBList, useCreateKB, useDeleteKB } from "@/features/kb/hooks/use-kb";
import type { KBCreateRequest } from "@/features/kb/types";

export default function KBListPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { items, loading, error, refetch } = useKBList();
  const { create, loading: creating } = useCreateKB();
  const { deleteKB } = useDeleteKB();

  const handleCreate = async (data: KBCreateRequest) => {
    try {
      await create(data);
      toast.success("知识库创建成功");
      setCreateDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建知识库失败");
      throw err;
    }
  };

  const handleDelete = async (kbId: string) => {
    try {
      await deleteKB(kbId);
      toast.success("知识库已删除");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除知识库失败");
      throw err;
    }
  };

  if (error) {
    return (
      <main className="flex min-h-screen flex-col">
        <PageHeader title="知识库" />
        <div className="mt-16"></div>
        <div className="mx-auto w-full max-w-5xl p-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            加载失败: {error.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="知识库" />
      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pb-12">
        <KBList
          knowledgeBases={items}
          loading={loading}
          onDelete={handleDelete}
          onCreateClick={() => setCreateDialogOpen(true)}
        />
      </div>

      <KBCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        loading={creating}
      />
    </main>
  );
}
