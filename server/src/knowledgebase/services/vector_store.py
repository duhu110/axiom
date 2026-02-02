"""
向量存储服务

连接 axiom_kb 数据库的 PGVector 操作
"""

from typing import List, Optional
from uuid import UUID
import asyncio

from langchain_postgres.vectorstores import PGVector
from langchain_core.documents import Document

from config import settings
from knowledgebase.core.embedding import EmbeddingService
from services.logging_service import logger


def get_kb_connection_string() -> str:
    """获取 axiom_kb 的同步连接字符串"""
    uri = settings.db.uri_kb
    # asyncpg -> psycopg (同步驱动)
    if "+asyncpg" in uri:
        uri = uri.replace("+asyncpg", "+psycopg")
    return uri


class VectorStoreService:
    """向量存储服务"""
    
    _stores: dict = {}
    
    @classmethod
    def get_vector_store(
        cls,
        collection_name: str = "axiom_kb_vectors",
        embedding_model: str = None,
    ) -> PGVector:
        """
        获取向量存储实例
        
        Args:
            collection_name: 集合名称
            embedding_model: Embedding 模型
            
        Returns:
            PGVector 实例
        """
        if embedding_model is None:
            embedding_model = settings.kb.embedding_model
            
        cache_key = f"{collection_name}:{embedding_model}"
        
        if cache_key not in cls._stores:
            embeddings = EmbeddingService.get_embeddings(embedding_model)
            cls._stores[cache_key] = PGVector(
                embeddings=embeddings,
                collection_name=collection_name,
                connection=get_kb_connection_string(),
                use_jsonb=True,
            )
        
        return cls._stores[cache_key]
    
    @classmethod
    async def add_documents(
        cls,
        documents: List[Document],
        kb_id: UUID,
        doc_id: UUID,
        user_id: UUID,
        embedding_model: str = None,
    ) -> List[str]:
        """
        添加文档到向量存储
        
        Args:
            documents: 文档列表
            kb_id: 知识库ID
            doc_id: 文档ID
            user_id: 用户ID
            embedding_model: Embedding 模型
            
        Returns:
            向量ID列表
        """
        # 为每个文档添加元数据
        for doc in documents:
            doc.metadata.update({
                "kb_id": str(kb_id),
                "doc_id": str(doc_id),
                "user_id": str(user_id),
            })
        
        vector_store = cls.get_vector_store(embedding_model=embedding_model)
        
        # 使用线程池执行同步操作
        ids = await asyncio.to_thread(vector_store.add_documents, documents)
        
        logger.info(f"Added {len(ids)} vectors for doc {doc_id}")
        return ids
    
    @classmethod
    async def delete_by_doc_id(cls, doc_id: UUID, embedding_model: str = None) -> bool:
        """
        删除文档的所有向量
        
        Args:
            doc_id: 文档ID
            embedding_model: Embedding 模型
            
        Returns:
            是否成功
        """
        vector_store = cls.get_vector_store(embedding_model=embedding_model)
        
        try:
            # PGVector 支持按 metadata filter 删除
            await asyncio.to_thread(
                vector_store.delete,
                filter={"doc_id": str(doc_id)}
            )
            logger.info(f"Deleted vectors for doc {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete vectors for doc {doc_id}: {e}")
            return False
    
    @classmethod
    async def delete_by_kb_id(cls, kb_id: UUID, embedding_model: str = None) -> bool:
        """
        删除知识库的所有向量
        
        Args:
            kb_id: 知识库ID
            embedding_model: Embedding 模型
            
        Returns:
            是否成功
        """
        vector_store = cls.get_vector_store(embedding_model=embedding_model)
        
        try:
            await asyncio.to_thread(
                vector_store.delete,
                filter={"kb_id": str(kb_id)}
            )
            logger.info(f"Deleted all vectors for kb {kb_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete vectors for kb {kb_id}: {e}")
            return False
    
    @classmethod
    async def similarity_search(
        cls,
        query: str,
        kb_id: UUID,
        k: int = 4,
        score_threshold: Optional[float] = None,
        embedding_model: str = None,
    ) -> List[tuple]:
        """
        相似度搜索
        
        Args:
            query: 查询文本
            kb_id: 知识库ID
            k: 返回数量
            score_threshold: 分数阈值
            embedding_model: Embedding 模型
            
        Returns:
            (Document, score) 元组列表
        """
        vector_store = cls.get_vector_store(embedding_model=embedding_model)
        
        filter_dict = {"kb_id": str(kb_id)}
        
        if score_threshold is not None:
            results = await asyncio.to_thread(
                vector_store.similarity_search_with_relevance_scores,
                query,
                k=k,
                filter=filter_dict,
                score_threshold=score_threshold,
            )
        else:
            results = await asyncio.to_thread(
                vector_store.similarity_search_with_relevance_scores,
                query,
                k=k,
                filter=filter_dict,
            )
        
        return results
