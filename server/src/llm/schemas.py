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


# LLM 模型相关 Schema


class LLMModelResponse(BaseModel):
    """LLM 模型响应"""
    id: UUID
    provider: str
    model_name: str
    support_reasoning: bool
    support_image: bool
    support_file: bool
    support_batch: bool
    is_default: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class LLMModelListResponse(BaseModel):
    """LLM 模型列表响应"""
    items: list[LLMModelResponse]
