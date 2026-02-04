from datetime import datetime
from typing import Generic, TypeVar, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


T = TypeVar("T")


class Response(BaseModel, Generic[T]):
    code: int = Field(0, description="状态码，0表示成功")
    msg: str = Field("ok", description="提示信息")
    data: T | None = Field(None, description="数据载荷")


class LLMUsageResponse(BaseModel):
    id: UUID
    user_id: UUID
    model_name: str
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    meta: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LLMUsageListResponse(BaseModel):
    items: list[LLMUsageResponse]
    total: int


class LLMUsageSummaryItem(BaseModel):
    group: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class LLMUsageSummaryResponse(BaseModel):
    items: list[LLMUsageSummaryItem]
