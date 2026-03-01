from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_active_user
from auth.models import User
from database import get_async_db
from response import success
from llm import schemas, service


router = APIRouter(prefix="/api/llm", tags=["LLM Usage", "LLM Models"])


@router.get(
    "/usage",
    response_model=schemas.Response[schemas.LLMUsageListResponse],
    summary="查询用量明细",
    description="查询当前用户的 LLM 用量明细",
)
async def list_llm_usage(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
    skip: int = Query(0, ge=0, description="跳过数量"),
    limit: int = Query(20, ge=1, le=200, description="返回数量"),
    model_name: str | None = Query(None, description="模型名称过滤"),
    start_at: datetime | None = Query(None, description="开始时间"),
    end_at: datetime | None = Query(None, description="结束时间"),
):
    items, total = await service.list_usage(
        db=db,
        user_id=current_user.id,
        start_at=start_at,
        end_at=end_at,
        model_name=model_name,
        skip=skip,
        limit=limit,
    )
    return success(
        {
            "items": [schemas.LLMUsageResponse.model_validate(item) for item in items],
            "total": total,
        }
    )


@router.get(
    "/usage/summary",
    response_model=schemas.Response[schemas.LLMUsageSummaryResponse],
    summary="查询用量汇总",
    description="查询当前用户的 LLM 用量汇总",
)
async def llm_usage_summary(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
    group_by: Literal["day", "model"] = Query("day", description="分组方式(day/model)"),
    model_name: str | None = Query(None, description="模型名称过滤"),
    start_at: datetime | None = Query(None, description="开始时间"),
    end_at: datetime | None = Query(None, description="结束时间"),
):
    items = await service.summary_usage(
        db=db,
        user_id=current_user.id,
        start_at=start_at,
        end_at=end_at,
        model_name=model_name,
        group_by=group_by,
    )
    return success({"items": items})


@router.post(
    "/models",
    response_model=schemas.Response[schemas.LLMModelListResponse],
    summary="获取可用模型列表",
    description="获取所有已启用的 LLM 模型列表，不含 API Key 等敏感信息",
)
async def get_llm_models(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    获取可用模型列表

    返回所有已启用的 LLM 模型，用户可以看到所有可用模型并选择使用。
    不返回 api_key 等敏感信息。
    """
    models = await service.get_available_models(db)
    return success({
        "items": [schemas.LLMModelResponse.model_validate(m) for m in models]
    })
