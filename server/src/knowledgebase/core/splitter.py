"""
文档切分模块

提供针对中文优化的文本切分器
"""

from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownTextSplitter
from langchain_core.documents import Document

from config import settings


class DocumentSplitter:
    """文档切分器"""
    
    # 中文优化分隔符
    CHINESE_SEPARATORS = [
        "\n\n",  # 段落
        "\n",    # 换行
        "。",    # 句号
        "！",    # 感叹号
        "？",    # 问号
        "；",    # 分号
        "，",    # 逗号
        " ",     # 空格
        "",      # 字符
    ]
    
    @classmethod
    def create_splitter(
        cls,
        chunk_size: int = None,
        chunk_overlap: int = None,
        file_type: str = None,
    ) -> RecursiveCharacterTextSplitter:
        """
        创建文本切分器
        
        Args:
            chunk_size: 切片大小
            chunk_overlap: 切片重叠
            file_type: 文件类型 (用于选择分隔符策略)
            
        Returns:
            TextSplitter 实例
        """
        if chunk_size is None:
            chunk_size = settings.kb.chunk_size
        if chunk_overlap is None:
            chunk_overlap = settings.kb.chunk_overlap
            
        # Markdown 文件使用专用切分器
        if file_type and file_type.lower() in ("md", "markdown"):
            return MarkdownTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
        
        # 默认使用中文优化的递归切分器
        return RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=cls.CHINESE_SEPARATORS,
            keep_separator=True,
            length_function=len,
        )
    
    @classmethod
    def split_documents(
        cls,
        documents: List[Document],
        chunk_size: int = None,
        chunk_overlap: int = None,
        file_type: str = None,
    ) -> List[Document]:
        """
        切分文档列表
        
        Args:
            documents: 文档列表
            chunk_size: 切片大小
            chunk_overlap: 切片重叠
            file_type: 文件类型
            
        Returns:
            切分后的文档列表
        """
        splitter = cls.create_splitter(chunk_size, chunk_overlap, file_type)
        return splitter.split_documents(documents)
    
    @classmethod
    def split_text(
        cls,
        text: str,
        chunk_size: int = None,
        chunk_overlap: int = None,
        file_type: str = None,
    ) -> List[str]:
        """
        切分文本
        
        Args:
            text: 文本内容
            chunk_size: 切片大小
            chunk_overlap: 切片重叠
            file_type: 文件类型
            
        Returns:
            切分后的文本列表
        """
        splitter = cls.create_splitter(chunk_size, chunk_overlap, file_type)
        return splitter.split_text(text)
