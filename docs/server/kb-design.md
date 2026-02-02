# 知识库管理模块详细设计 (kb-design.md)

## 1. 设计目标与原则

* **定位**：本模块负责**文档资产管理**与**Retriever（检索器）的构建**。不包含 Agent 的编排逻辑（LangGraph 流程），仅向外部模块提供标准化的 LangChain `Retriever` 对象。
* **存储解耦**：
* **文件存储**：对接独立的 RustFS 服务。
* **向量存储**：使用 PGVectorStore (数据库 `axiom_kb`)。


* **计算本地化**：FastEmbed 作为基础库集成在异步 Worker 中，不通过 HTTP 暴露。
* **异步流式处理**：采用“数据库状态驱动”的异步作业机制，确保上传接口的高响应速度。

## 2. 模块目录结构 (server/src/knowledgebase)

```text
server/src/knowledgebase/
├── api/
│   ├── routes.py          # HTTP 接口 (增删改查, 上传)
│   └── dependencies.py    # 依赖注入
├── core/
│   ├── loader.py          # 文档加载器 (适配 RustFS)
│   ├── splitter.py        # 文本切分器 (中文优化)
│   └── embedding.py       # FastEmbed 封装 (单例模式)
├── models/
│   └── orm.py             # SQLAlchemy 模型 (KnowledgeBase, KBDocument)
├── schemas/
│   └── dto.py             # Pydantic 数据传输对象
├── services/
│   ├── kb_service.py      # 知识库 CRUD 业务
│   └── retriever_factory.py # 核心：产出 LangChain Retriever 对象
└── worker/
    └── tasks.py           # 异步任务 (下载->切分->向量化->入库)

```

## 3. 核心架构决策

### 3.1 向量模型服务 (FastEmbed)

* **部署方式**：**进程内库调用 (In-process Library)**。
* **实现**：在 `core/embedding.py` 中实现单例。Worker 进程启动时预加载模型到内存。
* **模型**：`BAAI/bge-small-zh-v1.5`。
* **缓存策略**：设置 `cache_dir` 为项目下的 `models/` 目录，确保不重复下载。

### 3.2 异步处理流程 (状态机)

引入数据库表记录文档处理状态，实现上传与处理的解耦。

**状态流转：**

1. **Pending (待处理)**: API 接收请求，记录 DB，上传文件到 RustFS。
2. **Processing (处理中)**: 异步 Worker 领取任务。
3. **Splitting (切分中)**: 从 RustFS 下载并解析文本。
4. **Embedding (向量化中)**: 调用 FastEmbed 生成向量。
5. **Indexed (已索引)**: 写入 PGVector，事务提交。
6. **Failed (失败)**: 任意环节异常，记录错误日志。

### 3.3 原始文件存储 (RustFS)

* RustFS 作为独立 HTTP 服务运行。
* 本模块仅保存 RustFS 返回的 `file_key` 或 `url`。
* 读取时通过 HTTP 流式下载到临时内存/文件进行处理。

## 4. 数据库设计 (PostgreSQL: axiom_kb)

### 4.1 知识库表 (knowledge_base)

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | UUID | 主键 |
| `user_id` | VARCHAR | 所属用户 (隔离键) |
| `name` | VARCHAR | 知识库名称 |
| `description` | TEXT | 描述 |
| `visibility` | ENUM | `private` (私有), `public` (公开) |
| `config` | JSONB | 预留配置 (如自定义切分参数) |
| `created_at` | TIMESTAMP |  |

### 4.2 文档状态表 (kb_document)

*该表是异步任务的核心调度依据*

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | UUID | 主键 |
| `kb_id` | UUID | 外键 -> knowledge_base.id |
| `title` | VARCHAR | 文档标题 |
| `file_key` | VARCHAR | **RustFS 的文件标识符** |
| `source_url` | VARCHAR | 原始访问链接 (可选) |
| `file_type` | VARCHAR | pdf, txt, md, docx |
| `status` | ENUM | `pending`, `processing`, `indexed`, `failed` |
| `error_msg` | TEXT | 失败原因记录 |
| `chunk_count` | INT | 切片数量 (统计用) |
| `token_count` | INT | 总 Token 数 (统计用) |
| `updated_at` | TIMESTAMP | 用于监控任务是否卡死 |

### 4.3 向量存储 (langchain_pg_embedding)

* 使用 `LangChain PGVector` 标准结构。
* **Metadata 设计**：必须包含 `kb_id`, `user_id`, `doc_id` 以支持精确过滤。

## 5. 关键业务流程详解

### 5.1 上传与入库流程 (Async Pattern)

1. **API 请求**: 用户 POST `/kb/{kb_id}/upload`。
2. **RustFS 交互**: API 层直接将文件流转发给 RustFS，获取 `file_key`。
3. **DB 记录**: 在 `kb_document` 插入一条记录，状态为 `pending`。
4. **触发任务**:
* 方案 A (简单): `BackgroundTasks.add_task(process_doc, doc_id)`
* 方案 B (推荐): 发送消息到消息队列 (Redis/RabbitMQ)，由独立 Worker 消费。


5. **立即响应**: 返回 `doc_id` 和状态 `pending` 给前端。

### 5.2 异步 Worker 执行逻辑 (worker/tasks.py)

1. **锁定任务**: 更新 DB 状态为 `processing`。
2. **获取文件**: 根据 `file_key` 从 RustFS 下载文件流。
3. **Loader & Splitter**:
* 根据后缀选择 Loader (PDF/Text/Markdown)。
* 使用 `RecursiveCharacterTextSplitter`。
* **关键配置**: `separators=["\n\n", "\n", "。", "！", "？", " ", ""]` (针对中文优化)。


4. **Embedding**:
* 调用本地 `FastEmbed` 实例生成向量 (Batch 处理)。


5. **Vector Store**:
* 使用 `PGVector.add_documents` 写入数据库 `axiom_kb`。
* **Transaction**: 确保向量写入成功后，再更新 `kb_document` 状态为 `indexed`。


6. **异常处理**: 捕获所有 Exception，更新状态为 `failed` 并写入 `error_msg`。

### 5.3 检索器工厂 (Retriever Factory)

*不执行检索，而是生产检索器对象供 Agent 调用*

```python
# services/retriever_factory.py

def get_retriever_for_kb(kb_id: str, user_id: str, top_k: int = 5):
    """
    为 Agent 流程提供标准的 Retriever 组件
    """
    # 1. 初始化向量库连接
    vectorstore = PGVector(
        connection_string=settings.KB_DATABASE_URL,
        embedding_function=FastEmbedEmbeddings(
            model_name="BAAI/bge-small-zh-v1.5",
            cache_dir="./models"
        ),
        collection_name="axiom_vectors" # 统一集合，靠 filter 区分
    )
    
    # 2. 构建检索参数 (Search Kwargs)
    # 强制加上权限控制 Filter，防止越权访问
    search_kwargs = {
        "k": top_k,
        "filter": {
            "kb_id": {"$eq": kb_id},
            # 如果是私有库，严格校验 user_id
            # 实际逻辑需根据 kb 的 visibility 字段动态构建
        }
    }
    
    # 3. 返回 LangChain Retriever
    return vectorstore.as_retriever(search_kwargs=search_kwargs)

```

## 6. API 接口定义

### 6.1 知识库管理

* `POST /kb/create`: 创建知识库
* `POST /kb/delete`: 删除知识库 (级联删除文档和向量)
* `GET /kb/list`: 获取列表

### 6.2 文档管理

* `POST /kb/{kb_id}/document/upload`: 上传文件 (Multipart) -> 触发异步任务
* `POST /kb/document/delete`: 删除文档 (同时删除向量)
* `GET /kb/{kb_id}/documents`: 获取文档列表及状态 (用于前端轮询进度)
* `POST /kb/document/retry`: 对 `failed` 状态的文档进行重试

### 6.3 调试/测试接口

* `POST /kb/{kb_id}/search_test`: 纯检索测试 (不经过 Agent，仅返回 Document 片段，用于测试向量效果)

## 7. 配置项 (config.py)

```python
class KBSettings:
    # 数据库
    KB_DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/axiom_kb"
    
    # RustFS 服务地址
    RUSTFS_ENDPOINT: str = "http://rustfs-service:8080"
    
    # 向量模型
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-small-zh-v1.5"
    EMBEDDING_DEVICE: str = "cpu" # 或 cuda
    
    # 切分配置
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

```

## 8. 下一步开发计划

1. **基础设施**: 初始化 `axiom_kb` 数据库，开启 `vector` 插件。
2. **核心库**: 实现 `core/embedding.py` 和 `core/loader.py`。
3. **API 开发**: 完成知识库 CRUD 和 文件上传接口。
4. **Worker 开发**: 编写后台处理逻辑，联调 RustFS 下载与 PGVector 写入。