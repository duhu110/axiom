"""
知识库业务服务

处理知识库和文档的 CRUD 操作
"""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from knowledgebase.config import KBConfig
from knowledgebase.models import KnowledgeBase, KBDocument, DocumentStatus, KBVisibility
from knowledgebase.schemas import (
    KBCreateRequest, 
    KBUpdateRequest, 
    KBResponse, 
    DocumentResponse,
)
from knowledgebase.services.vector_store import VectorStoreService
from services.logging_service import logger


class KBService:
    """知识库服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==================== 知识库操作 ====================
    
    async def create_kb(self, user_id: UUID, data: KBCreateRequest) -> KnowledgeBase:
        """
        创建知识库
        
        Args:
            user_id: 用户ID
            data: 创建请求
            
        Returns:
            KnowledgeBase 实例
        """
        kb = KnowledgeBase(
            user_id=user_id,
            name=data.name,
            description=data.description,
            visibility=data.visibility,
            embedding_model=KBConfig.EMBEDDING_MODEL,
            chunk_size=KBConfig.CHUNK_SIZE,
            chunk_overlap=KBConfig.CHUNK_OVERLAP,
        )
        
        self.db.add(kb)
        await self.db.commit()
        await self.db.refresh(kb)
        
        logger.info(f"Created knowledge base {kb.id} for user {user_id}")
        return kb
    
    async def get_kb(self, kb_id: UUID) -> Optional[KnowledgeBase]:
        """获取知识库"""
        result = await self.db.execute(
            select(KnowledgeBase).where(KnowledgeBase.id == kb_id)
        )
        return result.scalars().first()
    
    async def get_kb_with_permission(
        self, 
        kb_id: UUID, 
        user_id: UUID
    ) -> Optional[KnowledgeBase]:
        """
        获取知识库 (带权限检查)
        
        私有知识库只能被所有者访问
        """
        kb = await self.get_kb(kb_id)
        if kb is None:
            return None
        
        # 公开知识库任何人可访问
        if kb.visibility == KBVisibility.PUBLIC:
            return kb
        
        # 私有知识库只有所有者可访问
        if kb.user_id == user_id:
            return kb
        
        return None
    
    async def get_user_kbs(
        self, 
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[KnowledgeBase], int]:
        """
        获取用户的知识库列表
        
        Args:
            user_id: 用户ID
            skip: 跳过数量
            limit: 返回数量
            
        Returns:
            (知识库列表, 总数)
        """
        # 查询总数
        count_result = await self.db.execute(
            select(func.count()).select_from(KnowledgeBase).where(
                KnowledgeBase.user_id == user_id
            )
        )
        total = count_result.scalar()
        
        # 查询列表
        result = await self.db.execute(
            select(KnowledgeBase)
            .where(KnowledgeBase.user_id == user_id)
            .order_by(KnowledgeBase.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(result.scalars().all())
        
        return items, total
    
    async def update_kb(
        self, 
        kb_id: UUID, 
        user_id: UUID, 
        data: KBUpdateRequest
    ) -> Optional[KnowledgeBase]:
        """更新知识库"""
        kb = await self.get_kb(kb_id)
        if kb is None or kb.user_id != user_id:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(kb, key, value)
        
        await self.db.commit()
        await self.db.refresh(kb)
        
        logger.info(f"Updated knowledge base {kb_id}")
        return kb
    
    async def delete_kb(self, kb_id: UUID, user_id: UUID) -> bool:
        """
        删除知识库
        
        同时删除所有文档和向量
        """
        kb = await self.get_kb(kb_id)
        if kb is None or kb.user_id != user_id:
            return False
        
        # 删除向量存储中的数据
        await VectorStoreService.delete_by_kb_id(kb_id, kb.embedding_model)
        
        # 删除数据库记录 (级联删除文档)
        await self.db.delete(kb)
        await self.db.commit()
        
        logger.info(f"Deleted knowledge base {kb_id}")
        return True
    
    # ==================== 文档操作 ====================
    
    async def create_document(
        self,
        kb_id: UUID,
        title: str,
        file_key: str,
        file_type: str,
        file_size: int,
    ) -> KBDocument:
        """
        创建文档记录
        
        Args:
            kb_id: 知识库ID
            title: 文档标题
            file_key: RustFS 文件路径
            file_type: 文件类型
            file_size: 文件大小
            
        Returns:
            KBDocument 实例
        """
        doc = KBDocument(
            kb_id=kb_id,
            title=title,
            file_key=file_key,
            file_type=file_type,
            file_size=file_size,
            status=DocumentStatus.PROCESSING,
        )
        
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)
        
        logger.info(f"Created document {doc.id} in kb {kb_id}")
        return doc
    
    async def get_document(self, doc_id: UUID) -> Optional[KBDocument]:
        """获取文档"""
        result = await self.db.execute(
            select(KBDocument).where(KBDocument.id == doc_id)
        )
        return result.scalars().first()
    
    async def get_kb_documents(
        self,
        kb_id: UUID,
        skip: int = 0,
        limit: int = 20,
        status: Optional[DocumentStatus] = None,
    ) -> Tuple[List[KBDocument], int]:
        """
        获取知识库的文档列表
        
        Args:
            kb_id: 知识库ID
            skip: 跳过数量
            limit: 返回数量
            status: 状态过滤
            
        Returns:
            (文档列表, 总数)
        """
        query = select(KBDocument).where(KBDocument.kb_id == kb_id)
        count_query = select(func.count()).select_from(KBDocument).where(
            KBDocument.kb_id == kb_id
        )
        
        if status is not None:
            query = query.where(KBDocument.status == status)
            count_query = count_query.where(KBDocument.status == status)
        
        # 总数
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()
        
        # 列表
        result = await self.db.execute(
            query.order_by(KBDocument.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(result.scalars().all())
        
        return items, total
    
    async def update_document_status(
        self,
        doc_id: UUID,
        status: DocumentStatus,
        error_msg: Optional[str] = None,
        chunk_count: Optional[int] = None,
    ) -> Optional[KBDocument]:
        """更新文档状态"""
        doc = await self.get_document(doc_id)
        if doc is None:
            return None
        
        doc.status = status
        if error_msg is not None:
            doc.error_msg = error_msg
        if chunk_count is not None:
            doc.chunk_count = chunk_count
        
        await self.db.commit()
        await self.db.refresh(doc)
        
        logger.info(f"Updated document {doc_id} status to {status}")
        return doc
    
    async def delete_document(self, doc_id: UUID, user_id: UUID) -> bool:
        """
        删除文档
        
        同时删除向量存储中的数据
        """
        doc = await self.get_document(doc_id)
        if doc is None:
            return False
        
        # 验证权限
        kb = await self.get_kb(doc.kb_id)
        if kb is None or kb.user_id != user_id:
            return False
        
        # 删除向量
        await VectorStoreService.delete_by_doc_id(doc_id, kb.embedding_model)
        
        # 删除数据库记录
        await self.db.delete(doc)
        await self.db.commit()
        
        logger.info(f"Deleted document {doc_id}")
        return True
    
    async def get_failed_documents(
        self, 
        kb_id: Optional[UUID] = None
    ) -> List[KBDocument]:
        """获取失败的文档"""
        query = select(KBDocument).where(KBDocument.status == DocumentStatus.FAILED)
        if kb_id is not None:
            query = query.where(KBDocument.kb_id == kb_id)
        
        result = await self.db.execute(query.order_by(KBDocument.updated_at.desc()))
        return list(result.scalars().all())
