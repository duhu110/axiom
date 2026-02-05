"use client";

import * as React from "react";
import { LifeBuoy, Send, Frame, PieChart, Map } from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { NavProjects } from "@/features/kb/components/nav-projects";
import { NavSecondary } from "@/features/kb/components/nav-secondary";
import { NavUser } from "@/features/kb/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navSecondary: [
    {
      title: "首页",
      url: "/dashboard",
      icon: LifeBuoy,
    },
    {
      title: "智能体",
      url: "/agent",
      icon: LifeBuoy,
    },
    {
      title: "数据库",
      url: "/db",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "知识库列表",
      url: "/kb",
      icon: Map,
    },
    {
      name: "新增知识库",
      url: "/kb/new",
      icon: Frame,
    },
    {
      name: "上传文件",
      url: "/kb/upload",
      icon: PieChart,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <LogoIcon className="size-5" />
                <span className="text-base font-semibold">Axiom</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
        <Separator />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
