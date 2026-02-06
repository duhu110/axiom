import json
from typing import Any
from loguru import logger


def _safe_json_dumps(payload: Any) -> str:
    """Serialize payload for SSE logs while preserving non-JSON objects as strings."""
    return json.dumps(payload, ensure_ascii=False, default=str)

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

    # 临时调试模式：输出原始 LangGraph 事件，便于在 webtest 页面观察完整过程
    # （多智能体路由、检索、工具调用、chain/retriever 事件等）
    raw_event = {
        "event": kind,
        "name": event.get("name"),
        "run_id": event.get("run_id"),
        "parent_ids": event.get("parent_ids"),
        "tags": event.get("tags"),
        "metadata": event.get("metadata"),
        "data": event.get("data"),
    }
    debug_output = f'e:{_safe_json_dumps(raw_event)}\n'
    
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
                output += f'2:{_safe_json_dumps(reasoning)}\n'
            
            # Standard Content
            if hasattr(chunk, "content") and chunk.content:
                logger.info(f"SSE content: {chunk.content[:50]}")
                output += f'0:{_safe_json_dumps(chunk.content)}\n'
                
            return output + debug_output

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
        return f'9:{_safe_json_dumps(tool_call_def)}\n' + debug_output

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
        return f'a:{_safe_json_dumps(tool_result)}\n' + debug_output

    # 其余事件全部透传，方便在测试页中查看完整链路
    logger.debug(f"SSE passthrough event: {kind} name={event.get('name')}")
    return debug_output
