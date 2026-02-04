"use client";

import { NotFoundPage } from "@/components/not-found";
import { FeatureSection } from "@/features/knowledgebase/components/feature-section";
import { Header } from "@/features/knowledgebase/components/header";
import { Footer } from "@/features/knowledgebase/components/footer";
import { LogoCloud } from "@/features/knowledgebase/components/logo-cloud";
import ProjectsSection from "@/features/knowledgebase/components/projects-section";
import FilesSection from "@/features/knowledgebase/components/files-section";
import ImportSection from "@/features/knowledgebase/components/import-section";
import CreateSection from "@/features/knowledgebase/components/create-section";

export default function Page() {

  return (
    <>
      <Header />
      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <ProjectsSection
          projects={[
            {
              id: "project-1",
              name: "Website Redesign",
              description: "Complete redesign of company website",
              color: "#3b82f6",
              members: [
                { id: "user-1", name: "Alice", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=alice" },
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
      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <CreateSection
          availableAssignees={[
            { id: "user-1", name: "Sarah Chen" },
            { id: "user-2", name: "Marcus Rodriguez" },
            { id: "user-3", name: "Emily Watson" },
            { id: "user-4", name: "David Kim" },
          ]}
          availableProjects={[
            { id: "project-1", name: "Q4 Website Redesign" },
            { id: "project-2", name: "Mobile App v2.0" },
            { id: "project-3", name: "Payment System Integration" },
          ]}
          // onCreate={async (data) => {
          //   // Create task in your database
          //   const newTask = await createTask({
          //     title: data.title,
          //     description: data.description,
          //     status: data.status,
          //     priority: data.priority,
          //     assigneeIds: data.assigneeIds,
          //     projectId: data.projectId,
          //     dueDate: data.dueDate,
          //     tags: data.tags,
          //   });

          //   // Return the created task with generated ID
          //   return {
          //     id: newTask.id,
          //     title: newTask.title,
          //     description: newTask.description,
          //     status: newTask.status,
          //     priority: newTask.priority,
          //     assignees: newTask.assignees,
          //     tags: newTask.tags,
          //     dueDate: newTask.dueDate,
          //     createdAt: newTask.createdAt,
          //     updatedAt: newTask.updatedAt,
          //   };
          // }}
          // onCancel={() => {
          //   // Close modal or navigate back
          //   setIsCreateModalOpen(false);
          //   router.back();
          // }}
        />
      </div>
      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <ImportSection
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

      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <FilesSection
          files={[
            {
              id: "file-1",
              name: "project-plan.pdf",
              type: "application/pdf",
              size: 2.5 * 1024 * 1024,
              uploadedBy: {
                id: "user-1",
                name: "Alice",
                avatar: "https://api.dicebear.com/9.x/glass/svg?seed=alice",
              },
              uploadedAt: new Date(),
              tags: ["planning", "project"],
              aiAccessible: true,
            },
          ]}
          onUpload={async (files) => {
            /* upload files */
          }}
          onDelete={async (fileId) => {
            /* delete file */
          }}
          onDownload={async (fileId) => {
            /* download file */
          }}
          onToggleAIAccess={async (fileId, enabled) => {
            /* toggle AI access */
          }}
        />
      </div>
      <div className="mt-16"></div>
      <FeatureSection />
      <div className="mt-16"></div>
      <section className="relative mx-auto max-w-3xl">
        <h2 className="mb-5 text-center font-medium text-foreground text-xl tracking-tight md:text-3xl">
          <span className="text-muted-foreground">Trusted by experts.</span>
          <br />
          <span className="font-semibold">Used by the leaders.</span>
        </h2>
        <div className="mask-[linear-gradient(to_right,transparent,black,transparent)] mx-auto my-5 h-px max-w-sm bg-border" />
        <LogoCloud />
        <div className="mask-[linear-gradient(to_right,transparent,black,transparent)] mt-5 h-px bg-border" />
      </section>
      <div className="mt-16"></div>
      <Footer />
    </>
  );

}