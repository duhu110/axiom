"use client"

import * as React from "react"
import { CirclePlus, type LucideIcon } from "lucide-react"
import { LogoIcon } from "@/components/logo"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NavProjects } from "@/features/kb/components/nav-projects"
import {
  ConversationHistory,
  type ConversationGroup,
} from "@/features/agent/components/conversation-history"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

export interface ProjectItem {
  name: string
  url: string
  icon: LucideIcon
}

export interface UserData {
  name: string
  email: string
  avatar: string
}

interface UnifiedSidebarProps extends Omit<React.ComponentProps<typeof Sidebar>, "variant"> {
  variant: "agent" | "app"
  user: UserData
  navSecondaryItems: NavItem[]
  // agent mode
  conversationHistory?: ConversationGroup[]
  onQuickCreate?: () => void
  onConversationSelect?: (conversationId: string) => void
  // app mode
  projects?: ProjectItem[]
}

export function UnifiedSidebar({
  variant,
  user,
  navSecondaryItems,
  conversationHistory,
  onQuickCreate,
  onConversationSelect,
  projects,
  ...props
}: UnifiedSidebarProps) {
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
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
        <Separator />
        {variant === "agent" && (
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                tooltip="Quick Create"
                onClick={onQuickCreate}
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              >
                <CirclePlus />
                <span>Quick Create</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent className={variant === "agent" ? "pt-4" : ""}>
        {variant === "agent" && conversationHistory && (
          <ConversationHistory
            history={conversationHistory}
            onSelect={onConversationSelect}
          />
        )}
        {variant === "app" && projects && <NavProjects projects={projects} />}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
