"""
检索器工厂

为 Agent 模块提供标准的 LangChain Retriever 对象
"""

from typing import Optional, Literal
from uuid import UUID

from langchain_core.vectorstores import VectorStoreRetriever

from knowledgebase.services.vector_store import VectorStoreService, get_kb_connection_string
from knowledgebase.core.embedding import EmbeddingService
from services.logging_service import logger


class RetrieverFactory:
    """检索器工厂"""
    
    @classmethod
    def create_retriever(
        cls,
        kb_id: UUID,
        embedding_model: str = None,
        search_type: Literal["similarity", "mmr", "similarity_score_threshold"] = "similarity",
        k: int = 4,
        score_threshold: Optional[float] = None,
        fetch_k: int = 20,
        lambda_mult: float = 0.5,
    ) -> VectorStoreRetriever:
        """
        创建 LangChain Retriever 对象
        
        Args:
            kb_id: 知识库ID
            embedding_model: Embedding 模型
            search_type: 检索类型
                - similarity: 纯相似度检索
                - mmr: 最大边际相关性 (多样化结果)
                - similarity_score_threshold: 带分数阈值的相似度检索
            k: 返回结果数量
            score_threshold: 分数阈值 (仅 similarity_score_threshold 使用)
            fetch_k: MMR 初始获取数量
            lambda_mult: MMR 多样性参数
            
        Returns:
            VectorStoreRetriever 实例
        """
        vector_store = VectorStoreService.get_vector_store(embedding_model=embedding_model)
        
        # 构建 search_kwargs
        search_kwargs = {
            "k": k,
            "filter": {"kb_id": str(kb_id)},
        }
        
        # 根据检索类型添加额外参数
        if search_type == "mmr":
            search_kwargs["fetch_k"] = fetch_k
            search_kwargs["lambda_mult"] = lambda_mult
        elif search_type == "similarity_score_threshold" and score_threshold is not None:
            search_kwargs["score_threshold"] = score_threshold
        
        retriever = vector_store.as_retriever(
            search_type=search_type,
            search_kwargs=search_kwargs,
        )
        
        logger.debug(f"Created retriever for kb {kb_id} with type={search_type}, k={k}")
        
        return retriever
    
    @classmethod
    def create_multi_kb_retriever(
        cls,
        kb_ids: list[UUID],
        embedding_model: str = None,
        search_type: Literal["similarity", "mmr"] = "similarity",
        k: int = 4,
    ) -> VectorStoreRetriever:
        """
        创建多知识库检索器
        
        Args:
            kb_ids: 知识库ID列表
            embedding_model: Embedding 模型
            search_type: 检索类型
            k: 返回结果数量
            
        Returns:
            VectorStoreRetriever 实例
        """
        vector_store = VectorStoreService.get_vector_store(embedding_model=embedding_model)
        
        # 使用 $in 操作符匹配多个知识库
        search_kwargs = {
            "k": k,
            "filter": {"kb_id": {"$in": [str(kb_id) for kb_id in kb_ids]}},
        }
        
        retriever = vector_store.as_retriever(
            search_type=search_type,
            search_kwargs=search_kwargs,
        )
        
        logger.debug(f"Created multi-kb retriever for {len(kb_ids)} knowledge bases")
        
        return retriever
