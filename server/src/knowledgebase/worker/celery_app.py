"""
Celery 应用配置

启动命令:
    celery -A knowledgebase.worker.celery_app worker -l info
"""

import os
import sys

# 确保 src 目录在 Python 路径中
src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from celery import Celery

from config import settings


# 创建 Celery 应用
celery_app = Celery(
    "knowledgebase",
    broker=settings.celery.broker_url,
    backend=settings.celery.result_backend,
    include=["knowledgebase.worker.tasks"],
)

# Celery 配置
celery_app.conf.update(
    task_serializer=settings.celery.task_serializer,
    result_serializer=settings.celery.result_serializer,
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
    
    # 任务配置
    task_track_started=True,
    task_time_limit=600,  # 10分钟超时
    task_soft_time_limit=540,  # 9分钟软超时
    
    # 重试配置
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Worker 配置
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
)
