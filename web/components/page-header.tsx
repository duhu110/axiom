"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

interface PageHeaderProps {
  title?: string
  children?: React.ReactNode
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      {children ?? <div className="text-foreground">{title}</div>}
    </header>
  )
}
