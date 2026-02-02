"""
测试 Celery 任务是否能正常发送
"""
import sys
import os

src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, src_dir)

from knowledgebase.worker.celery_app import celery_app
from knowledgebase.worker.tasks import process_document, retry_failed_document

print("Celery app:", celery_app)
print("Broker:", celery_app.conf.broker_url)
print("Tasks:", list(celery_app.tasks.keys()))

# 测试发送一个假任务（会失败，但能验证任务是否被发送）
print("\n发送测试任务...")
result = process_document.delay("00000000-0000-0000-0000-000000000000")
print(f"Task ID: {result.id}")
print(f"Task state: {result.state}")
print("\n如果 Worker 终端有日志输出，说明任务发送成功！")
