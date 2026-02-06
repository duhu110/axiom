"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
} from "lucide-react"
import type { UsageItem } from "@/components/billingsdk/usage-table"
import { useAuthStore } from "@/stores/auth-store"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { UsageTable } from "@/components/billingsdk/usage-table"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { setTheme, resolvedTheme } = useTheme()
  const [billingDialogOpen, setBillingDialogOpen] = React.useState(false)
  const userDropdownId = "sidebar-user-dropdown"
  const { setUnauthenticated } = useAuthStore()

  // 获取用户名首字母作为头像fallback
  const getInitials = (name: string) => {
    if (!name) return 'U'
    // 如果是手机号，取后两位
    if (/^\d+$/.test(name)) {
      return name.slice(-2)
    }
    // 否则取首字母
    return name.charAt(0).toUpperCase()
  }

  // 登出处理
  const handleLogout = () => {
    setUnauthenticated()
    router.push('/login')
  }

  // Usage history data
  const usageHistory: UsageItem[] = [
    {
      model: 'gpt-5',
      inputWithCache: 0,
      inputWithoutCache: 518131,
      cacheRead: 1646080,
      output: 103271,
      totalTokens: 2267482,
    },
    {
      model: 'claude-3.5-sonnet',
      inputWithCache: 176177,
      inputWithoutCache: 28413,
      cacheRead: 434612,
      output: 8326,
      totalTokens: 647528,
      costToYou: 1.00
    },
    {
      model: 'gemini-2.0-flash-exp',
      inputWithCache: 176100,
      inputWithoutCache: 28432,
      cacheRead: 434612,
      output: 8326,
      totalTokens: 647528,
      apiCost: 1,
      costToYou: 0
    },
    {
      model: 'gemini-2.5-pro',
      inputWithCache: 176177,
      inputWithoutCache: 28413,
      cacheRead: 434612,
      output: 7000,
      totalTokens: 647528,
      apiCost: 1,
      costToYou: 0
    },
    {
      model: 'claude-4-sonnet',
      inputWithCache: 68415,
      inputWithoutCache: 902,
      cacheRead: 864450,
      output: 12769,
      totalTokens: 946536,
      apiCost: 0.71,
      costToYou: 0.71
    },
    {
      model: 'claude-3.7-sonnet',
      inputWithCache: 68415,
      inputWithoutCache: 902,
      cacheRead: 864450,
      output: 12769,
      totalTokens: 946536,
      apiCost: 0.71,
    },
    {
      model: 'auto',
      inputWithCache: 84551,
      inputWithoutCache: 0,
      cacheRead: 284876,
      output: 9458,
      totalTokens: 378885,
      apiCost: 0.23,
      costToYou: 0
    },
    {
      model: 'sonic',
      inputWithCache: 0,
      inputWithoutCache: 149484,
      cacheRead: 4354855,
      output: 23569,
      totalTokens: 4527908,
      costToYou: 2
    }
  ]

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                id={userDropdownId}
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <BadgeCheck />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBillingDialogOpen(true)}>
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                <div className="flex size-6 items-center justify-center">
                  <Sun className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </div>
                <span className="ml-2">Toggle theme</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Billing Dialog */}
      <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Usage Summary</DialogTitle>
            <DialogDescription>
              Per-model LLM usage with token counts, cache reads, and API cost.
            </DialogDescription>
          </DialogHeader>
          <UsageTable
            usageHistory={usageHistory}
            showTotal={true}
            showExport={false}
            className="border-0 shadow-none"
            contentClassName="px-0"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
