"use client"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
    ArrowUp,
    Copy,
    Globe,
    Mic,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
    ChatContainerContent,
    ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
} from "@/components/prompt-kit/message"
import {
    PromptInput,
    PromptInputAction,
    PromptInputActions,
    PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { AgentTool } from "@/features/agent/components/agent-tool"



// Initial chat messages
const initialMessages = [
    {
        id: 1,
        role: "user",
        content: "Hello! Can you help me with a coding question?",
    },
    {
        id: 2,
        role: "assistant",
        content:
            "Of course! I'd be happy to help with your coding question. What would you like to know?",
    },
    {
        id: 3,
        role: "user",
        content: "How do I create a responsive layout with CSS Grid?",
    },
    {
        id: 4,
        role: "assistant",
        content:
            "Creating a responsive layout with CSS Grid is straightforward. Here's a basic example:\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}\n```\n\nThis creates a grid where:\n- Columns automatically fit as many as possible\n- Each column is at least 250px wide\n- Columns expand to fill available space\n- There's a 1rem gap between items\n\nWould you like me to explain more about how this works?",
    },
    {
        id: 5,
        role: "user",
        content: "Hello! Can you help me with a coding question?",
    },
    {
        id: 6,
        role: "assistant",
        content:
            "Of course! I'd be happy to help with your coding question. What would you like to know?",
    },
    {
        id: 7,
        role: "user",
        content: "How do I create a responsive layout with CSS Grid?",
    },
    {
        id: 8,
        role: "assistant",
        content:
            "Creating a responsive layout with CSS Grid is straightforward. Here's a basic example:\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}\n```\n\nThis creates a grid where:\n- Columns automatically fit as many as possible\n- Each column is at least 250px wide\n- Columns expand to fill available space\n- There's a 1rem gap between items\n\nWould you like me to explain more about how this works?",
    },
]


export function ChatContent() {
    const [prompt, setPrompt] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [chatMessages, setChatMessages] = useState(initialMessages)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    const handleSubmit = () => {
        if (!prompt.trim()) return

        setPrompt("")
        setIsLoading(true)

        // Generate unique ID based on max existing ID
        const maxId = Math.max(0, ...chatMessages.map((m) => m.id))
        const newUserMessage = {
            id: maxId + 1,
            role: "user",
            content: prompt.trim(),
        }

        setChatMessages([...chatMessages, newUserMessage])

        // Simulate API response
        setTimeout(() => {
            const assistantResponse = {
                id: maxId + 2,
                role: "assistant",
                content: `This is a response to: "${prompt.trim()}"`,
            }

            setChatMessages((prev) => [...prev, assistantResponse])
            setIsLoading(false)
        }, 1500)
    }

    return (
        <main className="flex h-screen flex-col overflow-hidden">
            <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <div className="text-foreground">Project roadmap discussion</div>
            </header>

            <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
                <ChatContainerRoot className="h-full">
                    <ChatContainerContent className="space-y-0 px-5 py-12">
                        {chatMessages.map((message, index) => {
                            const isAssistant = message.role === "assistant"
                            const isLastMessage = index === chatMessages.length - 1

                            return (
                                <Message
                                    key={message.id}
                                    className={cn(
                                        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                                        isAssistant ? "items-start" : "items-end"
                                    )}
                                >
                                    {isAssistant ? (
                                        <div className="group flex w-full flex-col gap-0">
                                            <MessageContent
                                                className="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                                                markdown
                                            >
                                                {message.content}
                                            </MessageContent>
                                            <AgentTool />
                                            <MessageActions
                                                className={cn(
                                                    "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                    isLastMessage && "opacity-100"
                                                )}
                                            >
                                                <MessageAction tooltip="Copy" delayDuration={100}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-full"
                                                    >
                                                        <Copy />
                                                    </Button>
                                                </MessageAction>
                                            </MessageActions>
                                        </div>
                                    ) : (
                                        <div className="group flex flex-col items-end gap-1">
                                            <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                                                {message.content}
                                            </MessageContent>
                                            <MessageActions
                                                className={cn(
                                                    "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                                )}
                                            >
                                                <MessageAction tooltip="Edit" delayDuration={100}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-full"
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                </MessageAction>
                                                <MessageAction tooltip="Delete" delayDuration={100}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-full"
                                                    >
                                                        <Trash />
                                                    </Button>
                                                </MessageAction>
                                                <MessageAction tooltip="Copy" delayDuration={100}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-full"
                                                    >
                                                        <Copy />
                                                    </Button>
                                                </MessageAction>
                                            </MessageActions>
                                        </div>
                                    )}
                                </Message>
                            )
                        })}
                    </ChatContainerContent>
                    <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
                        <ScrollButton className="shadow-sm" />
                    </div>
                </ChatContainerRoot>
            </div>

            <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
                <div className="mx-auto max-w-3xl">
                    <PromptInput
                        isLoading={isLoading}
                        value={prompt}
                        onValueChange={setPrompt}
                        onSubmit={handleSubmit}
                        className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
                    >
                        <div className="flex flex-col">
                            <PromptInputTextarea
                                placeholder="Ask anything"
                                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                            />

                            <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                                <div className="flex items-center gap-2">
                                    <PromptInputAction tooltip="Add a new action">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="size-9 rounded-full"
                                        >
                                            <Plus size={18} />
                                        </Button>
                                    </PromptInputAction>

                                    <PromptInputAction tooltip="Search">
                                        <Button variant="outline" className="rounded-full">
                                            <Globe size={18} />
                                            Search
                                        </Button>
                                    </PromptInputAction>

                                    <PromptInputAction tooltip="More actions">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="size-9 rounded-full"
                                        >
                                            <MoreHorizontal size={18} />
                                        </Button>
                                    </PromptInputAction>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PromptInputAction tooltip="Voice input">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="size-9 rounded-full"
                                        >
                                            <Mic size={18} />
                                        </Button>
                                    </PromptInputAction>

                                    <Button
                                        size="icon"
                                        disabled={!prompt.trim() || isLoading}
                                        onClick={handleSubmit}
                                        className="size-9 rounded-full"
                                    >
                                        {!isLoading ? (
                                            <ArrowUp size={18} />
                                        ) : (
                                            <span className="size-3 rounded-xs bg-white" />
                                        )}
                                    </Button>
                                </div>
                            </PromptInputActions>
                        </div>
                    </PromptInput>
                </div>
            </div>
        </main>
    )
}
