"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { 
  LifeBuoy, 
  Sparkles, 
  BookCopy, 
  Database,
  LibraryBig,
} from "lucide-react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { UnifiedSidebar } from "@/components/unified-sidebar"
import type { ConversationGroup } from "@/features/agent/components/conversation-history"

/*
 * ============================================================
 * 路由保护 (Route Protection) - 已启用
 * ============================================================
 * 
 * 路由保护逻辑会检查用户是否已登录（通过 accessExpiresAt），
 * 如果未登录则重定向到 /login 页面。
 * ============================================================
 */

// Navigation items for agent mode
const agentNavSecondary = [
  { title: "首页", url: "/", icon: LifeBuoy },
  { title: "知识库", url: "/kb", icon: BookCopy },
  { title: "数据库", url: "/db", icon: Database },
]

// Navigation items for home page
const homeNavSecondary = [
  { title: "智能体", url: "/agent", icon: Sparkles },
  { title: "知识库", url: "/kb", icon: BookCopy },
  { title: "数据库", url: "/db", icon: Database },
]

// Navigation items for kb pages
const kbNavSecondary = [
  { title: "首页", url: "/", icon: LifeBuoy },
  { title: "智能体", url: "/agent", icon: Sparkles },
  { title: "数据库", url: "/db", icon: Database },
]

// Projects for app mode (知识库模式)
const projects = [
  { name: "知识库", url: "/kb", icon: LibraryBig },
]

// Static timestamps for mock data (avoid hydration mismatch from Date.now())

// Conversation history for agent mode
const conversationHistory: ConversationGroup[] = [
  {
    period: "Today",
    conversations: [
      {
        id: "t1",
        title: "Project roadmap discussion",
        lastMessage: "Let's prioritize the authentication features for the next sprint.",
        timestamp: 1738713600000, // Static timestamp
      },
      {
        id: "t2",
        title: "API Documentation Review",
        lastMessage: "The endpoint descriptions need more detail about rate limiting.",
        timestamp: 1738702800000,
      },
      {
        id: "t3",
        title: "Frontend Bug Analysis",
        lastMessage: "I found the issue - we need to handle the null state in the user profile component.",
        timestamp: 1738692000000,
      },
      {
        id: "t4",
        title: "Project roadmap discussion",
        lastMessage: "Let's prioritize the authentication features for the next sprint.",
        timestamp: 1738713600000,
      },
      {
        id: "t5",
        title: "API Documentation Review",
        lastMessage: "The endpoint descriptions need more detail about rate limiting.",
        timestamp: 1738702800000,
      },
      {
        id: "t6",
        title: "Frontend Bug Analysis",
        lastMessage: "I found the issue - we need to handle the null state in the user profile component.",
        timestamp: 1738692000000,
      },
    ],
  },
  {
    period: "Yesterday",
    conversations: [
      {
        id: "y1",
        title: "Database Schema Design",
        lastMessage: "Let's add indexes to improve query performance on these tables.",
        timestamp: 1738627200000,
      },
      {
        id: "y2",
        title: "Performance Optimization",
        lastMessage: "The lazy loading implementation reduced initial load time by 40%.",
        timestamp: 1738627200000,
      },
    ],
  },
  {
    period: "Last 7 days",
    conversations: [
      {
        id: "w1",
        title: "Authentication Flow",
        lastMessage: "We should implement the OAuth2 flow with refresh tokens.",
        timestamp: 1738454400000,
      },
      {
        id: "w2",
        title: "Component Library",
        lastMessage: "These new UI components follow the design system guidelines perfectly.",
        timestamp: 1738281600000,
      },
      {
        id: "w3",
        title: "UI/UX Feedback",
        lastMessage: "The navigation redesign received positive feedback from the test group.",
        timestamp: 1738195200000,
      },
      {
        id: "w4",
        title: "Authentication Flow",
        lastMessage: "We should implement the OAuth2 flow with refresh tokens.",
        timestamp: 1738454400000,
      },
      {
        id: "w5",
        title: "Component Library",
        lastMessage: "These new UI components follow the design system guidelines perfectly.",
        timestamp: 1738281600000,
      },
      {
        id: "w6",
        title: "UI/UX Feedback",
        lastMessage: "The navigation redesign received positive feedback from the test group.",
        timestamp: 1738195200000,
      },
      {
        id: "w7",
        title: "Authentication Flow",
        lastMessage: "We should implement the OAuth2 flow with refresh tokens.",
        timestamp: 1738454400000,
      },
      {
        id: "w8",
        title: "Component Library",
        lastMessage: "These new UI components follow the design system guidelines perfectly.",
        timestamp: 1738281600000,
      },
      {
        id: "w9",
        title: "UI/UX Feedback",
        lastMessage: "The navigation redesign received positive feedback from the test group.",
        timestamp: 1738195200000,
      },
      {
        id: "w10",
        title: "Authentication Flow",
        lastMessage: "We should implement the OAuth2 flow with refresh tokens.",
        timestamp: 1738454400000,
      },
      {
        id: "w11",
        title: "Component Library",
        lastMessage: "These new UI components follow the design system guidelines perfectly.",
        timestamp: 1738281600000,
      },
      {
        id: "w12",
        title: "UI/UX Feedback",
        lastMessage: "The navigation redesign received positive feedback from the test group.",
        timestamp: 1738195200000,
      },
    ],
  },
  {
    period: "Last month",
    conversations: [
      {
        id: "m1",
        title: "Initial Project Setup",
        lastMessage: "All the development environments are now configured consistently.",
        timestamp: 1737417600000,
      },
    ],
  },
]

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, accessExpiresAt, _hasHydrated } = useAuthStore()

  // 路由保护：hydration 完成后，如果未登录则重定向到登录页
  useEffect(() => {
    if (_hasHydrated && !accessExpiresAt) {
      router.push('/login')
    }
  }, [_hasHydrated, accessExpiresAt, router])

  // 等待 hydration 完成
  if (!_hasHydrated) {
    return null
  }

  // hydration 完成后，如果未登录，显示空白状态（等待重定向）
  if (!accessExpiresAt) {
    return null
  }

  // 构建用户数据（用于侧边栏显示）
  const userData = {
    name: user?.name || user?.phone || '用户',
    email: user?.phone || '',
    avatar: user?.avatar || '',
  }

  const isAgentPage = pathname.startsWith("/agent")
  const isKbPage = pathname.startsWith("/kb")
  const isHomePage = pathname === "/"
  const sidebarVariant = isAgentPage ? "agent" : "app"

  // 根据页面类型选择导航项
  const getNavSecondary = () => {
    if (isAgentPage) return agentNavSecondary
    if (isHomePage) return homeNavSecondary
    if (isKbPage) return kbNavSecondary
    return homeNavSecondary // 默认使用首页导航
  }

  return (
    <SidebarProvider>
      <UnifiedSidebar
        variant={sidebarVariant}
        user={userData}
        navSecondaryItems={getNavSecondary()}
        conversationHistory={isAgentPage ? conversationHistory : undefined}
        projects={isKbPage ? projects : undefined}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
