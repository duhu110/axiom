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
import {
  CopyIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { useState } from "react";

interface MessageListProps {
  messages: BotMessage[];
  onRetry?: (messageKey: string) => void;
}

interface TextMessageItemProps {
  message: BotMessage;
  data: TextMessageContent;
  liked: boolean;
  disliked: boolean;
  onLike: () => void;
  onDislike: () => void;
  onCopy: (content: string) => void;
  onRetry?: () => void;
}

function TextMessageItem({
  message,
  data,
  liked,
  disliked,
  onLike,
  onDislike,
  onCopy,
  onRetry,
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
                  label="Like"
                  onClick={onLike}
                  tooltip="Like this response"
                >
                  <ThumbsUpIcon
                    className="size-4"
                    fill={liked ? "currentColor" : "none"}
                  />
                </MessageAction>
                <MessageAction
                  label="Dislike"
                  onClick={onDislike}
                  tooltip="Dislike this response"
                >
                  <ThumbsDownIcon
                    className="size-4"
                    fill={disliked ? "currentColor" : "none"}
                  />
                </MessageAction>
                <MessageAction
                  label="Copy"
                  onClick={() => onCopy(data.versions?.[0]?.content || "")}
                  tooltip="Copy to clipboard"
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
              label="Like"
              onClick={onLike}
              tooltip="Like this response"
            >
              <ThumbsUpIcon
                className="size-4"
                fill={liked ? "currentColor" : "none"}
              />
            </MessageAction>
            <MessageAction
              label="Dislike"
              onClick={onDislike}
              tooltip="Dislike this response"
            >
              <ThumbsDownIcon
                className="size-4"
                fill={disliked ? "currentColor" : "none"}
              />
            </MessageAction>
            <MessageAction
              label="Copy"
              onClick={() => onCopy(data.content)}
              tooltip="Copy to clipboard"
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
  const toolName = "toolName" in tool ? tool.toolName : "tool";
  const toolState = tool.state;
  const toolInput = "args" in tool ? tool.args : {};
  const toolOutput = "result" in tool ? tool.result : undefined;

  return (
    <Message from={message.from}>
      <Tool defaultOpen={toolState === "result"}>
        <ToolHeader
          state={toolState === "result" ? "output-available" : "input-available"}
          title={toolName}
          type={`tool-${toolName}`}
        />
        <ToolContent>
          <ToolInput input={toolInput} />
          {toolState === "result" && (
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
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
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
              liked={liked[message.key] || false}
              disliked={disliked[message.key] || false}
              onLike={() =>
                setLiked((prev) => ({
                  ...prev,
                  [message.key]: !prev[message.key],
                }))
              }
              onDislike={() =>
                setDisliked((prev) => ({
                  ...prev,
                  [message.key]: !prev[message.key],
                }))
              }
              onCopy={handleCopy}
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
