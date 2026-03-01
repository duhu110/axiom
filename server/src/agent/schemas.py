from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID


class ChatMessage(BaseModel):
    role: str
    content: str


class AgentRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    kb_id: Optional[str] = None
    model_id: Optional[UUID] = None
    chat_history: List[ChatMessage] = []
