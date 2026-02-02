"""
知识库模块依赖注入
"""

from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from auth.dependencies import get_current_active_user
from auth.models import User
from knowledgebase.models import KnowledgeBase
from knowledgebase.services.kb_service import KBService
from knowledgebase import exceptions


async def get_kb_service(
    db: Annotated[AsyncSession, Depends(get_async_db)]
) -> KBService:
    """获取知识库服务"""
    return KBService(db)


async def get_kb_with_permission(
    kb_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
) -> KnowledgeBase:
    """
    获取知识库并验证权限
    
    私有知识库只能被所有者访问
    """
    kb = await service.get_kb_with_permission(kb_id, current_user.id)
    if kb is None:
        raise exceptions.KBNotFound(str(kb_id))
    return kb


async def get_kb_owner_only(
    kb_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
) -> KnowledgeBase:
    """
    获取知识库 (仅所有者)
    
    用于需要修改权限的操作
    """
    kb = await service.get_kb(kb_id)
    if kb is None:
        raise exceptions.KBNotFound(str(kb_id))
    if kb.user_id != current_user.id:
        raise exceptions.KBPermissionDenied()
    return kb
