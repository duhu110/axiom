import json
from datetime import datetime, timezone
from typing import Any
from loguru import logger


def _safe_json_dumps(payload: Any) -> str:
    """Serialize payload for SSE logs while preserving non-JSON objects as strings."""
    return json.dumps(payload, ensure_ascii=False, default=str)


def _build_debug_event(event: dict) -> dict:
    """Build a rich debug payload so webtest can inspect as much signal as possible."""
    kind = event.get("event")
    data = event.get("data") or {}

    debug_event = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "event": kind,
        "name": event.get("name"),
        "run_id": event.get("run_id"),
        "parent_ids": event.get("parent_ids"),
        "tags": event.get("tags"),
        "metadata": event.get("metadata"),
        "data": data,
        "keys": sorted(list(event.keys())),
        "raw": event,
    }

    # Add a normalized snapshot for chat stream chunks (chunk objects are otherwise stringified).
    if kind == "on_chat_model_stream":
        chunk = data.get("chunk")
        if chunk:
            debug_event["chunk_snapshot"] = {
                "type": type(chunk).__name__,
                "content": getattr(chunk, "content", None),
                "additional_kwargs": getattr(chunk, "additional_kwargs", None),
                "response_metadata": getattr(chunk, "response_metadata", None),
                "tool_call_chunks": getattr(chunk, "tool_call_chunks", None),
            }

    return debug_event


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

    # 调试模式：透传尽可能完整的原始事件，便于 webtest 全链路观测
    debug_output = f'e:{_safe_json_dumps(_build_debug_event(event))}\n'

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
            "args": tool_input,
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
            "result": str(output),
        }
        logger.info(f"Tool Call End: {tool_name} result={output}")
        return f'a:{_safe_json_dumps(tool_result)}\n' + debug_output

    # 处理 RAG 检索结果 (r: retrieval_result)
    elif kind == "on_chain_end" and event.get("name") == "search":
        data = event.get("data", {})
        output = data.get("output", {})
        documents = output.get("documents", [])

        # 从 input 获取查询信息（因为 output 只包含 documents）
        input_data = data.get("input", {})

        # 构建检索结果事件
        retrieval_result = {
            "documents": [],
        }

        # 处理每个文档，提取关键信息
        for doc in documents:
            # Document 对象可能有 page_content 和 metadata 属性
            # 或者是字符串表示（被序列化时）
            if hasattr(doc, "page_content"):
                content = doc.page_content[:500]  # 限制内容长度
                metadata = getattr(doc, "metadata", {})
            else:
                # 如果是字符串或其他格式，尝试转换
                content = str(doc)[:500]
                metadata = {}

            doc_info = {
                "content": content,
                "metadata": metadata,
            }
            retrieval_result["documents"].append(doc_info)

        logger.info(f"Retrieval Result: {len(documents)} documents found")
        return f'r:{_safe_json_dumps(retrieval_result)}\n' + debug_output

    # 其余事件全部透传，方便在测试页中查看完整链路
    logger.debug(f"SSE passthrough event: {kind} name={event.get('name')}")
    return debug_output
