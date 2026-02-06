import json
from typing import Any
from loguru import logger

def convert_to_vercel_sse(event: dict) -> str:
    """
    将 LangGraph 事件转换为 Vercel AI SDK Data Stream Protocol 格式
    参考: https://sdk.vercel.ai/docs/ai-sdk-ui/data-stream-protocol
    
    Args:
        event: LangGraph astream_events 产生的事件
        
    Returns:
        符合 Vercel 协议的 SSE 字符串，如果无需发送则返回空字符串
    """
    kind = event.get("event")
    
    # 处理模型生成的文本流
    if kind == "on_chat_model_stream":
        chunk = event.get("data", {}).get("chunk")
        if chunk:
            output = ""
            
            # DeepSeek Reasoning Content
            reasoning = None
            if hasattr(chunk, "additional_kwargs"):
                reasoning = chunk.additional_kwargs.get("reasoning_content")
            
            if reasoning:
                output += f'2:{json.dumps(reasoning)}\n'
            
            # Standard Content
            if hasattr(chunk, "content") and chunk.content:
                logger.info(f"SSE content: {chunk.content[:50]}")
                output += f'0:{json.dumps(chunk.content)}\n'
                
            return output

    # 处理工具调用 (9: tool_call)
    elif kind == "on_tool_start":
        data = event.get("data", {})
        tool_name = event.get("name")
        tool_input = data.get("input")
        run_id = event.get("run_id")
        
        tool_call_def = {
            "toolCallId": run_id,
            "toolName": tool_name,
            "args": tool_input
        }
        logger.info(f"Tool Call Start: {tool_name} args={tool_input}")
        return f'9:{json.dumps(tool_call_def)}\n'

    # 处理工具执行结果 (a: tool_result)
    elif kind == "on_tool_end":
        data = event.get("data", {})
        output = data.get("output")
        tool_name = event.get("name")
        run_id = event.get("run_id")
        
        tool_result = {
            "toolCallId": run_id,
            "result": str(output)
        }
        logger.info(f"Tool Call End: {tool_name} result={output}")
        return f'a:{json.dumps(tool_result)}\n'
    
    return ""
