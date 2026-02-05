"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/kb/components/app-sidebar";
import KbUpload from "@/features/kb/components/kb-upload";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex h-screen flex-col">
          <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="text-foreground">Project roadmap discussion</div>
          </header>
          <div className="mt-16"></div>
          <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
            <KbUpload
              importHistory={[
                {
                  id: "import-1",
                  filename: "user-data-backup.json",
                  format: "json",
                  status: "completed",
                  createdAt: new Date(),
                  completedAt: new Date(),
                  recordsImported: 1250,
                  recordsSkipped: 12,
                  recordsFailed: 3,
                  conflictResolution: "merge",
                },
              ]}
              // onUpload={async (file) => {
              //   /* upload and preview file */
              // }}
              // onImport={async (data) => {
              //   /* import data */
              // }}
            />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
