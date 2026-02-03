"use client";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';
import {
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import { useSidebar } from '@/components/ui/sidebar';
import { GlobeIcon } from 'lucide-react';

type ChatStatus = 'streaming' | 'submitted' | 'ready' | 'error';

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

interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  status: ChatStatus;
  webSearch: boolean;
  setWebSearch: (value: boolean) => void;
  isAtBottom: boolean;
  scrollToBottom: () => void;
}

export function ChatInputArea({
  input,
  setInput,
  onSubmit,
  status,
  webSearch,
  setWebSearch,
  isAtBottom,
  scrollToBottom,
}: ChatInputAreaProps) {
  const { state, isMobile } = useSidebar();

  return (
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
        <PromptInput onSubmit={onSubmit} globalDrop multiple>
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
  );
}
