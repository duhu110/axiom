"""
知识库模块异常定义
"""

from exceptions import AppError, ErrorCode


class KBException(AppError):
    """知识库基础异常"""
    
    def __init__(self, msg: str, status_code: int = 400):
        super().__init__(ErrorCode.UNKNOWN_ERROR, msg, status_code)


class KBNotFound(AppError):
    """知识库不存在"""
    
    def __init__(self, kb_id: str = None):
        msg = f"Knowledge base not found" if kb_id is None else f"Knowledge base {kb_id} not found"
        super().__init__(ErrorCode.NOT_FOUND, msg, status_code=404)


class DocumentNotFound(AppError):
    """文档不存在"""
    
    def __init__(self, doc_id: str = None):
        msg = f"Document not found" if doc_id is None else f"Document {doc_id} not found"
        super().__init__(ErrorCode.NOT_FOUND, msg, status_code=404)


class KBPermissionDenied(AppError):
    """无权访问知识库"""
    
    def __init__(self):
        super().__init__(ErrorCode.FORBIDDEN, "Permission denied", status_code=403)


class UnsupportedFileType(AppError):
    """不支持的文件类型"""
    
    def __init__(self, file_type: str):
        super().__init__(
            ErrorCode.VALIDATION_ERROR, 
            f"Unsupported file type: {file_type}", 
            status_code=400
        )


class DocumentProcessingError(AppError):
    """文档处理错误"""
    
    def __init__(self, msg: str):
        super().__init__(ErrorCode.UNKNOWN_ERROR, msg, status_code=500)
