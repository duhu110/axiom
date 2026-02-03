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

interface ChatMessageListProps {
  messages: AIMessage[];
  status: ChatStatus;
  regenerate: () => void;
}

export function ChatMessageList({ messages, status, regenerate }: ChatMessageListProps) {
  return (
    <Conversation className="min-h-0">
      <ConversationContent>
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'assistant' && message.parts?.filter((part: any) => part.type === 'source-url').length > 0 && (
              <Sources>
                <SourcesTrigger
                  count={
                    message.parts.filter(
                      (part: any) => part.type === 'source-url',
                    ).length
                  }
                />
                {message.parts.filter((part: any) => part.type === 'source-url').map((part: any, i: number) => (
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
            {message.parts?.map((part: any, i: number) => {
              // Handle explicit tool invocation part type
              if (part.type === 'tool-invocation') {
                  const toolInvocation = (part as any).toolInvocation;
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
              if (part.type.startsWith('tool-')) {
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
                  if ((part as any).type === 'step-start') {
                    return null;
                  }
                  return (
                    <div key={`${message.id}-${i}`} className="p-4 border border-red-200 rounded bg-red-50 text-red-800 text-xs overflow-auto">
                      <p className="font-bold mb-1">Unknown Part Type: {(part as any).type}</p>
                      <pre>{JSON.stringify(part, null, 2)}</pre>
                    </div>
                  );
              }
            })}
            {(message as any).toolInvocations?.map((toolInvocation: any) => (
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
