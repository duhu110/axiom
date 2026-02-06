"""
DeepSeek LLM 适配器

扩展 LangChain ChatOpenAI 以支持 DeepSeek Reasoner 的 reasoning_content 流式输出
"""
from typing import Any, AsyncIterator, Iterator, List, Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessageChunk, BaseMessage
from langchain_core.outputs import ChatGenerationChunk
from langchain_core.callbacks import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun


class DeepSeekChat(ChatOpenAI):
    """
    DeepSeek Chat 适配器
    
    扩展 ChatOpenAI 以支持：
    1. reasoning_content 流式输出
    2. 历史消息中 reasoning_content 字段补齐
    """
    
    def _get_request_payload(self, input_, *, stop=None, **kwargs):
        """补齐历史消息中的 reasoning_content 字段，避免 API 400 错误"""
        payload = super()._get_request_payload(input_, stop=stop, **kwargs)
        messages = payload.get("messages", [])
        for message in messages:
            if message.get("role") == "assistant" and "reasoning_content" not in message:
                message["reasoning_content"] = ""
        return payload
    
    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        """同步流式生成，支持 reasoning_content"""
        payload = self._get_request_payload(messages, stop=stop, **kwargs)
        payload["stream"] = True
        
        response = self.client.create(**payload)
        
        for chunk in response:
            if not chunk.choices:
                continue
                
            delta = chunk.choices[0].delta
            
            # 构建 additional_kwargs，包含 reasoning_content
            additional_kwargs = {}
            if hasattr(delta, "reasoning_content") and delta.reasoning_content:
                additional_kwargs["reasoning_content"] = delta.reasoning_content
            if hasattr(delta, "tool_calls") and delta.tool_calls:
                additional_kwargs["tool_calls"] = [
                    {
                        "index": tc.index,
                        "id": tc.id,
                        "function": {
                            "name": tc.function.name if tc.function else None,
                            "arguments": tc.function.arguments if tc.function else None,
                        },
                        "type": tc.type,
                    }
                    for tc in delta.tool_calls
                ]
            
            # 创建 AIMessageChunk
            message_chunk = AIMessageChunk(
                content=delta.content or "",
                additional_kwargs=additional_kwargs,
            )

            # 创建 ChatGenerationChunk
            # 保留usage信息以供LLM usage记录使用
            generation_info = {}
            if chunk.choices[0].finish_reason:
                generation_info["finish_reason"] = chunk.choices[0].finish_reason
            if hasattr(chunk, 'usage') and chunk.usage:
                generation_info["usage"] = chunk.usage

            gen_chunk = ChatGenerationChunk(
                message=message_chunk,
                generation_info=generation_info if generation_info else None,
            )

            if run_manager:
                run_manager.on_llm_new_token(
                    gen_chunk.text,
                    chunk=gen_chunk,
                )

            yield gen_chunk
    
    async def _astream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        """异步流式生成，支持 reasoning_content"""
        payload = self._get_request_payload(messages, stop=stop, **kwargs)
        payload["stream"] = True
        
        response = await self.async_client.create(**payload)
        
        async for chunk in response:
            if not chunk.choices:
                continue
                
            delta = chunk.choices[0].delta
            
            # 构建 additional_kwargs，包含 reasoning_content
            additional_kwargs = {}
            if hasattr(delta, "reasoning_content") and delta.reasoning_content:
                additional_kwargs["reasoning_content"] = delta.reasoning_content
            if hasattr(delta, "tool_calls") and delta.tool_calls:
                additional_kwargs["tool_calls"] = [
                    {
                        "index": tc.index,
                        "id": tc.id,
                        "function": {
                            "name": tc.function.name if tc.function else None,
                            "arguments": tc.function.arguments if tc.function else None,
                        },
                        "type": tc.type,
                    }
                    for tc in delta.tool_calls
                ]
            
            # 创建 AIMessageChunk
            message_chunk = AIMessageChunk(
                content=delta.content or "",
                additional_kwargs=additional_kwargs,
            )

            # 创建 ChatGenerationChunk
            # 保留usage信息以供LLM usage记录使用
            generation_info = {}
            if chunk.choices[0].finish_reason:
                generation_info["finish_reason"] = chunk.choices[0].finish_reason
            if hasattr(chunk, 'usage') and chunk.usage:
                generation_info["usage"] = chunk.usage

            gen_chunk = ChatGenerationChunk(
                message=message_chunk,
                generation_info=generation_info if generation_info else None,
            )

            if run_manager:
                await run_manager.on_llm_new_token(
                    gen_chunk.text,
                    chunk=gen_chunk,
                )

            yield gen_chunk
