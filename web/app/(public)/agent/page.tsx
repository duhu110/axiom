import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ChatContent } from "@/features/agent/components/chat-content"
import { ChatSidebar } from "@/features/agent/components/chat-sidebar"


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
