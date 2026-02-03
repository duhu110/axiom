"use client";

import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { Loader } from '@/components/ai-elements/loader';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import { type UIMessage as AIMessage } from 'ai';

type ChatStatus = 'streaming' | 'submitted' | 'ready' | 'error';

type MessagePart = NonNullable<AIMessage['parts']>[number];

type SourceUrlPart = MessagePart & {
  type: 'source-url';
  url: string;
};

type ToolInvocation = {
  toolCallId?: string;
  toolName: string;
  state?: 'result' | 'call' | 'input' | 'output';
  args?: unknown;
  result?: unknown;
};

type ToolInvocationPart = MessagePart & {
  type: 'tool-invocation';
  toolInvocation: ToolInvocation;
};

type ToolPart = MessagePart & {
  type: `tool-${string}`;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

type ExtendedMessage = AIMessage & {
  toolInvocations?: ToolInvocation[];
};

/**
 * 判断是否为 source-url 分片。
 */
const isSourceUrlPart = (part: MessagePart): part is SourceUrlPart =>
  part.type === 'source-url' && typeof (part as SourceUrlPart).url === 'string';

/**
 * 判断是否为工具调用分片。
 */
const isToolInvocationPart = (
  part: MessagePart
): part is ToolInvocationPart =>
  part.type === 'tool-invocation' &&
  typeof (part as ToolInvocationPart).toolInvocation === 'object' &&
  (part as ToolInvocationPart).toolInvocation !== null;

/**
 * 判断是否为 tool-* 分片（排除 tool-invocation）。
 */
const isToolPart = (part: MessagePart): part is ToolPart =>
  part.type.startsWith('tool-') && part.type !== 'tool-invocation';

/**
 * 判断是否为 step-start 分片。
 */
const isStepStartPart = (part: MessagePart): boolean =>
  part.type === 'step-start';

interface ChatMessageListProps {
  messages: AIMessage[];
  status: ChatStatus;
  regenerate: () => void;
}

/**
 * 渲染聊天消息列表。
 */
export function ChatMessageList({ messages, status, regenerate }: ChatMessageListProps) {
  return (
    <Conversation className="min-h-0">
      <ConversationContent>
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'assistant' && (message.parts ?? []).filter(isSourceUrlPart).length > 0 && (
              <Sources>
                <SourcesTrigger
                  count={
                    (message.parts ?? []).filter(isSourceUrlPart).length
                  }
                />
                {(message.parts ?? []).filter(isSourceUrlPart).map((part, i) => (
                  <SourcesContent key={`${message.id}-${i}`}>
                    <Source
                      key={`${message.id}-${i}`}
                      href={part.url}
                      title={part.url}
                    />
                  </SourcesContent>
                ))}
              </Sources>
            )}
            {(message.parts ?? []).map((part, i) => {
              // Handle explicit tool invocation part type
              if (isToolInvocationPart(part)) {
                  const toolInvocation = part.toolInvocation;
                  return (
                    <Tool key={`${message.id}-${i}`} defaultOpen={true} className="my-2">
                      <ToolHeader
                        type="dynamic-tool"
                        toolName={toolInvocation.toolName}
                        state={
                          toolInvocation.state === 'result'
                            ? 'output-available'
                            : 'input-available'
                        }
                      />
                      <ToolContent>
                        <ToolInput input={toolInvocation.args} />
                        <ToolOutput
                          output={toolInvocation.result}
                          errorText={undefined}
                        />
                      </ToolContent>
                    </Tool>
                  );
              }
              
              // Handle specific tool types like "tool-weather"
              if (isToolPart(part)) {
                  const toolName = part.type.replace('tool-', '');
                  // Construct a synthetic toolInvocation object from the part
                  // Based on the error JSON: { type: "tool-weather", toolCallId: "...", state: "output-available", input: {...}, output: {...} }
                  const toolInvocation = {
                      toolCallId: part.toolCallId,
                      toolName: toolName,
                      state: part.state === 'output-available' ? 'result' : 'call', // Map state if needed, or use part.state if Tool supports it
                      args: part.input,
                      result: part.output,
                  };
                  
                  return (
                    <Tool key={`${message.id}-${i}`} defaultOpen={true} className="my-2">
                      <ToolHeader
                        type="dynamic-tool"
                        toolName={toolInvocation.toolName}
                        state={
                           part.state === 'output-available' || part.state === 'result'
                            ? 'output-available'
                            : 'input-available'
                        }
                      />
                      <ToolContent>
                        <ToolInput input={toolInvocation.args} />
                        <ToolOutput
                          output={toolInvocation.result}
                          errorText={undefined}
                        />
                      </ToolContent>
                    </Tool>
                  );
              }

              switch (part.type) {
                case 'text':
                  return (
                    <Message key={`${message.id}-${i}`} from={message.role}>
                      <MessageContent>
                        <MessageResponse>
                          {part.text}
                        </MessageResponse>
                      </MessageContent>
                      {message.role === 'assistant' && i === (message.parts?.length ?? 0) - 1 && (
                        <MessageActions>
                          <MessageAction
                            onClick={() => regenerate()}
                            label="Retry"
                          >
                            <RefreshCcwIcon className="size-3" />
                          </MessageAction>
                          <MessageAction
                            onClick={() =>
                              navigator.clipboard.writeText(part.text)
                            }
                            label="Copy"
                          >
                            <CopyIcon className="size-3" />
                          </MessageAction>
                        </MessageActions>
                      )}
                    </Message>
                  );
                case 'reasoning':
                  return (
                    <Reasoning
                      key={`${message.id}-${i}`}
                      className="w-full"
                      isStreaming={status === 'streaming' && i === (message.parts?.length ?? 0) - 1 && message.id === messages.at(-1)?.id}
                    >
                      <ReasoningTrigger />
                      <ReasoningContent>{part.text}</ReasoningContent>
                    </Reasoning>
                  );
                default:
                  if (isStepStartPart(part)) {
                    return null;
                  }
                  return (
                    <div key={`${message.id}-${i}`} className="p-4 border border-red-200 rounded bg-red-50 text-red-800 text-xs overflow-auto">
                      <p className="font-bold mb-1">Unknown Part Type: {part.type}</p>
                      <pre>{JSON.stringify(part, null, 2)}</pre>
                    </div>
                  );
              }
            })}
            {(message as ExtendedMessage).toolInvocations?.map((toolInvocation) => (
              <Tool key={toolInvocation.toolCallId} defaultOpen={true} className="my-2">
                <ToolHeader
                  type="dynamic-tool"
                  toolName={toolInvocation.toolName}
                  state={
                    toolInvocation.state === 'result'
                      ? 'output-available'
                      : 'input-available'
                  }
                />
                <ToolContent>
                  <ToolInput input={toolInvocation.args} />
                  <ToolOutput
                    output={toolInvocation.result}
                    errorText={undefined}
                  />
                </ToolContent>
              </Tool>
            ))}
          </div>
        ))}
        {status === 'submitted' && <Loader />}
      </ConversationContent>
    </Conversation>
  );
}
