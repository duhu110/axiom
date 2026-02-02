# server 基础服务设计（草案）

本文档描述 `server` 端基础设施与公共能力的设计约定，目标是让业务模块可以“按领域演进”，同时保持一致的请求处理、日志、异常、数据访问与返回格式。本文结合了 FastAPI 的生产实践建议（异步优先、依赖项复用、响应模型与文档、迁移与命名规范等）。

## 1. 设计目标与原则

1. 一致性优先：所有接口遵循统一的返回格式、错误码体系、分页格式与日志字段。
2. 可演进：新增领域模块时只需要“复制结构 + 接入公共能力”，不需要改动既有模块。
3. 异步优先：默认使用 `async` 路由与 `async` 依赖；同步 SDK 必须隔离到线程池。
4. 可测试：从一开始就支持异步测试客户端；依赖项可替换/可注入。
5. 领域分治：业务代码按领域拆分，基础设施在 `server/src` 提供“全局能力”。

## 2. 推荐的项目结构（领域模块 + 全局基础设施）

参考可扩展的单体结构，将业务按领域拆分，每个领域拥有自己的路由、模型、依赖与服务：

```
server/
  src/
    main.py                 # 创建 FastAPI app、挂载路由、注册异常与中间件
    config.py               # 全局配置（本项目约定：不从环境变量读取）
    logging.py              # 日志初始化与标准化
    response.py             # 统一响应模型与工具
    exceptions.py           # 统一异常、错误码与全局 ExceptionHandler
    pagination.py           # 分页请求/响应模型与工具
    database.py             # SQLAlchemy 2.0 引擎/会话/依赖/工具
    models.py               # 全局共享模型（仅放跨领域共用且稳定的模型）
    rustfs/
      client.py             # rustfs 客户端（外部服务通信模型/适配）
      service.py            # 上传/下载等业务无关封装（可选）
    <domain_a>/
      router.py
      schemas.py
      models.py
      dependencies.py
      service.py
      constants.py
      exceptions.py
      utils.py
  alembic/
  tests/
    <domain_a>/
    <domain_b>/
```

约定：
1. 业务模块之间交互时，使用显式模块名导入，避免“隐式耦合”。
2. 领域内的 `exceptions.py/constants.py` 只放领域错误与常量；全局通用放 `server/src/exceptions.py`。
3. 公共基础设施文件（如 `database.py/response.py`）只提供“可复用抽象”，不写具体业务逻辑。

## 3. 配置（`server/src/config.py`）

本项目约定：项目配置直接写到 `server/src/config.py`，不再使用环境变量。

建议的组织方式（即便不使用环境变量，也应保持配置结构化与可分层）：
1. 全局配置保持扁平、可读，按“模块/组件”分组（数据库、日志、存储、跨域、文档开关等）。
2. 支持“本地开发覆盖”机制（例如 `config_local.py` 或在 `config.py` 内按 `ENV` 选择），避免多人协作时频繁改动同一文件。
3. 严禁在配置中硬编码密钥；密钥应通过本地私有文件或安全存储注入（即使不用环境变量，也应保持“非入库”原则）。

## 4. UV 环境管理

使用 `uv` 管理依赖与虚拟环境，建议采用：
1. 使用 `pyproject.toml` 管理依赖与工具配置（ruff、pytest 等）。
2. 使用 lock 文件锁定依赖版本，保证本地/CI 一致性。
3. 区分依赖组：`dev`（ruff、pytest、httpx 等）、`prod`（运行时依赖）。

## 5. 统一日志（Loguru + 标准 logging 兼容）

目标：
1. 统一请求日志字段（trace_id/request_id、method、path、status_code、latency、user_id 可选）。
2. 统一异常日志格式（包含错误码、堆栈、请求上下文）。
3. 兼容 Uvicorn/FastAPI/SQLAlchemy 使用的标准 `logging`。

建议：
1. 使用 Loguru 作为“输出与格式化层”，并将标准 `logging` 转发到 Loguru。
2. 日志输出优先 JSON Lines（便于检索/告警），开发环境可使用彩色人类可读格式。
3. 不在日志中输出敏感信息（token、密码、密钥、完整的请求体等）。

## 6. 统一响应格式（`server/src/response.py`）

统一接口返回格式：

```json
{ "code": 0, "msg": "ok", "data": {...} }
```

设计要点：
1. HTTP 状态码用于表示协议层语义（401/403/404/422/500 等）；`code` 表示业务码（成功为 0 或约定值）。
2. 路由层尽量返回“原始 dict/list/标量”，通过 `response_model` 做结构校验与文档生成，避免额外构造响应模型导致的重复序列化成本。
3. `msg` 为面向开发/用户的简短信息；详细调试信息仅出现在日志中。

示例（仅作为约定演示）：

```python
from typing import Any

from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health() -> dict[str, Any]:
    """健康检查接口，返回统一响应结构。"""
    return {"code": 0, "msg": "ok", "data": {"status": "up"}}
```

## 7. 分页服务（`server/src/pagination.py`）

分页响应格式约定：

```json
{
  "code": 0,
  "msg": "ok",
  "data": { "items": [], "total": 0 }
}
```

建议增强字段（便于前端使用与缓存）：
1. `limit`、`offset` 或 `page`、`page_size`：二选一统一全站口径。
2. `total`：总条目数；当代价较高时允许返回 `total = -1` 表示未计算（需在文档明确）。
3. `items`：列表数据。

## 8. 统一异常与错误码（`server/src/exceptions.py`）

采用 FastAPI `ExceptionHandler` 机制实现统一异常处理。

核心设计：
1. 定义全局错误码枚举（或常量集），至少覆盖：参数错误、未授权、无权限、资源不存在、冲突、外部依赖失败、内部错误等。
2. 定义统一的业务异常基类（例如 `AppError`），包含：`code`、`msg`、`status_code`、`detail`（仅用于日志）。
3. 注册异常处理器：
   1. `AppError`：直接转成统一响应结构。
   2. `HTTPException`：统一包装成 `{code,msg,data}`。
   3. `RequestValidationError`：统一包装，避免默认的详细字段泄漏给用户（仅保留可用提示）。
4. 避免在面向客户端的 Pydantic 校验器中抛出 `ValueError` 返回过多细节；复杂校验尽量放在依赖项中完成（可访问数据库/外部服务）。

依赖项用于“请求级校验”的示例（仅作为约定演示）：

```python
from fastapi import Depends

async def valid_resource_id(resource_id: str) -> dict:
    """校验资源是否存在，不存在则抛出业务异常。"""
    resource = {"id": resource_id}
    return resource

async def valid_owned_resource(
    resource: dict = Depends(valid_resource_id),
) -> dict:
    """链式依赖：在已校验存在的基础上，继续校验权限/归属。"""
    return resource
```

## 9. 数据库服务（`server/src/database.py`，SQLAlchemy 2.0）

采用 SQLAlchemy 2.0 风格，统一提供：
1. 引擎管理：连接串从 `config.py` 读取；配置连接池参数（pool_size/max_overflow/pool_pre_ping 等）。
2. 会话依赖：向应用提供 `Session`（同步）或 `AsyncSession`（异步）的依赖注入方式，确保请求生命周期内正确关闭。
3. 事务边界：建议在依赖中管理事务（按需 `commit/rollback`），业务服务层只表达意图。
4. 工具方法：
   1. 执行 SQL（text / Core / ORM）。
   2. 通用查询分页（与 `pagination.py` 协作）。
   3. 表读取/导出工具（若需要面向 LangChain 等组件）。

异步/同步策略建议（考虑到 LangChain 等生态可能存在同步调用）：
1. Web 请求链路优先使用异步会话（减少线程池压力）。
2. 若必须使用同步数据库访问（第三方库限制），将同步调用隔离到线程池，并严格控制并发与连接池规模。
3. 不在 `async` 路由内直接调用阻塞 I/O（同步 DB、同步 HTTP、文件系统阻塞操作）。

数据库命名约定（建议从一开始就设置）：
1. 表名与字段名采用小写蛇形命名。
2. 时间字段统一使用 `_at` 后缀，日期字段使用 `_date` 后缀。
3. 约束/索引命名使用一致的 naming convention（便于迁移与排错）。

另外，复杂数据组装优先在 SQL 层完成（SQL 优先，Pydantic 次之），尤其是聚合/多表 join/嵌套对象构造，避免 Python 层多次往返与循环拼装。

## 10. 数据库迁移（Alembic）

迁移约定：
1. 迁移必须可回滚；结构变更必须是静态的（避免依赖动态生成结构）。
2. 迁移文件名必须可读，建议采用 `YYYY-MM-DD_slug.py` 模式（slug 描述变更内容）。
3. 建议在 `alembic.ini` 设置 `file_template`，统一迁移文件命名。

## 11. rustfs 文件存储服务（`server/src/rustfs`）

目标：连接 `storage/docker-compose.yml` 中的 rustfs 服务，为项目内外提供统一的文件上传/下载与对象存储能力。

设计建议：
1. `client.py` 只负责“外部服务通信模型与调用封装”（鉴权、重试、超时、错误映射）。
2. 对外暴露稳定的接口（upload/download/delete/presign 等），业务模块不直接依赖 rustfs 细节。
3. 若 rustfs SDK 为同步实现，必须使用线程池隔离（`run_in_threadpool`），避免阻塞事件循环。

## 12. 全局共享模型（`server/src/models.py`）

放置原则：
1. 只放跨领域共用且稳定的 Pydantic 模型/类型（例如：统一响应模型、分页模型、通用枚举、ID 类型别名等）。
2. 禁止把“领域专属模型”塞到全局，防止变成巨型杂物间。
3. 若需要自定义基础 Pydantic 模型（统一 datetime 序列化、`model_dump` 策略等），可在此处提供 `BaseSchema` 供各领域继承。

## 13. API 设计与文档约定

1. 遵循 REST 资源路径规范，尽量通过一致的 path 参数命名复用依赖项（例如统一用 `user_id/profile_id`）。
2. 路由必须填写 `response_model`、`status_code`、`summary/description/tags`，必要时用 `responses` 描述多状态响应，提升可读性与可维护性。
3. 默认在生产环境隐藏 OpenAPI/Swagger 文档，仅在允许的环境显示（本项目不使用环境变量时，可通过 `config.py` 开关控制）。

## 14. 测试与代码质量

1. 从一开始就设置异步测试客户端（推荐 httpx AsyncClient 或等价方案），避免未来事件循环相关问题。
2. 引入 ruff 作为统一的 lint + format 工具，减少团队风格分歧与 review 成本。
