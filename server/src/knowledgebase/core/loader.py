"""
文档加载器模块

支持从 RustFS(MinIO) 加载多种格式的文档
"""

import io
import tempfile
import os
from typing import List, Optional

from langchain_core.documents import Document
from pypdf import PdfReader
import docx2txt

from services.logging_service import logger


class DocumentLoader:
    """文档加载器"""
    
    # 支持的文件类型
    SUPPORTED_TYPES = {
        "pdf": "application/pdf",
        "txt": "text/plain",
        "md": "text/markdown",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    
    @classmethod
    def load_from_bytes(
        cls,
        content: bytes,
        file_type: str,
        metadata: Optional[dict] = None,
    ) -> List[Document]:
        """
        从字节内容加载文档
        
        Args:
            content: 文件字节内容
            file_type: 文件类型 (pdf/txt/md/docx)
            metadata: 文档元数据
            
        Returns:
            Document 列表
        """
        file_type = file_type.lower()
        
        if file_type == "pdf":
            return cls._load_pdf(content, metadata)
        elif file_type in ("txt", "md"):
            return cls._load_text(content, metadata)
        elif file_type == "docx":
            return cls._load_docx(content, metadata)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    @classmethod
    def _load_pdf(cls, content: bytes, metadata: Optional[dict] = None) -> List[Document]:
        """加载 PDF 文件"""
        documents = []
        
        try:
            pdf_reader = PdfReader(io.BytesIO(content))
            
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    doc_metadata = {
                        "source": "pdf",
                        "page": page_num + 1,
                        "total_pages": len(pdf_reader.pages),
                    }
                    if metadata:
                        doc_metadata.update(metadata)
                    
                    documents.append(Document(
                        page_content=text,
                        metadata=doc_metadata,
                    ))
                    
            logger.info(f"Loaded PDF with {len(documents)} pages")
            
        except Exception as e:
            logger.error(f"Failed to load PDF: {e}")
            raise
            
        return documents
    
    @classmethod
    def _load_text(cls, content: bytes, metadata: Optional[dict] = None) -> List[Document]:
        """加载文本文件 (TXT/MD)"""
        try:
            # 尝试多种编码
            text = None
            for encoding in ["utf-8", "gbk", "gb2312", "latin-1"]:
                try:
                    text = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if text is None:
                raise ValueError("Unable to decode text file with supported encodings")
            
            doc_metadata = {"source": "text"}
            if metadata:
                doc_metadata.update(metadata)
            
            logger.info(f"Loaded text file with {len(text)} characters")
            
            return [Document(page_content=text, metadata=doc_metadata)]
            
        except Exception as e:
            logger.error(f"Failed to load text file: {e}")
            raise
    
    @classmethod
    def _load_docx(cls, content: bytes, metadata: Optional[dict] = None) -> List[Document]:
        """加载 DOCX 文件"""
        try:
            # docx2txt 需要文件路径，使用临时文件
            with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                text = docx2txt.process(tmp_path)
            finally:
                os.unlink(tmp_path)
            
            if not text or not text.strip():
                return []
            
            doc_metadata = {"source": "docx"}
            if metadata:
                doc_metadata.update(metadata)
            
            logger.info(f"Loaded DOCX file with {len(text)} characters")
            
            return [Document(page_content=text, metadata=doc_metadata)]
            
        except Exception as e:
            logger.error(f"Failed to load DOCX file: {e}")
            raise
    
    @classmethod
    def get_file_type(cls, filename: str) -> str:
        """
        从文件名获取文件类型
        
        Args:
            filename: 文件名
            
        Returns:
            文件类型
        """
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext in cls.SUPPORTED_TYPES:
            return ext
        raise ValueError(f"Unsupported file extension: {ext}")
    
    @classmethod
    def is_supported(cls, filename: str) -> bool:
        """检查文件是否支持"""
        try:
            cls.get_file_type(filename)
            return True
        except ValueError:
            return False
