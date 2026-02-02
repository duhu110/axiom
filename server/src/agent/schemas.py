from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str
    content: str

class AgentRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    chat_history: List[ChatMessage] = []