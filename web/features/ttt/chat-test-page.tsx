'use client';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from 'lucide-react';
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
import { useSidebar } from '@/components/ui/sidebar';
import { Loader } from '@/components/ai-elements/loader';
const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null;
  }
  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};
const computeNearBottom = () => {
  if (typeof window === 'undefined') {
    return true;
  }
  const threshold = 80;
  const scrollPosition = window.scrollY + window.innerHeight;
  const maxScroll = document.documentElement.scrollHeight;
  return scrollPosition >= maxScroll - threshold;
};
const ChatBotDemo = () => {
  const { state, isMobile } = useSidebar();
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const { messages, sendMessage, status, regenerate } = useChat();
  
  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
    setIsAtBottom(true);
    setAutoScrollEnabled(true);
  }, []);

  const handleWindowScroll = useCallback(() => {
    const threshold = 100;
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const nearBottom = scrollPosition >= documentHeight - threshold;
    
    setIsAtBottom(nearBottom);
    
    if (nearBottom) {
      setAutoScrollEnabled(true);
    } else {
      setAutoScrollEnabled(false);
    }
  }, []);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }
    sendMessage(
      { 
        text: message.text || 'Sent with attachments',
        files: message.files 
      },
      {
        body: {
          webSearch: webSearch,
        },
      },
    );
    setInput('');
    setIsAtBottom(true);
    setAutoScrollEnabled(true);
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  };

  useEffect(() => {
    if (autoScrollEnabled && messages.length > 0) {
      // 这里的 setTimeout 有助于在内容渲染后执行滚动
      const timer = setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, status, autoScrollEnabled]);

  useEffect(() => {
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('resize', handleWindowScroll);
    
    // 初始检查
    handleWindowScroll();

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('resize', handleWindowScroll);
    };
  }, [handleWindowScroll]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 min-h-[calc(100vh-3.5rem)] flex flex-col pb-56">
      <div className="flex-1 py-4">
        <Conversation className="min-h-0">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'assistant' && message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === 'source-url',
                        ).length
                      }
                    />
                    {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
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
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            <MessageResponse>
                              {part.text}
                            </MessageResponse>
                          </MessageContent>
                          {message.role === 'assistant' && i === messages.length - 1 && (
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
                          isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    case 'tool-invocation':
                      const toolInvocation = (part as any).toolInvocation;
                      return (
                        <Tool key={`${message.id}-${i}`} defaultOpen={true}>
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
                  <Tool key={toolInvocation.toolCallId} defaultOpen={true}>
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
      </div>
      <div 
        className="fixed bottom-0 right-0 z-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ 
          left: isMobile ? '0' : (state === 'expanded' ? '16rem' : '3rem'), 
          transition: 'left 0.2s ease-linear' 
        }}
      >
        <div className="mx-auto w-full max-w-4xl px-6 py-4 relative">
          <ConversationScrollButton 
            isVisible={!isAtBottom}
            onScrollToBottom={scrollToBottom}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4"
          />
          <PromptInput onSubmit={handleSubmit} globalDrop multiple>
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputButton
                  variant={webSearch ? 'default' : 'ghost'}
                  onClick={() => setWebSearch(!webSearch)}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit disabled={!input && !status} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};
export default ChatBotDemo;
