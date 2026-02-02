# 存储服务开发计划（Dev）

基于 [design.md](file:///d:/project/FullStack/axiom/docs/storage/design.md) 的“单 PostgreSQL 容器（多数据库）+ Redis + RustFS”方案，制定可落地的开发计划与测试清单。目标是让开发环境一键启动、可重复初始化、可验证可回归。

---

## 0. 约定与验收标准

### 0.1 约定
- PostgreSQL：单容器 `axiom_db`，内部数据库：`axiom_app / axiom_kb / axiom_agent`
- Redis：单容器 `axiom_redis`
- RustFS：单容器 `axiom_rustfs`（S3 兼容）
- 端口：PostgreSQL `DB_PORT=5433`，Redis `REDIS_PORT=6379`，RustFS `9000/9001`（均可覆盖）

### 0.2 验收标准（Definition of Done）
- `docker compose up -d` 后 3 个容器均为 running
- PostgreSQL 内存在 3 个数据库：`axiom_app / axiom_kb / axiom_agent`
- `axiom_kb` 启用 `vector` 扩展；三个库均启用 `pgcrypto` 扩展（按需可调整）
- Redis `PING` 返回 `PONG`
- RustFS 控制台可访问，S3 端口可完成一次 put/get（任意小文件）
- 具备可重复执行的“冒烟测试”脚本或手工测试清单（见第 4 节）

---

## 1. 里程碑与任务拆分

### M1：基础编排落地（半天）
- 新增/确认存储目录结构（建议）  
  - `storage/docker-compose.yml`（仅存储服务）  
  - `storage/.env`（开发默认值，避免写死在 compose）  
  - `storage/sql/init.sql`（首次初始化：建库 + 扩展）
- Compose 内容对齐 design.md：`db(redis/rustfs)` 三个服务 + `db_data/redis_data/rustfs_data` 三个卷
- 为三项服务补齐 `restart: unless-stopped`

交付物：
- 存储服务可在 Windows 下启动，无需改任何应用代码

### M2：初始化策略落地（半天）
- 采用一次性初始化脚本 `storage/sql/init.sql`：  
  - 创建 `axiom_kb`、`axiom_agent`  
  - 在 `axiom_kb` 执行 `CREATE EXTENSION vector`  
  - 三库按需启用 `pgcrypto`
- 明确二次启动策略：  
  - 数据卷已存在时，初始化脚本不会再执行  
  - 需要补库/补扩展时，用 `docker exec ... psql -c ...` 手动执行

交付物：
- 新环境首次启动即具备 3 库 + 必要扩展

### M3：本地开发连接信息（半天）
- 统一输出本地连接串模板（写入 README 或开发文档中）：
  - PostgreSQL：`postgresql://<user>:<password>@localhost:<DB_PORT>/<db_name>`
  - Redis：`redis://localhost:<REDIS_PORT>`
  - RustFS：endpoint `http://localhost:<RUSTFS_PORT>`，console `http://localhost:<RUSTFS_CONSOLE_PORT>`
- 约定应用侧使用的环境变量键名（建议）：  
  - `DB_URL_APP`、`DB_URL_KB`、`DB_URL_AGENT`、`REDIS_URL`、`S3_ENDPOINT`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`

交付物：
- 新同事拿到文档即可连上三类存储

### M4：测试与回归（1 天）
- 建立“冒烟测试”清单（见第 4 节），保证每次改 compose/镜像/端口/卷策略后都能快速验证
- 可选：增加自动化脚本（PowerShell 或 Python）一键执行冒烟测试

交付物：
- 存储服务变更可回归，减少“能起但不好用”的问题

### M5：拆分预案记录（可选，0.5 天）
- 将 `axiom_kb` 或 `axiom_agent` 拆为独立 PostgreSQL 的触发条件写清楚（design.md 已有方向）
- 记录迁移步骤草案：备份/恢复、连接串切换、回滚路径

---

## 2. 推荐目录与文件（建议）

> 本节是建议结构；如仓库已有 storage 目录规范，请以现有为准。

```
storage/
  docker-compose.yml
  .env
  sql/
    init.sql
```

---

## 3. 启动流程（开发）

在 `storage/` 目录执行：

```bash
docker compose up -d
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

停止（保留数据卷）：

```bash
docker compose down
```

停止并删除数据（会触发下次“重新初始化”）：

```bash
docker compose down -v
```

---

## 4. 测试清单（冒烟测试）

### 4.1 容器状态
- `docker compose ps` 中 `axiom_db / axiom_redis / axiom_rustfs` 均为 running

### 4.2 PostgreSQL（建库与扩展）

列出数据库（期望包含：axiom_app / axiom_kb / axiom_agent）：

```bash
docker exec -it axiom_db psql -U axiom -d postgres -c "\l"
```

检查 `axiom_kb` 的 pgvector 扩展（期望存在 `vector`）：

```bash
docker exec -it axiom_db psql -U axiom -d axiom_kb -c "SELECT extname FROM pg_extension ORDER BY 1;"
```

检查 `axiom_app` / `axiom_agent` 的扩展（期望存在 `pgcrypto`，若你按需启用）：

```bash
docker exec -it axiom_db psql -U axiom -d axiom_app -c "SELECT extname FROM pg_extension ORDER BY 1;"
docker exec -it axiom_db psql -U axiom -d axiom_agent -c "SELECT extname FROM pg_extension ORDER BY 1;"
```

### 4.3 Redis

```bash
docker exec -it axiom_redis redis-cli PING
```

期望输出：`PONG`

### 4.4 RustFS（S3 put/get）

目标：验证 RustFS 的 S3 端口能完成一次上传与下载。

任选一种方式（按你本机工具链）：
- 方式 A：使用 AWS CLI（推荐）  
  - 配置 endpoint 指向 `http://localhost:9000`  
  - 创建 bucket  
  - 上传一个小文件并下载校验 hash
- 方式 B：使用任意 S3 客户端（如 s3cmd / 你项目已有的 SDK 测试代码）

最小验证要点：
- bucket 可创建
- put 成功且 get 返回内容一致

---

## 5. 常见问题与处理

### 5.1 初始化脚本没有执行
- 现象：`axiom_kb / axiom_agent` 没创建或扩展缺失
- 原因：PostgreSQL 初始化脚本只在数据目录首次初始化时执行
- 处理：
  - 方案 1：按第 4.2 节手动执行创建库/扩展命令
  - 方案 2：`docker compose down -v` 清空卷后重新启动（会丢数据）

### 5.2 未来拆分时怎么迁移（记录）
- 将 `axiom_kb` 或 `axiom_agent` 拆分成独立实例时，推荐先做：
  - 备份：`pg_dump`（按库导出）
  - 新实例初始化：创建同名库与扩展
  - 恢复：`pg_restore` 或 `psql < dump.sql`
  - 切换连接串：应用侧仅修改对应库 URL
  - 回滚：保留旧实例数据卷与连接串可快速回退
