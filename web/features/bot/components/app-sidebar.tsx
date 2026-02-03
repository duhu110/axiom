"use client"

import * as React from "react"
import { CirclePlus } from "lucide-react"
import { LogoIcon } from "@/features/bot/components/logo"
import { NavUser } from "@/features/bot/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar"

import { mockUser } from "@/app/(public)/bot/mock-data"

import ChatHistory from "@/features/bot/components/chat-history"
import { SearchForm } from "@/features/bot/components/search-form"

import { SidebarTrigger } from "@/components/ui/sidebar"
import type { Conversation } from "@/features/bot/types"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onRename?: (conversationId: string, newTitle: string) => Promise<void>;
  onDelete?: (conversationId: string) => Promise<void>;
  onArchive?: (conversationId: string) => Promise<void>;
  onUnarchive?: (conversationId: string) => Promise<void>;
}

export function AppSidebar({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  onRename,
  onDelete,
  onArchive,
  onUnarchive,
  ...props
}: AppSidebarProps) {
  const { state } = useSidebar()

  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <SidebarTrigger className="-ml-1" />
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
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              onClick={onNewConversation}
            >
              <CirclePlus />
              <span>Quick Create</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {state === "expanded" && <SearchForm />}
      </SidebarHeader>
      <SidebarContent>
        {state === "expanded" && (
          <ChatHistory
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={onConversationSelect}
            onNewConversation={onNewConversation}
            onRename={onRename}
            onDelete={onDelete}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={mockUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
