import uuid
import enum
from sqlalchemy import String, BigInteger, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from models import Base, TimestampMixin


class FileVisibility(str, enum.Enum):
    PRIVATE = "private"
    PUBLIC = "public"


class FileObject(Base, TimestampMixin):
    __tablename__ = "file_objects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module: Mapped[str] = mapped_column(String, index=True, nullable=False, comment="业务模块")
    resource: Mapped[str] = mapped_column(String, index=True, nullable=False, comment="资源类型")
    object_key: Mapped[str] = mapped_column(String, unique=True, nullable=False, comment="对象存储Key")
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False, comment="所有者ID")
    
    filename: Mapped[str] = mapped_column(String, nullable=False, comment="原始文件名")
    size: Mapped[int] = mapped_column(BigInteger, nullable=False, comment="文件大小(字节)")
    content_type: Mapped[str] = mapped_column(String, nullable=False, comment="MIME类型")
    etag: Mapped[str | None] = mapped_column(String, nullable=True, comment="ETag")
    
    visibility: Mapped[FileVisibility] = mapped_column(
        SAEnum(FileVisibility, native_enum=False), 
        default=FileVisibility.PRIVATE, 
        nullable=False, 
        comment="可见性"
    )
    
    # Optional business binding
    related_type: Mapped[str | None] = mapped_column(String, index=True, nullable=True, comment="关联业务类型")
    related_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True, comment="关联业务ID")
