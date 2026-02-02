"""
知识库数据模型

Tables:
- knowledge_base: 知识库表
- kb_document: 文档表
"""

import uuid
import enum
from sqlalchemy import String, Text, Integer, BigInteger, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models import Base, TimestampMixin


class KBVisibility(str, enum.Enum):
    """知识库可见性"""
    PRIVATE = "private"
    PUBLIC = "public"


class DocumentStatus(str, enum.Enum):
    """文档处理状态"""
    PROCESSING = "processing"  # 处理中
    INDEXED = "indexed"        # 已索引
    FAILED = "failed"          # 失败


class KnowledgeBase(Base, TimestampMixin):
    """知识库表"""
    __tablename__ = "knowledge_bases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True, 
        nullable=False, 
        comment="所属用户ID"
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="知识库名称"
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="描述"
    )
    visibility: Mapped[KBVisibility] = mapped_column(
        SAEnum(KBVisibility, native_enum=False),
        default=KBVisibility.PRIVATE,
        nullable=False,
        comment="可见性"
    )
    embedding_model: Mapped[str] = mapped_column(
        String(100), 
        default="BAAI/bge-small-zh-v1.5", 
        nullable=False, 
        comment="Embedding模型"
    )
    chunk_size: Mapped[int] = mapped_column(
        Integer, default=500, nullable=False, comment="切片大小"
    )
    chunk_overlap: Mapped[int] = mapped_column(
        Integer, default=50, nullable=False, comment="切片重叠"
    )
    
    # Relationships
    documents: Mapped[list["KBDocument"]] = relationship(
        "KBDocument", back_populates="knowledge_base", cascade="all, delete-orphan"
    )


class KBDocument(Base, TimestampMixin):
    """知识库文档表"""
    __tablename__ = "kb_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    kb_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="所属知识库ID"
    )
    title: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="文档标题"
    )
    file_key: Mapped[str] = mapped_column(
        String(500), nullable=False, comment="RustFS文件路径"
    )
    file_type: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="文件类型(pdf/txt/md/docx)"
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger, nullable=False, comment="文件大小(字节)"
    )
    status: Mapped[DocumentStatus] = mapped_column(
        SAEnum(DocumentStatus, native_enum=False),
        default=DocumentStatus.PROCESSING,
        nullable=False,
        index=True,
        comment="处理状态"
    )
    error_msg: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="错误信息"
    )
    chunk_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="切片数量"
    )
    
    # Relationships
    knowledge_base: Mapped["KnowledgeBase"] = relationship(
        "KnowledgeBase", back_populates="documents"
    )
