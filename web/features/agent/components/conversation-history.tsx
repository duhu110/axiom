"use client"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: number
}

export interface ConversationGroup {
  period: string
  conversations: Conversation[]
}

interface ConversationHistoryProps {
  history: ConversationGroup[]
  onSelect?: (conversationId: string) => void
}

export function ConversationHistory({ history, onSelect }: ConversationHistoryProps) {
  return (
    <>
      {history.map((group) => (
        <SidebarGroup key={group.period}>
          <SidebarGroupLabel>{group.period}</SidebarGroupLabel>
          <SidebarMenu>
            {group.conversations.map((conversation) => (
              <SidebarMenuButton
                key={conversation.id}
                onClick={() => onSelect?.(conversation.id)}
              >
                <span>{conversation.title}</span>
              </SidebarMenuButton>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
