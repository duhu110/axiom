from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from functools import lru_cache
from typing import Annotated

from auth.dependencies import get_current_active_user
from auth.models import User
from .schemas import AgentRequest
from .service import AgentService

router = APIRouter()

# 使用 lru_cache 实现单例模式，避免每次请求都重新初始化 AgentService (编译图比较耗时)
@lru_cache()
def get_agent_service():
    return AgentService()

@router.post("/chat")
async def chat_endpoint(
    request: AgentRequest,
    service: AgentService = Depends(get_agent_service)
):
    # 如果请求中没有 session_id，使用固定 User ID 测试
    session_id = request.session_id or "f8133b8e-c488-45ee-82d3-466deb34768e"
    response = await service.chat(request.query, request.chat_history, session_id)
    return {"answer": response}

@router.post("/chat/stream")
async def chat_stream_endpoint(
    request: AgentRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: AgentService = Depends(get_agent_service),
):
    """
    SSE 流式接口
    """
    # 使用前端传递的 session_id，若无则生成默认
    session_id = request.session_id or "default-session"
    
    # 使用当前登录用户的 ID
    user_id = str(current_user.id)
    
    # 传递 user_id 到 service (通过 metadata)
    return StreamingResponse(
        service.chat_stream(request.query, request.chat_history, session_id, user_id=user_id),
        media_type="text/event-stream",
        headers={"X-Vercel-AI-Data-Stream": "v1"}
    )
