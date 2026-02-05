import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { ChartAreaInteractive } from "@/features/dashboard/components/chart-area-interactive";
import { DataTable } from "@/features/dashboard/components/data-table";
import { SectionCards } from "@/features/dashboard/components/section-cards";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

import data from "./data.json";

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
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards />
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive />
                </div>
                <DataTable data={data} />
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
