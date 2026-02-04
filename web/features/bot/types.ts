import type { AttachmentData } from "@/components/ai-elements/attachments";
import type { ToolUIPart } from "ai";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type NavLink = {
  label: string;
  href: string;
};

export type HeaderProps = {
  leading?: ReactNode;
};

export type BotUser = {
  name: string;
  email: string;
  avatar: string;
};

export type BotNavSubItem = {
  title: string;
  url: string;
};

export type BotNavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: BotNavSubItem[];
};

export type BotModel = {
  id: string;
  name: string;
  chef: string;
  chefSlug: string;
  providers: string[];
};

export type ChatStatus = "submitted" | "streaming" | "ready" | "error";

export type BotMessageRole = "user" | "assistant";

export type BotMessageVersion = {
  id: string;
  content: string;
};

// 消息内容类型（联合类型区分文本和工具调用）
export type TextMessageContent = {
  type: "text";
  content: string;
  versions?: BotMessageVersion[];
};

export type ToolMessageContent = {
  type: "tool";
  tool: ToolUIPart;
};

export type MessageContent = TextMessageContent | ToolMessageContent;

// 更新后的消息类型
export type BotMessage = {
  key: string;
  from: BotMessageRole;
  data: MessageContent;
  attachments?: AttachmentData[];
  createdAt?: Date;
};

// 会话类型
export type Conversation = {
  id: string;
  title: string;
};
