# server 基础服务开发计划（Dev）

基于 [base-design.md](file:///d:/project/FullStack/axiom/docs/server/base-design.md) 的基础服务设计，制定可落地的开发计划与测试清单。目标是让基础设施先行、接口一致、可验证、可回归，为后续业务模块铺路。

---

## 0. 约定与验收标准

### 0.1 约定
- 本计划只覆盖基础服务（配置、日志、响应、异常、分页、数据库、rustfs）。
- 配置统一写入 `server/src/config.py`，不从环境变量读取。
- 所有模块必须提供可测试的接口（同步/异步可分别覆盖）。
- 测试脚本统一放在 `server/tests/base`。

### 0.2 验收标准（Definition of Done）
- 统一响应与分页响应格式在所有基础工具中对齐。
- 全局异常处理器可以覆盖 AppError / HTTPException / RequestValidationError。
- 日志输出结构稳定，且标准 logging 可被 Loguru 接管。
- 数据库模块支持同步/异步引擎与会话依赖，具备基础事务边界能力。
- rustfs 客户端具备上传/下载/删除/预签名接口（可在本地 mock 或真实服务验证）。
- `server/tests/base` 的测试脚本全部通过。

---

## 1. 里程碑与任务拆分

### M1：基础配置与目录结构（0.5 天）
- 梳理 `server/src/config.py` 的配置项分组（数据库、日志、存储、文档开关）。
- 去除 BaseSettings 的必填环境变量依赖，保证模块导入即用。
- 明确 `server/src/models.py` 的全局模型边界（只放跨领域共享模型）。

交付物：
- 配置可直接 import 使用。
- `base` 测试中配置读取通过。

### M2：统一响应与分页（0.5 天）
- 在 `response.py` 实现成功/失败响应构造器与统一数据结构。
- 在 `pagination.py` 实现分页数据构造与分页响应封装。

交付物：
- 统一格式 `{code,msg,data}` 与分页格式 `{code,msg,data:{items,total,...}}`。
- `server/tests/base/test_response.py` 与 `test_pagination.py` 通过。

### M3：异常与错误码体系（0.5 天）
- 定义全局 `ErrorCode`（或常量集）。
- 实现 `AppError` 及 `to_response()`。
- 在 `exceptions.py` 注册全局 ExceptionHandler。

交付物：
- 统一异常输出格式。
- `server/tests/base/test_exceptions.py` 通过。

### M4：日志初始化（0.5 天）
- 实现 `logging_service.py`：Loguru 输出 + 标准 logging 接管。
- 定义统一的日志字段键名（request_id、path、status_code 等）。

交付物：
- `init_logging()` 与 `get_logger()` 可用。
- `server/tests/base/test_logging.py` 通过。

### M7：公共服务（0.5 天）
- 实现 `sms_service.py`：支持 Mock / 阿里云短信发送。
- 在 `config.py` 增加短信服务配置。

交付物：
- `server/tests/base/test_sms_service.py` 通过。

### M5：数据库服务（1～2 天）
- 使用 SQLAlchemy 2.0 统一同步/异步引擎。
- 提供 Session/AsyncSession 依赖与事务边界。
- 提供通用执行工具与基础分页查询支持。

交付物：
- `get_engine()` / `get_async_engine()` / `get_session()` / `get_async_session()`。
- `server/tests/base/test_database.py` 通过。

### M6：rustfs 文件存储服务（1 天）
- 实现 rustfs 客户端封装（基于 `minio` SDK）。
- 实现 `service.py`：负责 Bucket 初始化。
- 实现 `router.py`：暴露上传/下载/删除/预签名接口。

交付物：
- `server/tests/base/test_rustfs_client.py` 通过。
- 接口 `/files/upload` 等可用。

---

## 2. 推荐目录与文件（基础服务）

```
server/
  src/
    config.py
    logging_service.py
    sms_service.py
    response.py
    exceptions.py
    pagination.py
    database.py
    models.py
    rustfs/
      client.py
      service.py
      router.py
      dependencies.py
  tests/
    base/
      test_config.py
      test_response.py
      test_pagination.py
      test_exceptions.py
      test_logging.py
      test_sms_service.py
      test_database.py
      test_rustfs_client.py
```

---

## 3. 测试脚本（`server/tests/base`）

执行方式（示例）：

```bash
python -m unittest discover -s server/tests/base -p "test_*.py"
```

测试范围：
- 配置加载与必填项检查
- 统一响应与分页响应结构
- 异常类型与错误码输出结构
- 日志初始化与标准 logging 兼容
- 数据库引擎与会话依赖（以 sqlite 内存库或 mock 为主）
- rustfs 客户端接口可用性

---

## 4. 风险与注意事项

1. 配置不使用环境变量时，必须避免把敏感信息写入仓库。
2. SQLAlchemy 未引入前测试会失败，需要先完成依赖声明。
3. rustfs 若未启动，可使用 mock 或 skip 策略区分集成测试。
