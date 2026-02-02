"use client";

import { Header } from "@/components/header";
import AIChatHistory from "@/components/ai-blocks/ai-chat-history";


export default function page() {
  return (
    <>
      <Header />
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <AIChatHistory
          conversations={[
            {
              id: "conv-1",
              title: "React Component Patterns",
              lastMessage: "How do I create reusable components?",
              lastMessageAt: new Date(),
              messageCount: 12,
              isActive: true,
            },
          ]}
          activeConversationId={"conv-1"}
          onSelect={(id) => {
            /* select conversation logic */
            console.log(id);
          }}
          onNewConversation={() => {
            /* create new conversation */
          }}
          onRename={async (id, newName) => {
            /* rename logic */
            console.log(id, newName);
          }}
          onDelete={async (id) => {
            /* delete logic */
            console.log(id);
          }}
        />
      </div>
    </>
  );
}
