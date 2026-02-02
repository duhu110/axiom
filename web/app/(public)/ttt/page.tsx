"use client";
import { AppSidebar } from "@/features/ttt/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"


import { Header } from "@/components/header";
import ChatBotDemo from "@/features/ttt/chat-test-page";
import AIChatHistory from "@/components/ai-blocks/ai-chat-history";


export default function page() {
  return (
    <>
      <Header />
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <ChatBotDemo />
      </div>
    </>
  );
}
