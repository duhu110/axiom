"use client";

import { useCallback, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Header } from "@/components/header";
import { SidebarTrigger } from "@/components/ui/sidebar"
import { type PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { ChatInputArea } from '@/features/chat-test/components/chat-input-area';
import { ChatMessageList } from '@/features/chat-test/components/chat-message-list';


/**
 * Chat Test 页面容器与交互逻辑。
 */
export default function Page() {

    const [input, setInput] = useState('');
    const [webSearch, setWebSearch] = useState(false);

    /**
     * 计算当前是否接近页面底部。
     */
    const getNearBottom = useCallback(() => {
        if (typeof window === 'undefined') {
            return true;
        }
        const threshold = 100;
        const scrollPosition = window.scrollY + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        return scrollPosition >= documentHeight - threshold;
    }, []);

    const [isAtBottom, setIsAtBottom] = useState(getNearBottom);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(getNearBottom);
    const { messages, sendMessage, status, regenerate } = useChat({
        // @ts-expect-error maxSteps is supported in newer versions but types might be outdated
        maxSteps: 5,
    });

    const scrollToBottom = useCallback(() => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth',
        });
        setIsAtBottom(true);
        setAutoScrollEnabled(true);
    }, []);

    const handleWindowScroll = useCallback(() => {
        const nearBottom = getNearBottom();
        setIsAtBottom(nearBottom);
        setAutoScrollEnabled(nearBottom);
    }, [getNearBottom]);

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
        return () => {
            window.removeEventListener('scroll', handleWindowScroll);
            window.removeEventListener('resize', handleWindowScroll);
        };
    }, [handleWindowScroll]);
    return (
        <>
            <Header leading={<SidebarTrigger />} />
            <div className="mx-auto w-full max-w-5xl space-y-8">
                <div className="mx-auto w-full max-w-4xl px-6 min-h-[calc(100vh-3.5rem)] flex flex-col pb-56">
                    <div className="flex-1 py-4">
                        <ChatMessageList
                            messages={messages}
                            status={status}
                            regenerate={regenerate}
                        />
                    </div>
                    <ChatInputArea
                        input={input}
                        setInput={setInput}
                        onSubmit={handleSubmit}
                        status={status}
                        webSearch={webSearch}
                        setWebSearch={setWebSearch}
                        isAtBottom={isAtBottom}
                        scrollToBottom={scrollToBottom}
                    />
                </div>
            </div>
        </>
    );
}
