from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_async_db
from rustfs.service import RustfsService

def get_rustfs_service(db: AsyncSession = Depends(get_async_db)) -> RustfsService:
    """依赖注入获取 RustfsService"""
    return RustfsService(db)
