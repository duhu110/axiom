"use client";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { BotMessage, TextMessageContent } from "@/features/bot/types";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { useState } from "react";

interface MessageListProps {
  messages: BotMessage[];
  onRetry?: (messageKey: string) => void;
}

interface TextMessageItemProps {
  message: BotMessage;
  data: TextMessageContent;
  onCopy: (content: string) => void;
  onRetry?: () => void;
  isCopied?: boolean;
}

function TextMessageItem({
  message,
  data,
  onCopy,
  onRetry,
  isCopied = false,
}: TextMessageItemProps) {
  const hasMultipleVersions = data.versions && data.versions.length > 1;

  if (hasMultipleVersions && data.versions) {
    return (
      <Message from={message.from}>
        <MessageBranch defaultBranch={0}>
          <MessageBranchContent>
            {data.versions.map((version) => (
              <MessageContent key={version.id}>
                <MessageResponse>{version.content}</MessageResponse>
              </MessageContent>
            ))}
          </MessageBranchContent>
          {message.from === "assistant" && (
            <MessageToolbar>
              <MessageBranchSelector from={message.from}>
                <MessageBranchPrevious />
                <MessageBranchPage />
                <MessageBranchNext />
              </MessageBranchSelector>
              <MessageActions>
                <MessageAction
                  label="Retry"
                  onClick={onRetry}
                  tooltip="Regenerate response"
                >
                  <RefreshCcwIcon className="size-4" />
                </MessageAction>
                <MessageAction
                  label="Copy"
                  onClick={() => onCopy(data.versions?.[0]?.content || "")}
                  tooltip={isCopied ? "已复制" : "Copy to clipboard"}
                >
                  <CopyIcon className="size-4" />
                </MessageAction>
              </MessageActions>
            </MessageToolbar>
          )}
        </MessageBranch>
      </Message>
    );
  }

  return (
    <Message from={message.from}>
      <div>
        {message.attachments && message.attachments.length > 0 && (
          <Attachments className="mb-2" variant="grid">
            {message.attachments.map((attachment) => (
              <Attachment data={attachment} key={attachment.id}>
                <AttachmentPreview />
                <AttachmentRemove />
              </Attachment>
            ))}
          </Attachments>
        )}
        <MessageContent>
          {message.from === "assistant" ? (
            <MessageResponse>{data.content}</MessageResponse>
          ) : (
            data.content
          )}
        </MessageContent>
        {message.from === "assistant" && (
          <MessageActions>
            <MessageAction
              label="Retry"
              onClick={onRetry}
              tooltip="Regenerate response"
            >
              <RefreshCcwIcon className="size-4" />
            </MessageAction>
            <MessageAction
              label="Copy"
              onClick={() => onCopy(data.content)}
              tooltip={isCopied ? "已复制" : "Copy to clipboard"}
            >
              <CopyIcon className="size-4" />
            </MessageAction>
          </MessageActions>
        )}
      </div>
    </Message>
  );
}

interface ToolMessageItemProps {
  message: BotMessage;
}

function ToolMessageItem({ message }: ToolMessageItemProps) {
  if (message.data.type !== "tool") return null;

  const { tool } = message.data;
  const toolName = "toolName" in tool ? (tool.toolName as string) : "tool";
  const toolState = tool.state;
  const toolInput = "args" in tool ? tool.args : {};
  const toolOutput = "output" in tool ? tool.output : undefined;
  const toolType = tool.type;

  return (
    <Message from={message.from}>
      <Tool defaultOpen={toolState === "output-available"}>
        <ToolHeader
          state={toolState}
          title={toolName}
          type={toolType}
        />
        <ToolContent>
          <ToolInput input={toolInput} />
          {toolState === "output-available" && (
            <ToolOutput
              output={typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput, null, 2)}
              errorText={undefined}
            />
          )}
        </ToolContent>
      </Tool>
    </Message>
  );
}

export default function MessageList({ messages, onRetry }: MessageListProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleCopied = (messageKey: string) => {
    setCopiedKey(messageKey);
    window.clearTimeout((handleCopied as unknown as { timer?: number }).timer);
    (handleCopied as unknown as { timer?: number }).timer = window.setTimeout(
      () => setCopiedKey(null),
      1200
    );
  };

  const handleRetry = (messageKey: string) => {
    if (onRetry) {
      onRetry(messageKey);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => {
        if (message.data.type === "text") {
          return (
            <TextMessageItem
              key={message.key}
              message={message}
              data={message.data}
              isCopied={copiedKey === message.key}
              onCopy={(content) => {
                handleCopy(content);
                handleCopied(message.key);
              }}
              onRetry={() => handleRetry(message.key)}
            />
          );
        }

        if (message.data.type === "tool") {
          return <ToolMessageItem key={message.key} message={message} />;
        }

        return null;
      })}
    </div>
  );
}
