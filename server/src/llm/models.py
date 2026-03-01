import uuid
from datetime import datetime
from typing import Literal

from sqlalchemy import Boolean, DateTime, Integer, String, ForeignKey, JSON, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from models import Base


# LLM 模型供应商类型
ProviderType = Literal["deepseek", "dashscope", "openai_compatible"]


class LLMModel(Base):
    """LLM 模型配置表"""
    __tablename__ = "llm_model"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="主键"
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="供应商：deepseek / dashscope / openai_compatible"
    )
    base_url: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="API 端点"
    )
    api_key: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="密钥"
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="显示名称（如 DeepSeek-V3）"
    )
    model_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="调用标识（某些平台需要 ID 而非名称）"
    )
    use_model_id: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="调用时使用 model_id 还是 model_name"
    )
    support_reasoning: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="支持推理思考（思维链）"
    )
    support_image: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="支持图片输入"
    )
    support_file: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="支持文件输入"
    )
    support_batch: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="支持批处理"
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        comment="全局唯一默认模型"
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="是否启用"
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="排序字段"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="更新时间"
    )

    __table_args__ = (
        Index("ix_llm_model_provider_enabled", "provider", "is_enabled"),
    )


class LLMUsage(Base):
    __tablename__ = "llm_usage"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="用户ID",
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="模型名称",
    )
    prompt_tokens: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="输入Token",
    )
    completion_tokens: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="输出Token",
    )
    total_tokens: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="总Token",
    )
    request_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        comment="请求追踪ID",
    )
    trace_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        comment="链路追踪ID",
    )
    meta: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        comment="元数据",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="调用时间",
    )
