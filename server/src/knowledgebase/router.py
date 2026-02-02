"""
知识库 API 路由

全部使用 POST 方法
"""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from auth.dependencies import get_current_active_user
from auth.models import User
from response import success
from services.logging_service import logger
from knowledgebase import schemas, exceptions
from knowledgebase.models import KnowledgeBase, DocumentStatus
from knowledgebase.dependencies import get_kb_service, get_kb_with_permission, get_kb_owner_only
from knowledgebase.services.kb_service import KBService
from knowledgebase.services.vector_store import VectorStoreService
from knowledgebase.core.loader import DocumentLoader
from knowledgebase.worker.celery_app import celery_app  # 确保 Celery app 初始化
from knowledgebase.worker.tasks import process_document, retry_failed_document
from rustfs.client import get_rustfs_client


router = APIRouter(prefix="/api/kb", tags=["Knowledge Base"])


# ==================== 知识库管理 ====================

@router.post(
    "/create",
    response_model=schemas.Response[schemas.KBResponse],
    summary="创建知识库",
    description="创建新的知识库实例，配置 Embedding 模型和切分参数",
)
async def create_knowledge_base(
    data: schemas.KBCreateRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
):
    """
    创建知识库
    
    - **name**: 知识库名称 (1-100字符)
    - **description**: 描述 (可选)
    - **visibility**: 可见性 (private/public)
    - **embedding_model**: Embedding 模型
    - **chunk_size**: 切片大小 (100-2000)
    - **chunk_overlap**: 切片重叠 (0-500)
    """
    logger.info(f"Creating knowledge base '{data.name}' for user {current_user.id}")
    kb = await service.create_kb(current_user.id, data)
    logger.info(f"Knowledge base {kb.id} created successfully")
    return success(schemas.KBResponse.model_validate(kb))


@router.post(
    "/delete",
    summary="删除知识库",
    description="删除知识库及其所有文档和向量数据",
)
async def delete_knowledge_base(
    data: schemas.KBDeleteRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
):
    """
    删除知识库
    
    - **kb_id**: 知识库ID
    """
    logger.info(f"Deleting knowledge base {data.kb_id}")
    result = await service.delete_kb(data.kb_id, current_user.id)
    if not result:
        raise exceptions.KBNotFound(str(data.kb_id))
    logger.info(f"Knowledge base {data.kb_id} deleted")
    return success({"deleted": True})


@router.post(
    "/list",
    response_model=schemas.Response[schemas.KBListResponse],
    summary="获取知识库列表",
    description="获取当前用户的知识库列表",
)
async def list_knowledge_bases(
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
    skip: int = Query(0, ge=0, description="跳过数量"),
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
):
    """
    获取用户的知识库列表
    """
    items, total = await service.get_user_kbs(current_user.id, skip, limit)
    return success({
        "items": [schemas.KBResponse.model_validate(kb) for kb in items],
        "total": total,
    })


# ==================== 文档管理 ====================

@router.post(
    "/{kb_id}/document/upload",
    response_model=schemas.Response[schemas.DocumentUploadResponse],
    summary="上传文档",
    description="上传文档到知识库，触发异步处理任务",
)
async def upload_document(
    kb_id: UUID,
    file: Annotated[UploadFile, File(description="文档文件 (PDF/TXT/MD/DOCX)")],
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
    title: Optional[str] = Form(None, description="文档标题，默认使用文件名"),
):
    """
    上传文档到知识库
    
    支持的文件类型: PDF, TXT, MD, DOCX
    
    上传后会触发异步处理任务:
    1. 文件存储到 RustFS
    2. 文档解析和切分
    3. 向量化并入库
    """
    # 验证知识库权限
    kb = await service.get_kb(kb_id)
    if kb is None or kb.user_id != current_user.id:
        raise exceptions.KBNotFound(str(kb_id))
    
    # 验证文件类型
    filename = file.filename or "unknown"
    if not DocumentLoader.is_supported(filename):
        raise exceptions.UnsupportedFileType(filename.rsplit(".", 1)[-1] if "." in filename else "unknown")
    
    file_type = DocumentLoader.get_file_type(filename)
    doc_title = title or filename
    
    logger.info(f"Uploading document '{doc_title}' to kb {kb_id}")
    
    # 读取文件内容
    content = await file.read()
    file_size = len(content)
    
    # 上传到 RustFS
    # 路径格式: kb/{kb_id}/{doc_id}_{filename}
    import uuid as uuid_module
    doc_id = uuid_module.uuid4()
    safe_filename = filename.replace(" ", "_").replace("/", "_")
    file_key = f"kb/{kb_id}/{doc_id}_{safe_filename}"
    
    client = get_rustfs_client()
    content_type = file.content_type or "application/octet-stream"
    client.upload(file_key, content, content_type)
    
    logger.info(f"File uploaded to RustFS: {file_key}")
    
    # 创建文档记录
    doc = await service.create_document(
        kb_id=kb_id,
        title=doc_title,
        file_key=file_key,
        file_type=file_type,
        file_size=file_size,
    )
    
    # 触发异步处理任务
    task = process_document.delay(str(doc.id))
    logger.info(f"Document processing task {task.id} queued for doc {doc.id}")
    
    return success({
        "id": doc.id,
        "title": doc.title,
        "status": doc.status,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
    })


@router.post(
    "/document/delete",
    summary="删除文档",
    description="删除文档及其向量数据",
)
async def delete_document(
    data: schemas.DocumentDeleteRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
):
    """
    删除文档
    
    - **doc_id**: 文档ID
    """
    logger.info(f"Deleting document {data.doc_id}")
    result = await service.delete_document(data.doc_id, current_user.id)
    if not result:
        raise exceptions.DocumentNotFound(str(data.doc_id))
    logger.info(f"Document {data.doc_id} deleted")
    return success({"deleted": True})


@router.get(
    "/{kb_id}/documents",
    response_model=schemas.Response[schemas.DocumentListResponse],
    summary="获取文档列表",
    description="获取知识库的文档列表及处理状态",
)
async def list_documents(
    kb_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
    skip: int = Query(0, ge=0, description="跳过数量"),
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    status: Optional[DocumentStatus] = Query(None, description="状态过滤"),
):
    """
    获取知识库的文档列表
    
    可用于前端轮询文档处理进度
    """
    # 验证知识库权限
    kb = await service.get_kb_with_permission(kb_id, current_user.id)
    if kb is None:
        raise exceptions.KBNotFound(str(kb_id))
    
    items, total = await service.get_kb_documents(kb_id, skip, limit, status)
    return success({
        "items": [schemas.DocumentResponse.model_validate(doc) for doc in items],
        "total": total,
    })


@router.post(
    "/document/retry",
    summary="重试失败任务",
    description="重新处理失败的文档",
)
async def retry_document(
    data: schemas.DocumentRetryRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
):
    """
    重试失败的文档处理
    
    - **doc_id**: 文档ID
    """
    doc = await service.get_document(data.doc_id)
    if doc is None:
        raise exceptions.DocumentNotFound(str(data.doc_id))
    
    # 验证权限
    kb = await service.get_kb(doc.kb_id)
    if kb is None or kb.user_id != current_user.id:
        raise exceptions.KBPermissionDenied()
    
    if doc.status != DocumentStatus.FAILED:
        return success({"message": "Document is not in failed status", "status": doc.status.value})
    
    logger.info(f"Retrying document {data.doc_id}")
    
    # 重置状态并重新触发任务
    await service.update_document_status(data.doc_id, DocumentStatus.PROCESSING)
    task = retry_failed_document.delay(str(data.doc_id))
    
    logger.info(f"Retry task {task.id} queued for doc {data.doc_id}")
    return success({"message": "Retry task queued", "task_id": task.id})


# ==================== 检索测试 ====================

@router.post(
    "/{kb_id}/search_test",
    response_model=schemas.Response[schemas.SearchTestResponse],
    summary="检索测试",
    description="测试知识库的检索效果，不经过 Agent",
)
async def search_test(
    kb_id: UUID,
    data: schemas.SearchTestRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    service: Annotated[KBService, Depends(get_kb_service)],
):
    """
    检索测试
    
    用于测试向量检索效果，直接返回相关文档片段
    
    - **query**: 查询文本
    - **top_k**: 返回数量 (1-20)
    - **score_threshold**: 分数阈值 (可选)
    """
    # 验证知识库权限
    kb = await service.get_kb_with_permission(kb_id, current_user.id)
    if kb is None:
        raise exceptions.KBNotFound(str(kb_id))
    
    logger.info(f"Search test in kb {kb_id}: '{data.query[:50]}...'")
    
    # 执行检索
    results = await VectorStoreService.similarity_search(
        query=data.query,
        kb_id=kb_id,
        k=data.top_k,
        score_threshold=data.score_threshold,
        embedding_model=kb.embedding_model,
    )
    
    # 格式化结果
    search_results = []
    for doc, score in results:
        search_results.append({
            "content": doc.page_content,
            "score": score,
            "metadata": doc.metadata,
        })
    
    logger.info(f"Search test returned {len(search_results)} results")
    
    return success({
        "query": data.query,
        "results": search_results,
        "total": len(search_results),
    })
