"use client";

import KbList from "@/features/kb/components/kb-list";
import { PageHeader } from "@/components/page-header";

// Static date for mock data (avoid hydration mismatch)
const MOCK_DATE = new Date("2026-02-05T00:00:00Z");

export default function Page() {
  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <PageHeader title="Project roadmap discussion" />
      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <KbList
          projects={[
            {
              id: "project-1",
              name: "Website Redesign",
              description: "Complete redesign of company website",
              color: "#3b82f6",
              members: [
                {
                  id: "user-1",
                  name: "Alice",
                  avatar:
                    "https://api.dicebear.com/9.x/glass/svg?seed=alice",
                },
              ],
              defaultModel: "gpt-4",
              aiUsage: {
                tokens: 250000,
                sessions: 89,
              },
              createdAt: MOCK_DATE,
              updatedAt: MOCK_DATE,
            },
          ]}
          currentUserId="user-1"
          onCreate={async (data) => {
            /* create project */
            return {
              id: "project-new",
              name: data.name,
              description: data.description,
              color: data.color || "#3b82f6",
              members: [],
              defaultModel: data.defaultModel,
              createdAt: MOCK_DATE,
              updatedAt: MOCK_DATE,
            };
          }}
          onUpdate={async () => {
            /* update project */
          }}
          onDelete={async () => {
            /* delete project */
          }}
          onSelect={() => {
            /* select project */
          }}
        />
      </div>
    </main>
  );
}
