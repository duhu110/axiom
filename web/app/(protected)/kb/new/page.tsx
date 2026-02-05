"use client";

import KbNew from "@/features/kb/components/kb-new";
import { PageHeader } from "@/components/page-header";

export default function Page() {
  return (
    <main className="flex h-screen flex-col">
      <PageHeader title="Project roadmap discussion" />
      <div className="mt-16"></div>
      <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
        <KbNew
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
    </main>
  );
}
