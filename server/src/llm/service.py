from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import async_session_scope
from services.logging_service import logger
from llm_usage.models import LLMUsage


def _normalize_usage(usage: dict | None) -> tuple[Optional[int], Optional[int], Optional[int]]:
    if not isinstance(usage, dict):
        return None, None, None

    prompt_tokens = usage.get("prompt_tokens") or usage.get("input_tokens")
    completion_tokens = usage.get("completion_tokens") or usage.get("output_tokens")
    total_tokens = usage.get("total_tokens") or usage.get("total")
    return prompt_tokens, completion_tokens, total_tokens


def _extract_usage_from_response(response: Any) -> tuple[dict | None, dict | None]:
    usage = None
    meta = {}

    usage_metadata = getattr(response, "usage_metadata", None)
    if isinstance(usage_metadata, dict):
        usage = usage_metadata

    response_metadata = getattr(response, "response_metadata", None)
    if isinstance(response_metadata, dict):
        meta.update(response_metadata)
        if usage is None:
            usage = response_metadata.get("usage") or response_metadata.get("token_usage") or response_metadata.get("usage_metadata")

    if usage is not None:
        meta.setdefault("usage", usage)

    return usage, meta or None


async def record_usage(
    user_id: uuid.UUID | str,
    model_name: str,
    usage: dict | None,
    request_id: str | None = None,
    trace_id: str | None = None,
    meta: dict | None = None,
    db: AsyncSession | None = None,
) -> None:
    if isinstance(user_id, str):
        try:
            user_id = uuid.UUID(user_id)
        except ValueError:
            logger.warning(f"Invalid user_id for usage record: {user_id}")
            return

    prompt_tokens, completion_tokens, total_tokens = _normalize_usage(usage)

    usage_record = LLMUsage(
        user_id=user_id,
        model_name=model_name or "unknown",
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        request_id=request_id,
        trace_id=trace_id,
        meta=meta if meta is not None else usage,
    )

    if db is None:
        async with async_session_scope() as session:
            session.add(usage_record)
    else:
        db.add(usage_record)


async def record_usage_from_response(
    user_id: uuid.UUID | str,
    response: Any,
    model_name: str,
    request_id: str | None = None,
    trace_id: str | None = None,
    db: AsyncSession | None = None,
) -> None:
    usage, meta = _extract_usage_from_response(response)

    if request_id is None and isinstance(meta, dict):
        request_id = meta.get("request_id") or meta.get("id")

    await record_usage(
        user_id=user_id,
        model_name=model_name,
        usage=usage,
        request_id=request_id,
        trace_id=trace_id,
        meta=meta,
        db=db,
    )


async def list_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
    start_at: datetime | None,
    end_at: datetime | None,
    model_name: str | None,
    skip: int,
    limit: int,
) -> tuple[list[LLMUsage], int]:
    stmt = select(LLMUsage).where(LLMUsage.user_id == user_id)
    if start_at:
        stmt = stmt.where(LLMUsage.created_at >= start_at)
    if end_at:
        stmt = stmt.where(LLMUsage.created_at <= end_at)
    if model_name:
        stmt = stmt.where(LLMUsage.model_name == model_name)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(LLMUsage.created_at.desc()).offset(skip).limit(limit)
    items = (await db.execute(stmt)).scalars().all()
    return items, total


async def summary_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
    start_at: datetime | None,
    end_at: datetime | None,
    model_name: str | None,
    group_by: str,
) -> list[dict]:
    if group_by == "model":
        group_col = LLMUsage.model_name
    else:
        group_col = func.date_trunc("day", LLMUsage.created_at)

    stmt = select(
        group_col.label("group_key"),
        func.coalesce(func.sum(LLMUsage.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(LLMUsage.completion_tokens), 0).label("completion_tokens"),
        func.coalesce(func.sum(LLMUsage.total_tokens), 0).label("total_tokens"),
    ).where(LLMUsage.user_id == user_id)

    if start_at:
        stmt = stmt.where(LLMUsage.created_at >= start_at)
    if end_at:
        stmt = stmt.where(LLMUsage.created_at <= end_at)
    if model_name:
        stmt = stmt.where(LLMUsage.model_name == model_name)

    stmt = stmt.group_by(group_col).order_by(group_col)
    rows = (await db.execute(stmt)).all()

    items = []
    for row in rows:
        group_key = row.group_key
        if isinstance(group_key, datetime):
            group_value = group_key.date().isoformat()
        else:
            group_value = str(group_key)
        items.append(
            {
                "group": group_value,
                "prompt_tokens": int(row.prompt_tokens),
                "completion_tokens": int(row.completion_tokens),
                "total_tokens": int(row.total_tokens),
            }
        )

    return items
