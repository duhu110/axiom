"""
知识库 Pydantic 模型

包含请求/响应模型定义
"""

from datetime import datetime
from typing import Generic, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from knowledgebase.models import KBVisibility, DocumentStatus


# ==================== 通用响应 ====================

T = TypeVar("T")


class Response(BaseModel, Generic[T]):
    """通用响应包装"""
    code: int = Field(0, description="状态码，0表示成功")
    msg: str = Field("ok", description="提示信息")
    data: T | None = Field(None, description="数据载荷")


# ==================== 知识库相关 ====================

class KBCreateRequest(BaseModel):
    """创建知识库请求"""
    name: str = Field(..., min_length=1, max_length=100, description="知识库名称")
    description: Optional[str] = Field(None, max_length=500, description="描述")
    visibility: KBVisibility = Field(KBVisibility.PRIVATE, description="可见性")


class KBUpdateRequest(BaseModel):
    """更新知识库请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="知识库名称")
    description: Optional[str] = Field(None, max_length=500, description="描述")
    visibility: Optional[KBVisibility] = Field(None, description="可见性")


class KBDeleteRequest(BaseModel):
    """删除知识库请求"""
    kb_id: UUID = Field(..., description="知识库ID")


class KBResponse(BaseModel):
    """知识库响应"""
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    visibility: KBVisibility
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KBListResponse(BaseModel):
    """知识库列表响应"""
    items: list[KBResponse]
    total: int


# ==================== 文档相关 ====================

class DocumentUploadResponse(BaseModel):
    """文档上传响应"""
    id: UUID = Field(..., description="文档ID")
    title: str = Field(..., description="文档标题")
    status: DocumentStatus = Field(..., description="处理状态")
    file_type: str = Field(..., description="文件类型")
    file_size: int = Field(..., description="文件大小")


class DocumentDeleteRequest(BaseModel):
    """删除文档请求"""
    doc_id: UUID = Field(..., description="文档ID")


class DocumentRetryRequest(BaseModel):
    """重试文档处理请求"""
    doc_id: UUID = Field(..., description="文档ID")


class DocumentResponse(BaseModel):
    """文档响应"""
    id: UUID
    kb_id: UUID
    title: str
    file_key: str
    file_type: str
    file_size: int
    status: DocumentStatus
    error_msg: Optional[str] = None
    chunk_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    """文档列表响应"""
    items: list[DocumentResponse]
    total: int


# ==================== 检索相关 ====================

class SearchTestRequest(BaseModel):
    """检索测试请求"""
    query: str = Field(..., min_length=1, max_length=500, description="查询文本")
    top_k: int = Field(4, ge=1, le=20, description="返回结果数量")
    score_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="分数阈值")


class SearchResultItem(BaseModel):
    """检索结果项"""
    content: str = Field(..., description="文档内容")
    score: float = Field(..., description="相似度分数")
    metadata: dict = Field(default_factory=dict, description="元数据")


class SearchTestResponse(BaseModel):
    """检索测试响应"""
    query: str
    results: list[SearchResultItem]
    total: int
