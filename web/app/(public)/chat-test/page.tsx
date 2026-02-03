"use client";

import { useCallback, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Header } from "@/components/header";
import { SidebarTrigger } from "@/components/ui/sidebar"
import { type PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { ChatInputArea } from '@/features/chat-test/components/chat-input-area';
import { ChatMessageList } from '@/features/chat-test/components/chat-message-list';


export default function page() {

    const [input, setInput] = useState('');
    const [webSearch, setWebSearch] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const { messages, sendMessage, status, regenerate } = useChat({
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