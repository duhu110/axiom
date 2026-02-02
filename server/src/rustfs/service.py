import uuid
from datetime import datetime
from typing import Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile

from config import settings
from rustfs import models, schemas
from rustfs.client import RustfsClient
from auth.models import User


class RustfsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = self._get_client()

    @staticmethod
    def _get_client() -> RustfsClient:
        return RustfsClient(
            endpoint=settings.storage.rustfs_endpoint,
            access_key=settings.storage.access_key,
            secret_key=settings.storage.secret_key,
            bucket_name=settings.storage.bucket_name,
            secure=settings.storage.secure,
        )

    def generate_object_key(self, module: str, resource: str, owner_id: uuid.UUID, filename: str) -> str:
        """生成对象存储 Key: {module}/{resource}/{yyyy}/{mm}/{owner_id}/{uuid}_{origin_name}"""
        now = datetime.now()
        yyyy = now.strftime("%Y")
        mm = now.strftime("%m")
        unique_id = uuid.uuid4().hex
        
        # 简单清洗文件名
        safe_filename = filename.replace(" ", "_").replace("/", "_")
        
        return f"{module}/{resource}/{yyyy}/{mm}/{str(owner_id)}/{unique_id}_{safe_filename}"

    async def upload_file(
        self, 
        user: User, 
        file_obj: UploadFile, 
        module: str, 
        resource: str,
        visibility: models.FileVisibility = models.FileVisibility.PRIVATE,
        related_type: str | None = None,
        related_id: str | None = None
    ) -> schemas.UploadResponse:
        """上传文件并记录元数据"""
        
        content = await file_obj.read()
        size = len(content)
        content_type = file_obj.content_type or "application/octet-stream"
        
        object_key = self.generate_object_key(module, resource, user.id, file_obj.filename)
        
        # 上传到 MinIO
        result = self.client.upload(object_key, content, content_type)
        etag = result.get("etag")
        
        # 写入数据库
        file_record = models.FileObject(
            module=module,
            resource=resource,
            object_key=object_key,
            owner_id=user.id,
            filename=file_obj.filename,
            size=size,
            content_type=content_type,
            etag=etag,
            visibility=visibility,
            related_type=related_type,
            related_id=related_id
        )
        self.db.add(file_record)
        await self.db.commit()
        await self.db.refresh(file_record)
        
        return schemas.UploadResponse(
            file_id=file_record.id,
            object_key=file_record.object_key
        )

    async def get_file(self, file_id: uuid.UUID) -> models.FileObject:
        """获取文件记录"""
        stmt = select(models.FileObject).where(models.FileObject.id == file_id)
        result = await self.db.execute(stmt)
        record = result.scalars().first()
        if not record:
            raise HTTPException(status_code=404, detail="File not found")
        return record

    async def download_file(self, file_id: uuid.UUID, user: User) -> Tuple[bytes, str]:
        """下载文件内容"""
        record = await self.get_file(file_id)
        
        # 权限校验 (强制鉴权后，user 一定存在)
        if record.visibility == models.FileVisibility.PRIVATE:
            if record.owner_id != user.id: 
                # TODO: 增加业务关联权限校验逻辑
                raise HTTPException(status_code=403, detail="Permission denied")
        
        content = self.client.download(record.object_key)
        return content, record.filename

    async def delete_file(self, file_id: uuid.UUID, user: User) -> bool:
        """删除文件"""
        record = await self.get_file(file_id)
        
        # 仅 Owner 可删除
        if record.owner_id != user.id:
             raise HTTPException(status_code=403, detail="Permission denied")
             
        # 从 MinIO 删除
        self.client.delete(record.object_key)
        
        # 从数据库删除
        await self.db.delete(record)
        await self.db.commit()
        return True
