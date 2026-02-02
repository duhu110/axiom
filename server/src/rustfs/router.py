from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, Form
from fastapi.responses import StreamingResponse
import io

from database import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession

from response import success
from rustfs.dependencies import get_rustfs_service
from rustfs.service import RustfsService
from rustfs import schemas, models
from auth.dependencies import get_current_active_user, get_current_user
from auth.models import User

router = APIRouter(prefix="/files", tags=["Files"])


@router.post("/upload", response_model=schemas.UploadResponse)
async def upload_file(
    file: Annotated[UploadFile, File()],
    module: Annotated[str, Form()],
    resource: Annotated[str, Form()],
    visibility: Annotated[models.FileVisibility, Form()] = models.FileVisibility.PRIVATE,
    related_type: Annotated[str | None, Form()] = None,
    related_id: Annotated[str | None, Form()] = None,
    service: Annotated[RustfsService, Depends(get_rustfs_service)] = None,
    current_user: Annotated[User, Depends(get_current_active_user)] = None,
):
    """上传文件"""
    return await service.upload_file(
        user=current_user,
        file_obj=file,
        module=module,
        resource=resource,
        visibility=visibility,
        related_type=related_type,
        related_id=related_id
    )


@router.post("/download/{file_id}")
async def download_file(
    file_id: UUID,
    service: Annotated[RustfsService, Depends(get_rustfs_service)],
    current_user: Annotated[User, Depends(get_current_user)], # 强制要求 Token
):
    """下载文件 (POST)"""
    content, filename = await service.download_file(file_id, user=current_user)
    
    # 返回流式响应
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{file_id}")
async def delete_file(
    file_id: UUID,
    service: Annotated[RustfsService, Depends(get_rustfs_service)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """删除文件 (POST)"""
    result = await service.delete_file(file_id, user=current_user)
    return success({"deleted": result})
