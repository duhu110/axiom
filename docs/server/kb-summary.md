# 知识库模块实现总结 (kb-summary.md)

## 1. 模块概览

知识库模块已完成基础功能实现，支持文档上传、异步处理、向量化存储和检索测试。

### 1.1 目录结构

```
server/src/knowledgebase/
├── config.py              # 模块配置 (embedding_model, chunk_size, chunk_overlap)
├── models.py              # ORM 模型 (KnowledgeBase, KBDocument)
├── schemas.py             # Pydantic 模型
├── router.py              # API 路由
├── dependencies.py        # 依赖注入
├── exceptions.py          # 自定义异常
├── core/
│   ├── loader.py          # 文档加载器 (PDF/TXT/MD/DOCX)
│   ├── splitter.py        # 文本切分器 (中文优化)
│   └── embedding.py       # FastEmbed 封装 (单例模式)
├── services/
│   ├── kb_service.py      # 知识库 CRUD
│   ├── vector_store.py    # PGVector 封装
│   └── retriever_factory.py  # LangChain Retriever 工厂
└── worker/
    ├── celery_app.py      # Celery 应用配置
    └── tasks.py           # 异步任务
```

### 1.2 数据库分离

| 数据库 | 用途 |
|--------|------|
| `axiom_app` | 业务表 (knowledge_bases, kb_documents) |
| `axiom_kb` | 向量表 (langchain_pg_embedding, langchain_pg_collection) |

### 1.3 文档状态机

简化为三状态：

```
PROCESSING -> INDEXED (成功)
           -> FAILED (失败，可重试)
```

---

## 2. 启动命令

### 2.1 服务启动

```powershell
# 进入 src 目录
cd D:\project\FullStack\axiom\server\src

# 终端 1: FastAPI
..\.venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 终端 2: Celery Worker (Windows 必须用 --pool=solo)
..\.venv\Scripts\celery -A knowledgebase.worker.celery_app worker -l info --pool=solo

# 终端 3 (可选): Flower 监控 (http://localhost:5555)
..\.venv\Scripts\celery -A knowledgebase.worker.celery_app flower --port=5555
```

### 2.2 数据库迁移

```powershell
cd D:\project\FullStack\axiom\server\src

# 生成迁移
..\.venv\Scripts\alembic revision --autogenerate -m "description"

# 执行迁移
..\.venv\Scripts\alembic upgrade head

# 查看当前版本
..\.venv\Scripts\alembic current
```

---

## 3. 开发测试脚本

### 3.1 快速获取 Token

```powershell
cd D:\project\FullStack\axiom\server\src
python ..\scripts\get_token.py              # 默认 18997485868
python ..\scripts\get_token.py 13800138000  # 指定手机号
```

### 3.2 测试 Celery 任务

```powershell
cd D:\project\FullStack\axiom\server\src
python ..\scripts\test_celery.py
```

---

## 4. 调试问题与解决方案

### 4.1 Celery Worker 找不到模块

**问题**: `ModuleNotFoundError: No module named 'knowledgebase'`

**原因**: Celery 命令必须在 `src` 目录执行，否则找不到模块。

**解决**:
```powershell
cd D:\project\FullStack\axiom\server\src
..\.venv\Scripts\celery -A knowledgebase.worker.celery_app worker -l info --pool=solo
```

### 4.2 Windows Celery 权限错误

**问题**: `PermissionError: [WinError 5] 拒绝访问` (billiard/pool.py)

**原因**: Windows 不支持 Celery 默认的 prefork 池模式。

**解决**: 使用 `--pool=solo` 或 `--pool=threads`
```powershell
celery -A knowledgebase.worker.celery_app worker -l info --pool=solo
```

### 4.3 任务发送后 Worker 无反应

**问题**: API 返回 200，但 Worker 没有收到任务。

**原因**: FastAPI 进程中 Celery app 未正确初始化，`@shared_task` 无法注册。

**解决**: 在 `router.py` 中显式导入 `celery_app`:
```python
from knowledgebase.worker.celery_app import celery_app  # 确保初始化
from knowledgebase.worker.tasks import process_document, retry_failed_document
```

### 4.4 Pydantic 响应验证失败

**问题**: `Field required: created_at, updated_at`

**原因**: `response_model=schemas.KBResponse` 与 `success()` 返回的包装格式不匹配。

**解决**: 使用泛型响应模型:
```python
# schemas.py
class Response(BaseModel, Generic[T]):
    code: int = Field(0)
    msg: str = Field("ok")
    data: T | None = Field(None)

# router.py
@router.post("/create", response_model=schemas.Response[schemas.KBResponse])
```

### 4.5 Embedding 模型重复下载

**问题**: 每次 Worker 处理任务都重新下载模型。

**原因**: `embedding_cache_dir` 使用相对路径 `./models`，Celery Worker 工作目录与 FastAPI 不同。

**解决**: 使用绝对路径:
```python
# config.py
class KBConfig(BaseModel):
    embedding_cache_dir: str = "D:/project/FullStack/axiom/server/models"
```

### 4.6 Alembic 迁移 Greenlet 错误

**问题**: `sqlalchemy.exc.MissingGreenlet`

**原因**: Alembic 默认使用同步模式，但配置了 asyncpg 驱动。

**解决**: 在 `database.py` 中添加 URI 转换:
```python
def get_sync_uri() -> str:
    uri = settings.db.uri_app
    if "+asyncpg" in uri:
        return uri.replace("+asyncpg", "+psycopg")
    return uri
```

---

## 5. Celery 监控命令

```powershell
# 查看活跃任务
celery -A knowledgebase.worker.celery_app inspect active

# 查看已注册任务
celery -A knowledgebase.worker.celery_app inspect registered

# 查看统计
celery -A knowledgebase.worker.celery_app inspect stats

# 查看 Redis 队列长度
docker exec -it axiom_redis redis-cli LLEN celery
```

---

## 6. API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/kb/create` | 创建知识库 |
| POST | `/api/kb/delete` | 删除知识库 |
| POST | `/api/kb/list` | 获取知识库列表 |
| POST | `/api/kb/{kb_id}/document/upload` | 上传文档 |
| POST | `/api/kb/document/delete` | 删除文档 |
| GET | `/api/kb/{kb_id}/documents` | 获取文档列表 |
| POST | `/api/kb/document/retry` | 重试失败文档 |
| POST | `/api/kb/{kb_id}/search_test` | 检索测试 |

---

## 7. 配置说明

```python
# server/src/config.py

class KBConfig(BaseModel):
    embedding_model: str = "BAAI/bge-small-zh-v1.5"
    embedding_cache_dir: str = "D:/project/FullStack/axiom/server/models"
    chunk_size: int = 500
    chunk_overlap: int = 50

class CeleryConfig(BaseModel):
    broker_url: str = "redis://localhost:6379/0"
    result_backend: str = "redis://localhost:6379/0"
```

修改配置后需重启 FastAPI 和 Celery Worker 生效。

---

## 8. 文件存储路径

RustFS 存储格式: `kb/{kb_id}/{doc_id}_{filename}`

示例: `kb/550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-944b-e07fc1f90ae7_document.pdf`
