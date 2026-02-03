"use client"

import * as React from "react"
import {
  Archive,
  GalleryVerticalEnd,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// --- Types & Helpers ---

export interface Conversation {
  id: string
  title: string
  lastMessage?: string
  lastMessageAt?: Date
  messageCount?: number
  isArchived?: boolean
  isActive?: boolean
}

function formatDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const thisWeek = new Date(today)
  thisWeek.setDate(thisWeek.getDate() - 7)

  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )

  if (dateOnly.getTime() === today.getTime()) {
    return "Today"
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday"
  }
  if (dateOnly.getTime() >= thisWeek.getTime()) {
    return "This Week"
  }

  const month = date.toLocaleString("en-US", { month: "short" })
  const day = date.getDate()
  const year = date.getFullYear()
  const currentYear = now.getFullYear()

  if (year === currentYear) {
    return `${month} ${day}`
  }
  return `${month} ${day}, ${year}`
}

function groupConversationsByDate(conversations: Conversation[]): {
  label: string
  conversations: Conversation[]
}[] {
  const groups: Record<string, Conversation[]> = {}

  conversations.forEach((conv) => {
    if (!conv.lastMessageAt) {
      if (!groups["Older"]) {
        groups["Older"] = []
      }
      groups["Older"].push(conv)
      return
    }

    const label = formatDate(conv.lastMessageAt)
    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(conv)
  })

  const orderedLabels = ["Today", "Yesterday", "This Week"]
  const result: { label: string; conversations: Conversation[] }[] = []

  orderedLabels.forEach((label) => {
    if (groups[label]) {
      result.push({ label, conversations: groups[label] })
      delete groups[label]
    }
  })

  Object.keys(groups)
    .sort()
    .forEach((label) => {
      result.push({ label, conversations: groups[label] })
    })

  if (groups["Older"]) {
    result.push({ label: "Older", conversations: groups["Older"] })
  }

  return result
}

// --- Mock Data ---

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    title: "Project Architecture Discussion",
    lastMessage: "Let's review the system design for the new module.",
    lastMessageAt: new Date(),
    messageCount: 12,
  },
  {
    id: "2",
    title: "React Component Refactoring",
    lastMessage: "I suggest breaking down the sidebar into smaller components.",
    lastMessageAt: new Date(),
    messageCount: 5,
  },
  {
    id: "3",
    title: "Bug Fix: Authentication Flow",
    lastMessage: "The token expiration issue is resolved now.",
    lastMessageAt: new Date(Date.now() - 86400000), // Yesterday
    messageCount: 8,
  },
  {
    id: "4",
    title: "UI/UX Design Review",
    lastMessage: "The color palette needs some adjustments for better contrast.",
    lastMessageAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
    messageCount: 20,
  },
  {
    id: "5",
    title: "Database Schema Optimization",
    lastMessage: "We should add an index on the user_id column.",
    lastMessageAt: new Date(Date.now() - 86400000 * 10), // 10 days ago
    messageCount: 3,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [conversations, setConversations] = React.useState<Conversation[]>(MOCK_CONVERSATIONS)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeConversationId, setActiveConversationId] = React.useState<string>("1")
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  // Filter conversations
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase().trim()
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.lastMessage?.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  // Group conversations
  const groupedConversations = React.useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations]
  )

  const handleNewChat = () => {
    const newChat: Conversation = {
      id: Date.now().toString(),
      title: "New Conversation",
      lastMessage: "Start a new chat...",
      lastMessageAt: new Date(),
      messageCount: 0,
    }
    setConversations([newChat, ...conversations])
    setActiveConversationId(newChat.id)
  }

  const handleDeleteConversation = () => {
    if (deleteId) {
      setConversations(conversations.filter((c) => c.id !== deleteId))
      setDeleteId(null)
      if (activeConversationId === deleteId) {
        setActiveConversationId("")
      }
    }
  }

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">聊天记录</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <div className="flex w-full items-center gap-2 px-2 py-1">
                <SidebarInput 
                  placeholder="Search chats..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                />
                <button 
                  onClick={handleNewChat}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-background text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <Plus className="size-4" />
                    <span className="sr-only">New Chat</span>
                </button>
             </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groupedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
            <MessageSquare className="size-8 opacity-50" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          groupedConversations.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.conversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        isActive={activeConversationId === conversation.id}
                        onClick={() => setActiveConversationId(conversation.id)}
                        className="h-auto flex-col items-start gap-1 py-3"
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                            <span className="font-medium truncate">{conversation.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                                {conversation.lastMessageAt && formatDate(conversation.lastMessageAt)}
                            </span>
                        </div>
                        {conversation.lastMessage && (
                            <span className="line-clamp-2 w-full text-xs text-muted-foreground">
                                {conversation.lastMessage}
                            </span>
                        )}
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction showOnHover>
                            <MoreVertical />
                            <span className="sr-only">More</span>
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48" side="right" align="start">
                          <DropdownMenuItem>
                            <Pencil className="mr-2 size-4" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="mr-2 size-4" />
                            <span>Archive</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(conversation.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
      
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}
