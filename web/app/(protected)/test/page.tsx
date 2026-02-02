"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtImage,
} from "@/components/ai-elements/chain-of-thought";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, User, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

// Mock data types
type MockMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  chainOfThought?: {
    steps: Array<{
      label: string;
      description?: string;
      status: "complete" | "active" | "pending";
    }>;
    searchResults?: string[];
  };
  timestamp: Date;
};

export default function TestChatPage() {
  const [messages, setMessages] = useState<MockMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `你好！我是 AI 助手。我可以帮助你：

• 回答问题
• 编写代码
• 分析数据
• 创意写作
• 和更多...

请告诉我你需要什么帮助！`,
      timestamp: new Date(),
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text.trim()) return;

    // Add user message
    const userMessage: MockMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message.text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSubmitting(true);

    // Simulate AI response delay
    setTimeout(() => {
      const assistantMessage: MockMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `# ${message.text}

这是一个模拟的 AI 回复。在实际应用中，这里会连接到真实的 AI 模型（如 OpenAI、Anthropic 等）。

\`\`\`typescript
// 示例代码
function example() {
  console.log("Hello, AI!");
}
\`\`\`

让我为你详细解释这个问题...`,
        reasoning: `让我思考一下这个问题...

首先，我需要理解用户的需求：
1. 分析问题的核心
2. 考虑可能的解决方案
3. 提供最佳答案

基于我的分析，我建议以下方法...`,
        chainOfThought: {
          steps: [
            {
              label: "分析用户问题",
              description: "理解问题的核心需求",
              status: "complete",
            },
            {
              label: "搜索相关信息",
              description: "查找相关资料和最佳实践",
              status: "complete",
            },
            {
              label: "生成解决方案",
              description: "基于分析结果提供答案",
              status: "active",
            },
            {
              label: "验证答案",
              description: "确保答案的准确性和完整性",
              status: "pending",
            },
          ],
          searchResults: ["Wikipedia", "GitHub", "Stack Overflow"],
        },
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsSubmitting(false);
    }, 1500);
  };

  // Copy message to clipboard
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Regenerate response
  const handleRegenerate = (messageId: string) => {
    console.log("Regenerating message:", messageId);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI 聊天助手</h1>
            <p className="text-muted-foreground text-sm">
              使用 AI Elements 组件构建的聊天界面
            </p>
          </div>
        </div>
      </header>

      {/* Conversation Area */}
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="开始新的对话"
              description="在下方输入框中输入你的问题，AI 助手会为你解答"
              icon={<Bot className="size-12" />}
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <div className="mb-2 flex items-center gap-2">
                  {message.role === "user" ? (
                    <User className="size-4 text-muted-foreground" />
                  ) : (
                    <Bot className="size-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">
                    {message.role === "user" ? "你" : "AI 助手"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                <MessageContent>
                  {/* Reasoning Component for AI */}
                  {message.reasoning && (
                    <Reasoning defaultOpen={false} isStreaming={false}>
                      <ReasoningTrigger />
                      <ReasoningContent>{message.reasoning}</ReasoningContent>
                    </Reasoning>
                  )}

                  {/* Chain of Thought Component */}
                  {message.chainOfThought && (
                    <ChainOfThought defaultOpen={false}>
                      <ChainOfThoughtHeader>
                        查看思考过程
                      </ChainOfThoughtHeader>
                      <ChainOfThoughtContent>
                        {message.chainOfThought.steps.map((step, index) => (
                          <ChainOfThoughtStep
                            key={index}
                            label={step.label}
                            description={step.description}
                            status={step.status}
                          />
                        ))}

                        {message.chainOfThought.searchResults && (
                          <ChainOfThoughtStep
                            label="搜索来源"
                            status="complete"
                          >
                            <ChainOfThoughtSearchResults>
                              {message.chainOfThought.searchResults.map(
                                (source, index) => (
                                  <ChainOfThoughtSearchResult key={index}>
                                    {source}
                                  </ChainOfThoughtSearchResult>
                                )
                              )}
                            </ChainOfThoughtSearchResults>
                          </ChainOfThoughtStep>
                        )}

                        {/* Example with image */}
                        <ChainOfThoughtImage caption="思考过程可视化">
                          <div className="flex size-32 items-center justify-center text-muted-foreground">
                            <Bot className="size-12" />
                          </div>
                        </ChainOfThoughtImage>
                      </ChainOfThoughtContent>
                    </ChainOfThought>
                  )}

                  {/* Message Response with Markdown */}
                  <MessageResponse>{message.content}</MessageResponse>
                </MessageContent>

                {/* Message Actions */}
                {message.role === "assistant" && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(message.content)}
                    >
                      <Copy className="mr-2 size-4" />
                      复制
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRegenerate(message.id)}
                    >
                      <RefreshCw className="mr-2 size-4" />
                      重新生成
                    </Button>
                  </div>
                )}
              </Message>
            ))
          )}
        </ConversationContent>
      </Conversation>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea placeholder="输入你的问题... (Shift+Enter 换行, Enter 发送)" />

          <PromptInputFooter>
            {/* Action Menu */}
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionMenuItem>
                  上传图片
                </PromptInputActionMenuItem>
                <PromptInputActionMenuItem>
                  上传文件
                </PromptInputActionMenuItem>
                <PromptInputActionMenuItem>
                  使用语音输入
                </PromptInputActionMenuItem>
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>

            {/* Submit Button */}
            <PromptInputSubmit
              status={isSubmitting ? "submitted" : undefined}
              disabled={isSubmitting}
            />
          </PromptInputFooter>
        </PromptInput>

        <div className="mt-2 text-center">
          <p className="text-muted-foreground text-xs">
            AI 可能产生错误。请核实重要信息。
          </p>
        </div>
      </div>
    </div>
  );
}
