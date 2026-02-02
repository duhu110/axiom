# 后端认证模块 (Auth) 实现计划

根据 `docs\server\auth-design.md` 的设计文档与当前代码库的现状（`auth` 模块文件为空），我制定了以下实现计划。

## 1. 配置与基础设施
- **修改 `server/src/config.py`**:
  - 添加 `AuthConfig` 类，包含 JWT 密钥、算法、过期时间等配置。
  - 在 `Settings` 中集成 `auth` 配置。
- **完善 `server/src/auth/config.py`**:
  - 引用全局配置，提供便捷访问。

## 2. 数据模型 (Models)
- **编辑 `server/src/auth/models.py`**:
  - 实现 `User` 模型：包含 UUID 主键、手机号、状态、时间戳。
  - 实现 `OTPCode` 模型：用于存储短信验证码及状态。
  - 实现 `RevokedToken` 模型：用于记录已撤销的 Token (JTI)。

## 3. 数据校验与传输对象 (Schemas)
- **编辑 `server/src/auth/schemas.py`**:
  - 定义 `OTPRequest` (发送验证码请求)。
  - 定义 `LoginRequest` (登录请求)。
  - 定义 `Token` (响应 Token 结构)。
  - 定义 `TokenPayload` (JWT 载荷结构)。
  - 定义 `UserPublic` 和 `UserInternal` (用户信息响应)。

## 4. 工具与安全 (Utils & Security)
- **编辑 `server/src/auth/utils.py`**:
  - 实现 `normalize_phone`：手机号格式化。
  - 实现 `generate_otp`：生成随机验证码。
- **创建 `server/src/auth/security.py`**:
  - 实现 JWT 的签发 (`create_access_token`, `create_refresh_token`)。
  - 实现 JWT 的解码与验证。

## 5. 核心业务逻辑 (Service)
- **编辑 `server/src/auth/service.py`**:
  - 实现 `AuthService` 类。
  - `send_otp`: 生成 OTP -> 存库 -> 调用 `SmsService` 发送。
  - `login`: 校验 OTP -> 获取/创建用户 -> 签发 Token。
  - `refresh_token`: 校验 Refresh Token -> 撤销旧 Token -> 签发新 Token。
  - `revoke_token`: 将 Token 加入撤销列表。

## 6. 依赖注入 (Dependencies)
- **编辑 `server/src/auth/dependencies.py`**:
  - 实现 `get_current_user`: 解析 Token -> 校验是否撤销 -> 查询用户。
  - 实现 `get_current_active_user`: 确保用户未被禁用。

## 7. API 接口 (Router)
- **编辑 `server/src/auth/router.py`**:
  - 实现 `/auth/send-otp`
  - 实现 `/auth/login`
  - 实现 `/auth/refresh`
  - 实现 `/auth/me`
  - 实现 `/auth/logout`

## 8. 集成与数据库迁移
- **修改 `server/src/main.py`**:
  - 注册 `auth_router`。
- **数据库迁移**:
  - 生成 Alembic 迁移脚本 (`alembic revision --autogenerate`)。
  - 应用数据库迁移 (`alembic upgrade head`)。

## 9. 验证与测试
- 手动验证 API 流程：发送验证码 -> 登录 -> 获取用户信息 -> 刷新 Token -> 登出。
- 确认数据库表结构正确生成。
