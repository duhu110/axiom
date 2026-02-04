"use client";

import { AppSidebar } from "@/features/bot/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Header } from "@/features/bot/components/header";
import ChatInput from "@/features/bot/components/chat-input";
import MessageList from "@/features/bot/components/message-list";
import { mockConversations, mockMessages } from "./mock-data";
import { useEffect, useState } from "react";
import type { BotMessage, ChatStatus, Conversation } from "@/features/bot/types";
import { nanoid } from "nanoid";
import type { AttachmentData } from "@/components/ai-elements/attachments";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

export default function Page() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeConversationId, setActiveConversationId] = useState<string>("conv-1");
  const [messages, setMessages] = useState<BotMessage[]>(mockMessages);
  const [chatStatus, setChatStatus] = useState<ChatStatus>("ready");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      const distance =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight;
      setShowScrollToBottom(distance > 120);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const distance =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight;
      setShowScrollToBottom(distance > 120);
    });
    return () => cancelAnimationFrame(raf);
  }, [messages.length]);

  const handleSubmit = (message: { text: string; files?: AttachmentData[] }) => {
    if (!message.text && (!message.files || message.files.length === 0)) {
      return;
    }

    const newMessage: BotMessage = {
      key: nanoid(),
      from: "user",
      data: {
        type: "text",
        content: message.text,
      },
      attachments: message.files,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    setChatStatus("submitted");

    // 模拟 AI 回复
    setTimeout(() => {
      setChatStatus("streaming");
    }, 200);

    setTimeout(() => {
      const aiResponse: BotMessage = {
        key: nanoid(),
        from: "assistant",
        data: {
          type: "text",
          content: `This is a mock response to: "${message.text}"`,
        },
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setChatStatus("ready");
    }, 1500);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    // 在真实场景中，这里会加载对应会话的消息
    // 目前使用 mock 数据，所以消息列表保持不变
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: nanoid(),
      title: "New Chat",
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setMessages([]); // 清空消息列表
  };

  const handleRename = async (conversationId: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, title: newTitle } : conv
      )
    );
  };

  const handleDelete = async (conversationId: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
    if (conversationId === activeConversationId && conversations.length > 1) {
      const nextConv = conversations.find((c) => c.id !== conversationId);
      if (nextConv) {
        setActiveConversationId(nextConv.id);
      }
    }
  };

  const handleRetry = (messageKey: string) => {
    console.log("Retrying message:", messageKey);
  };

  return (
    <SidebarProvider>
      <AppSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <SidebarInset>
        <Header />
        <div className="bottom-6 mt-auto flex w-full justify-center pb-20">
          <div className="w-full max-w-[68rem] px-3 py-2 sm:px-4">
            <MessageList messages={messages} onRetry={handleRetry} />
          </div>
        </div>
        <div className="sticky bottom-6 mt-auto flex w-full justify-center relative">
          <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-6 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/40" />
          <div className="relative z-10 w-full max-w-[68rem] rounded-xl bg-background/90 px-3 py-2 sm:px-4">
            {showScrollToBottom && (
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-8">
                <Button
                  className="h-8 w-8 rounded-full p-0"
                  onClick={() =>
                    window.scrollTo({
                      top: document.documentElement.scrollHeight,
                      behavior: "smooth",
                    })
                  }
                  type="button"
                  variant="secondary"
                  aria-label="Scroll to bottom"
                >
                  <ArrowDown className="size-3.5" />
                </Button>
              </div>
            )}
            <ChatInput onSubmit={handleSubmit} status={chatStatus} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
