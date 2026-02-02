import AIChatHistory from "@/components/ai-blocks/ai-chat-history";

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
  }}
  onNewConversation={() => {
    /* create new conversation */
  }}
  onRename={async (id, newName) => {
    /* rename logic */
  }}
  onDelete={async (id) => {
    /* delete logic */
  }}
/>