"""
FastEmbed 封装模块

提供单例模式的 Embedding 模型管理
"""

from typing import Dict, List
import asyncio

from langchain_community.embeddings import FastEmbedEmbeddings

from config import settings


class EmbeddingService:
    """Embedding 服务 (单例模式)"""
    
    _models: Dict[str, FastEmbedEmbeddings] = {}
    
    @classmethod
    def get_embeddings(cls, model_name: str = None) -> FastEmbedEmbeddings:
        """
        获取 Embedding 模型实例
        
        Args:
            model_name: 模型名称，默认使用配置中的模型
            
        Returns:
            FastEmbedEmbeddings 实例
        """
        if model_name is None:
            model_name = settings.kb.embedding_model
            
        if model_name not in cls._models:
            cls._models[model_name] = FastEmbedEmbeddings(
                model_name=model_name,
                cache_dir=settings.kb.embedding_cache_dir,
            )
        return cls._models[model_name]
    
    @classmethod
    async def embed_documents(
        cls, 
        texts: List[str], 
        model_name: str = None
    ) -> List[List[float]]:
        """
        异步批量生成文档向量
        
        Args:
            texts: 文本列表
            model_name: 模型名称
            
        Returns:
            向量列表
        """
        embeddings = cls.get_embeddings(model_name)
        # 使用 asyncio.to_thread 避免阻塞事件循环
        return await asyncio.to_thread(embeddings.embed_documents, texts)
    
    @classmethod
    async def embed_query(cls, text: str, model_name: str = None) -> List[float]:
        """
        异步生成查询向量
        
        Args:
            text: 查询文本
            model_name: 模型名称
            
        Returns:
            向量
        """
        embeddings = cls.get_embeddings(model_name)
        return await asyncio.to_thread(embeddings.embed_query, text)
