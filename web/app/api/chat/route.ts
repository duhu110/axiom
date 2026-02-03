import {
    streamText, UIMessage, convertToModelMessages, tool,
    stepCountIs,
} from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { z } from 'zod';


const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

/**
 * 处理聊天请求并返回流式 UI 消息响应。
 */
export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: deepseek("deepseek-chat"),
        system: "You are a helpful assistant. When a tool is called, you must interpret the tool's output and provide a natural language response to the user. Do not stop after calling a tool.",
        messages: await convertToModelMessages(messages),
        stopWhen: stepCountIs(10),
        tools: {
            weather: tool({
                description: 'Get the weather in a location (fahrenheit)',
                inputSchema: z.object({
                    location: z.string().describe('The location to get the weather for'),
                }),
                execute: async ({ location }) => {
                    const temperature = Math.round(Math.random() * (90 - 32) + 32);
                    return {
                        location,
                        temperature,
                    };
                },
            }),
            convertFahrenheitToCelsius: tool({
                description: 'Convert a temperature in fahrenheit to celsius',
                inputSchema: z.object({
                    temperature: z
                        .number()
                        .describe('The temperature in fahrenheit to convert'),
                }),
                execute: async ({ temperature }) => {
                    const celsius = Math.round((temperature - 32) * (5 / 9));
                    return {
                        celsius,
                    };
                },
            }),
        },
        onStepFinish: (step) => {
            console.log(JSON.stringify(step, null, 2));
        },
    });

    return result.toUIMessageStreamResponse();
}

