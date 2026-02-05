"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/kb/components/app-sidebar";
import KbList from "@/features/kb/components/kb-list";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex h-screen flex-col overflow-hidden">
          <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="text-foreground">Project roadmap discussion</div>
          </header>
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
                  createdAt: new Date(),
                  updatedAt: new Date(),
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
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
              }}
              onUpdate={async (projectId, data) => {
                /* update project */
              }}
              onDelete={async (projectId) => {
                /* delete project */
              }}
              onSelect={(projectId) => {
                /* select project */
              }}
            />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
