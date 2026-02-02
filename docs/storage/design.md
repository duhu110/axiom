# 存储服务设计文档

本目录只提供“存储服务”基础设施：PostgreSQL、Redis、RustFS（S3 兼容）。

---

## 1. 目标与范围

### 1.1 设计目标
- 为项目提供 PostgreSQL 数据库服务（应用库 + 知识库/向量库 + 智能体记忆库）
- 为项目提供 Redis 缓存服务
- 为项目提供 RustFS 对象存储服务（S3 兼容）

---

## 2. 架构与命名

### 2.1 PostgreSQL：单实例多库设计（开发阶段）

```
PostgreSQL
├─ axiom_app  (应用主库：业务/管理类数据)
├─ axiom_kb   (知识库/向量库：文档、向量、检索相关数据；启用 pgvector)
└─ axiom_agent (智能体记忆库：LangChain/LangGraph checkpointer/store)
```

设计原则：
- 逻辑隔离：用“不同数据库”隔离业务数据、向量数据与智能体记忆数据
- 运维简单：开发阶段优先降低容器数量与连接复杂度
- 版本对齐：统一 PostgreSQL 16，并内置 pgvector 扩展

### 2.2 拆分建议（记录，生产或中后期再做）

当前采用“单实例多库”。如果后续需要更强隔离，可将某些数据库拆为独立 PostgreSQL 实例/容器（例如仅拆 `axiom_kb` 或仅拆 `axiom_agent`）。

适合拆分的典型场景：
- 资源隔离：向量检索/写入压力明显影响主库
- 生命周期不同：`axiom_agent` 需要更频繁清理/迁移/重置
- 备份与合规：不同库需要不同保留周期、加密、权限与审计策略

### 2.3 Redis：缓存与临时数据
- 适合存放会话、短期缓存、任务状态等
- 采用 AOF 持久化以降低重启丢失风险（仍需按业务选择 TTL 与写入策略）

### 2.4 RustFS：对象存储（S3 兼容）
- 用于文件、附件、文档原文等大对象存储
- 对外提供 S3 API 端口与控制台端口

---

## 3. 端口与数据持久化

默认端口（均可通过环境变量覆盖）：
- PostgreSQL：`DB_PORT` 默认 `5433` 映射到容器 `5432`
- Redis：`REDIS_PORT` 默认 `6379`
- RustFS S3：`RUSTFS_PORT` 默认 `9000`
- RustFS Console：`RUSTFS_CONSOLE_PORT` 默认 `9001`

持久化卷：
- `db_data`：PostgreSQL 数据目录（包含 axiom_app / axiom_kb / axiom_agent）
- `redis_data`：Redis AOF 与数据目录
- `rustfs_data`：RustFS 对象存储数据目录

---

## 4. 部署与运维

### 4.1 Docker Compose（仅存储服务）

说明：一个 PostgreSQL“实例/容器”可以创建多个数据库（database）与多个 schema。是否“一个数据库一个 Docker 容器”，取决于你需要的隔离程度与运维复杂度，通常不必一库一容器。

```yaml
version: '3.8'

services:
  db:
    image: pgvector/pgvector:pg16
    container_name: axiom_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-axiom}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: ${DB_NAME:-axiom_app}
    ports:
      - "${DB_PORT:-5433}:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - axiom_storage_network

  redis:
    image: redis:7-alpine
    container_name: axiom_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    networks:
      - axiom_storage_network

  rustfs:
    image: rustfs/rustfs:latest
    container_name: axiom_rustfs
    restart: unless-stopped
    ports:
      - "${RUSTFS_PORT:-9000}:9000"
      - "${RUSTFS_CONSOLE_PORT:-9001}:9001"
    environment:
      RUSTFS_ACCESS_KEY: ${RUSTFS_ACCESS_KEY:-rustfsadmin}
      RUSTFS_SECRET_KEY: ${RUSTFS_SECRET_KEY:-rustfsadmin}
      RUSTFS_CONSOLE_ENABLE: ${RUSTFS_CONSOLE_ENABLE:-true}
    volumes:
      - rustfs_data:/data
    command: /data
    networks:
      - axiom_storage_network

volumes:
  db_data:
  redis_data:
  rustfs_data:

networks:
  axiom_storage_network:
    driver: bridge
```

### 4.2 启动与停止

```bash
docker compose up -d
docker compose ps
docker compose logs -f
```

```bash
docker compose down
```

### 4.3 RustFS 快速启动（Docker）

- Endpoint: `http://localhost:9000`
- Console: `http://localhost:9001`

Linux 示例：

```bash
docker run -d \
  --name rustfs_local \
  -p 9000:9000 \
  -p 9001:9001 \
  -v /mnt/rustfs/data:/data \
  -e RUSTFS_ACCESS_KEY=rustfsadmin \
  -e RUSTFS_SECRET_KEY=rustfsadmin \
  -e RUSTFS_CONSOLE_ENABLE=true \
  rustfs/rustfs:latest \
  /data
```

Windows 示例（PowerShell）：

```powershell
docker run -d `
  --name rustfs_local `
  -p 9000:9000 `
  -p 9001:9001 `
  -v "D:\rustfs\data:/data" `
  -e RUSTFS_ACCESS_KEY=rustfsadmin `
  -e RUSTFS_SECRET_KEY=rustfsadmin `
  -e RUSTFS_CONSOLE_ENABLE=true `
  rustfs/rustfs:latest `
  /data
```

### 4.4 数据库初始化脚本（可选但推荐）

PostgreSQL 官方镜像会自动执行挂载到 `/docker-entrypoint-initdb.d/` 下的 `*.sql`（仅首次初始化数据目录时执行）。

如需启用初始化脚本，可在 Compose 中为 PostgreSQL 追加挂载（示例）：

```yaml
services:
  db:
    volumes:
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
```

`init.sql`（示例）：

```sql
CREATE DATABASE axiom_kb;
CREATE DATABASE axiom_agent;

\connect axiom_app
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\connect axiom_kb
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\connect axiom_agent
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

也可以在服务启动后手动创建（示例）：

```bash
docker exec -it axiom_db psql -U axiom -d postgres -c "CREATE DATABASE axiom_kb;"
docker exec -it axiom_db psql -U axiom -d postgres -c "CREATE DATABASE axiom_agent;"
```

注意：
- 如果 `db_data` 已经初始化过，再新增初始化脚本不会自动执行；此时应使用上面的手动创建方式，或清空数据卷后重新初始化
