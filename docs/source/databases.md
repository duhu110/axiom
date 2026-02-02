这是一个非常扎实且具备前瞻性的基础设施规划。根据您的构想，将**PostgreSQL (pgvector)**、**Redis** 和 **FastEmbed** 容器化部署，是构建高性能、低成本且“解耦”的 Agent OS 的基石。

这种架构不仅实现了**数据与计算分离**，还通过本地化向量计算（FastEmbed）彻底消除了对 OpenAI Embedding API 的依赖，这符合 **AxiomAI 4.0** 架构中提到的“本地化语义计算”和“三层双核”设计理念。

以下是基于 Docker 的基础服务架构设计与落地实施方案：

### 一、 基础服务架构图：数据与计算的双核驱动

在这个阶段，我们需要构建的是**基础设施层 (Infrastructure Layer)**，它将支撑起上层的 Agent 编排和业务逻辑。

*   **存储核心 (State Store)**: **PostgreSQL + pgvector**。它不仅仅是数据库，更是 Agent 的“海马体”，同时负责结构化数据、向量数据和对话记忆的持久化。
*   **高速缓存与队列 (Message Broker)**: **Redis**。负责异步任务队列（如文档解析、向量化）和高频访问数据的缓存。
*   **向量计算引擎 (Vector Compute)**: **FastEmbed**。它通常作为 Python 依赖运行在应用容器内，或者封装为独立的微服务，提供“零延迟”的 Embedding 和 Rerank 能力。

---

### 二、 Docker Compose 编排方案

为了实现解耦和一键启动，我们使用 `docker-compose.yml` 来定义这些基础服务。

#### 1. 目录结构规划
```text
infrastructure/
├── docker-compose.yml
├── postgres/
│   └── init.sql          # 初始化 pgvector 插件和数据库
├── .env                  # 环境变量（端口、密码）
└── app/                  # (后续) FastAPI 应用容器
```

#### 2. `docker-compose.yml` 实现

```yaml
version: '3.8'

services:
  # 1. 全能数据库: PostgreSQL + pgvector
  db:
    image: pgvector/pgvector:pg16  # 直接使用集成好 pgvector 的官方镜像
    container_name: axiom_db
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-axiom}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secure_password}
      POSTGRES_DB: ${DB_NAME:-axiom_agent_os}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - axiom_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-axiom}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 2. 高速缓存与任务队列: Redis
  redis:
    image: redis:7-alpine
    container_name: axiom_redis
    restart: always
    command: redis-server --appendonly yes # 开启持久化
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    networks:
      - axiom_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 3. 向量服务: FastEmbed Service (作为独立微服务或集成在主应用中)
  # 建议：初期直接集成在 FastAPI 应用容器中以减少 HTTP 开销，
  # 但如果为了极致解耦，可以将其封装为一个简单的 Python 微服务。
  # 这里展示作为应用容器的一部分（Conceptually）
  # app_backend:
  #   build: .
  #   ... 依赖于 db 和 redis

networks:
  axiom_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

---

### 三、 关键组件配置细节

#### 1. 数据库初始化 (PostgreSQL + pgvector)
为了让数据库支持向量搜索，必须在启动时启用 `vector` 扩展。这对应了架构中“统一管理三类数据”的需求。

**`postgres/init.sql`**：
```sql
-- 启用向量扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 知识库向量表 (RAG)
CREATE TABLE IF NOT EXISTS document_embeddings (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(384) -- FastEmbed 默认模型 BAAI/bge-small-en-v1.5 维度为 384
);

-- 2. Agent 记忆持久化表 (LangGraph Checkpoints)
-- 这将由 LangGraph 的 AsyncPostgresSaver 自动管理，但预先创建表是个好习惯
CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB NOT NULL,
    PRIMARY KEY (thread_id, checkpoint_id)
);
```

#### 2. FastEmbed 向量服务设计
虽然 FastEmbed 是一个 Python 库，但为了贯彻您“拥有自己的向量服务”的理念，我们可以在代码层面将其封装为一个单例服务（Singleton Service），甚至是一个独立的 API 路由，确保它与业务逻辑解耦。

**设计思路**：
*   **本地运行**：FastEmbed 基于 ONNX Runtime，运行在 CPU 上非常快，不需要 GPU。
*   **混合检索**：不仅计算 Dense Vector（稠密向量），FastEmbed 还支持 Sparse Vector（稀疏向量/SPLADE），这对于提升检索准确率至关重要。

**代码层面的服务化 (FastAPI 示例)**：
```python
# src/infrastructure/fastembed_service.py
from fastembed import TextEmbedding

class VectorService:
    _instance = None

    def __init__(self):
        # 初始化模型，第一次运行会自动下载模型文件到容器内
        self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def embed_documents(self, documents: list[str]):
        # 返回 generator，转换为 list
        return list(self.model.embed(documents))

# 在业务逻辑中调用，完全解耦
# vectors = VectorService.get_instance().embed_documents(["Hello World"])
```

### 四、 为什么这个基础架构是“稳定”且“解耦”的？

1.  **Postgres 的单一事实来源 (Single Source of Truth)**：
    *   我们没有引入 Milvus 或 ChromaDB 等额外的向量数据库，而是利用 Postgres 的 `pgvector`。这极大地降低了运维复杂度（Less Moving Parts），同时保证了事务的一致性——即业务数据（User）和向量数据（Embedding）在同一个事务中提交。

2.  **Redis 的异步缓冲**：
    *   大文件的向量化是一个耗时操作。通过 Redis + Celery/Arq，我们可以将“上传文件”和“解析向量化”解耦。前端上传后立即返回，后台 Worker 慢慢处理，保证了系统的响应稳定性。

3.  **FastEmbed 的去外部依赖**：
    *   这是最关键的稳定性来源。你的系统不再依赖 OpenAI 的 Embedding API。即使外网断了，或者 OpenAI 挂了，你的**检索（Retrieval）**和**重排序（Reranking）**功能依然可用且免费。

### 五、 下一步行动建议

1.  **启动容器**：运行 `docker-compose up -d`，确保 Postgres 和 Redis 正常运行。
2.  **验证 pgvector**：进入数据库容器，执行 `SELECT * FROM pg_extension;` 确认 vector 扩展已安装。
3.  **开发 FastEmbed 原型**：编写一个简单的 Python 脚本，测试在本地生成向量并存入 Postgres，跑通这一条“数据链路”。

这个基础架构搭建好后，您就拥有了一个真正属于自己的、不依赖外部 API 的**私有记忆与检索底座**。