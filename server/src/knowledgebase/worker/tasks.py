"""
Celery 任务定义

文档处理任务: 下载 -> 加载 -> 切分 -> 向量化 -> 入库
"""

import asyncio
from uuid import UUID
from typing import Optional

from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import settings
from knowledgebase.models import KnowledgeBase, KBDocument, DocumentStatus
from knowledgebase.core.loader import DocumentLoader
from knowledgebase.core.splitter import DocumentSplitter
from knowledgebase.services.vector_store import VectorStoreService
from rustfs.client import get_rustfs_client


logger = get_task_logger(__name__)


def get_async_session() -> async_sessionmaker[AsyncSession]:
    """获取异步数据库会话工厂"""
    engine = create_async_engine(
        settings.db.uri_app,
        echo=settings.db.echo,
    )
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def _process_document_async(doc_id: str) -> dict:
    """
    异步处理文档
    
    Args:
        doc_id: 文档ID
        
    Returns:
        处理结果
    """
    doc_uuid = UUID(doc_id)
    AsyncSessionLocal = get_async_session()
    
    async with AsyncSessionLocal() as db:
        # 1. 获取文档记录
        result = await db.execute(
            select(KBDocument).where(KBDocument.id == doc_uuid)
        )
        doc = result.scalars().first()
        
        if doc is None:
            raise ValueError(f"Document {doc_id} not found")
        
        # 2. 获取知识库配置
        result = await db.execute(
            select(KnowledgeBase).where(KnowledgeBase.id == doc.kb_id)
        )
        kb = result.scalars().first()
        
        if kb is None:
            raise ValueError(f"Knowledge base {doc.kb_id} not found")
        
        try:
            # 3. 更新状态为 PROCESSING
            doc.status = DocumentStatus.PROCESSING
            await db.commit()
            
            logger.info(f"Processing document {doc_id}: {doc.title}")
            
            # 4. 从 RustFS 下载文件
            logger.info(f"Downloading file from {doc.file_key}")
            client = get_rustfs_client()
            content = client.download(doc.file_key)
            
            # 5. 加载文档
            logger.info(f"Loading document, type={doc.file_type}")
            metadata = {
                "title": doc.title,
                "file_type": doc.file_type,
            }
            documents = DocumentLoader.load_from_bytes(
                content=content,
                file_type=doc.file_type,
                metadata=metadata,
            )
            
            if not documents:
                raise ValueError("No content extracted from document")
            
            # 6. 切分文档
            logger.info(f"Splitting documents with chunk_size={kb.chunk_size}")
            chunks = DocumentSplitter.split_documents(
                documents=documents,
                chunk_size=kb.chunk_size,
                chunk_overlap=kb.chunk_overlap,
                file_type=doc.file_type,
            )
            
            logger.info(f"Split into {len(chunks)} chunks")
            
            # 7. 向量化并入库
            logger.info("Adding documents to vector store")
            ids = await VectorStoreService.add_documents(
                documents=chunks,
                kb_id=kb.id,
                doc_id=doc.id,
                user_id=kb.user_id,
                embedding_model=kb.embedding_model,
            )
            
            # 8. 更新状态为 INDEXED
            doc.status = DocumentStatus.INDEXED
            doc.chunk_count = len(chunks)
            doc.error_msg = None
            await db.commit()
            
            logger.info(f"Document {doc_id} indexed successfully with {len(chunks)} chunks")
            
            return {
                "status": "success",
                "doc_id": doc_id,
                "chunk_count": len(chunks),
                "vector_ids": ids,
            }
            
        except Exception as e:
            # 更新状态为 FAILED
            logger.error(f"Failed to process document {doc_id}: {e}")
            doc.status = DocumentStatus.FAILED
            doc.error_msg = str(e)
            await db.commit()
            raise


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 60},
    retry_backoff=True,
)
def process_document(self, doc_id: str) -> dict:
    """
    处理文档任务
    
    Args:
        doc_id: 文档ID (字符串格式)
        
    Returns:
        处理结果
    """
    logger.info(f"Starting document processing task for {doc_id}")
    
    try:
        # 在新的事件循环中运行异步代码
        result = asyncio.run(_process_document_async(doc_id))
        return result
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        raise


@shared_task
def retry_failed_document(doc_id: str) -> dict:
    """
    重试失败的文档
    
    Args:
        doc_id: 文档ID
        
    Returns:
        处理结果
    """
    logger.info(f"Retrying failed document {doc_id}")
    return process_document(doc_id)
