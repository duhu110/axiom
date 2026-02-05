import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/features/kit/components/app-sidebar"
import { ChatContent } from "@/features/kit/components/chat-content"
import { ChatSidebar } from "@/features/kit/components/chat-sidebar"


export default function Page() {
  return (
    <SidebarProvider>
      <ChatSidebar />
      <SidebarInset>
        <ChatContent />
      </SidebarInset>
    </SidebarProvider>
  )
}
