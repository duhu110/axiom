"use client";

import KbUpload from "@/features/kb/components/kb-upload";
import { PageHeader } from "@/components/page-header";

// Static date for mock data (avoid hydration mismatch)
const MOCK_DATE = new Date("2026-02-05T00:00:00Z");

export default function Page() {
  return (
    <main className="flex h-screen flex-col">
      <PageHeader title="Project roadmap discussion" />
      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
        <KbUpload
          importHistory={[
            {
              id: "import-1",
              filename: "user-data-backup.json",
              format: "json",
              status: "completed",
              createdAt: MOCK_DATE,
              completedAt: MOCK_DATE,
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
  );
}
