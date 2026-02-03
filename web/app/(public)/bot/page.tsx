import { AppSidebar } from "@/features/bot/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Header } from "@/features/bot/components/header"
import ChatInput from "@/features/bot/components/chat-input"
import MessageArea from "@/features/bot/components/message-area"

export default function Page() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <div className="bottom-6 mt-auto flex justify-center w-full pb-20">
                    <div className="w-full md:w-2/3 lg:w-3/4 px-3 py-2">
                        <MessageArea />
                    </div>
                </div>
                <div className="sticky bottom-6 mt-auto flex justify-center w-full">
                    <div className="w-full md:w-2/3 lg:w-3/4 bg-background/80 backdrop-blur rounded-xl px-3 py-2">
                        <ChatInput />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
