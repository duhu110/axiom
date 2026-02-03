"use client";

import { AppSidebar } from "@/features/bot/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Header } from "@/features/bot/components/header";
import ChatInput from "@/features/bot/components/chat-input";
import MessageList from "@/features/bot/components/message-list";
import { mockConversations, mockMessages } from "./mock-data";
import { useState } from "react";
import type { BotMessage, ChatStatus, Conversation } from "@/features/bot/types";
import { nanoid } from "nanoid";
import type { AttachmentData } from "@/components/ai-elements/attachments";

export default function Page() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeConversationId, setActiveConversationId] = useState<string>("conv-1");
  const [messages, setMessages] = useState<BotMessage[]>(mockMessages);
  const [chatStatus, setChatStatus] = useState<ChatStatus>("ready");

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

    // 更新会话的最后消息
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversationId
          ? {
              ...conv,
              lastMessage: message.text,
              lastMessageAt: new Date(),
              messageCount: (conv.messageCount || 0) + 1,
            }
          : conv
      )
    );

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
      lastMessageAt: new Date(),
      messageCount: 0,
      isActive: false,
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

  const handleArchive = async (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, isArchived: true } : conv
      )
    );
  };

  const handleUnarchive = async (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, isArchived: false } : conv
      )
    );
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
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
      />
      <SidebarInset>
        <Header />
        <div className="bottom-6 mt-auto flex justify-center w-full pb-20">
          <div className="w-full md:w-2/3 lg:w-3/4 px-3 py-2">
            <MessageList messages={messages} onRetry={handleRetry} />
          </div>
        </div>
        <div className="sticky bottom-6 mt-auto flex justify-center w-full">
          <div className="w-full md:w-2/3 lg:w-3/4 bg-background/80 backdrop-blur rounded-xl px-3 py-2">
            <ChatInput onSubmit={handleSubmit} status={chatStatus} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
