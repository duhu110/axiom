from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from rustfs.models import FileVisibility

class FileObjectBase(BaseModel):
    module: str
    resource: str
    filename: str
    size: int
    content_type: str
    visibility: FileVisibility = FileVisibility.PRIVATE
    related_type: str | None = None
    related_id: str | None = None

class FileObjectCreate(FileObjectBase):
    object_key: str
    owner_id: UUID
    etag: str | None = None

class FileObjectRead(FileObjectBase):
    id: UUID
    object_key: str
    owner_id: UUID
    etag: str | None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UploadResponse(BaseModel):
    file_id: UUID
    url: str | None = None 
