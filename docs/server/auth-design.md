# 主认证模块（Auth）设计说明

本文档用于设计后端主认证模块（JWT + OTP 认证），工作目录为 `server/src/auth`。本系统以"手机号码/电话号码"作为认证用户名（唯一字段），用户主键采用 UUID，采用短信验证码（OTP）作为认证方式，并需要向 `server` 内其他服务提供"获取用户数据"的能力（通过依赖注入方式）。

---

## 1. 目标与范围

### 1.1 目标

- 提供统一的身份标识：`user_id(UUID)` + `phone(唯一)`。
- 基于 OTP（短信验证码）提供用户注册与登录能力。
- 提供 JWT 访问令牌（Access Token）与刷新令牌（Refresh Token）签发与验证能力。
- 提供标准化的鉴权上下文注入能力（供其他模块依赖注入/复用）。
- 向其他服务提供可控的用户数据获取能力（通过依赖注入）。
- 支持简单的 Token 撤销机制（刷新 Token 时失效旧 Token）。

### 1.2 非目标

- 不实现密码认证（完全基于 OTP）。
- 不实现第三方登录（OAuth/SSO）。
- 不实现设备绑定/指纹验证。
- 不实现多租户隔离。

---

## 2. 总体架构

### 2.1 模块边界

- `auth` 模块职责
  - 用户注册（通过手机号）
  - OTP 验证码生成与校验
  - Access Token 与 Refresh Token 的签发、校验、解析
  - Token 刷新与撤销机制
  - 产出"当前用户"上下文，供其他路由依赖注入
  - 通过依赖注入提供获取用户信息的能力
- 非 `auth` 模块职责
  - 业务资源的鉴权/授权（RBAC/ABAC）由业务模块结合用户上下文决定

### 2.2 交互流程（概览）

1) **注册/登录流程**：
   - 客户端发送手机号 → `auth` 生成并存储 OTP 验证码
   - 客户端提交手机号 + 验证码 → `auth` 校验成功后签发 Access Token + Refresh Token

2) **访问业务 API**：
   - 客户端请求业务 API → `Authorization: Bearer <access_token>`
   - 认证中间件/依赖验证 token → 解析 `user_id` → 加载用户
   - 业务模块通过依赖注入获得 `CurrentUser`（或 `user_id`）→ 完成业务处理

3) **Token 刷新流程**：
   - Access Token 过期 → 客户端使用 Refresh Token 请求刷新
   - `auth` 校验 Refresh Token → 签发新的 Access Token + Refresh Token → 撤销旧 Token

---

## 3. 数据模型设计

### 3.1 用户表（User）

> 说明：此处为逻辑模型，实际 ORM/迁移由实现阶段决定。用户表位于 `axiom_app` 数据库。

- 主键：`id: UUID`（服务端生成）
- 认证用户名：`phone: TEXT/VARCHAR`（唯一索引，非空）
- 状态：`is_active: bool`（禁用用户时可快速拦截）
使用统一基类 server\src\models.py

#### 3.1.1 手机号规范化

- 输入允许：11位数字。
- 存储建议：统一规范化后存储（去空格、去分隔符）。
- 唯一性：以规范化后的 `phone` 作为唯一键，避免重复注册。

### 3.2 OTP 验证码表（OTPCode）

用于存储短信验证码，建议使用 Redis 或关系数据库（带 TTL）。

- `id: UUID`（主键）
- `phone: TEXT/VARCHAR`（非空，用于查询）
- `code: TEXT/VARCHAR`（6位数字验证码）
- `created_at: TIMESTAMP`（创建时间）
- `expires_at: TIMESTAMP`（过期时间，通常 5-10 分钟）
- `attempts: INTEGER`（尝试次数，用于防暴力破解）
- `used: BOOLEAN`（是否已使用）

**存储建议**：
- 生产环境推荐使用 Redis，自动 TTL 过期
- 开发环境可使用数据库，配合定期清理任务

### 3.3 Token 撤销表（RevokedToken）

用于记录已撤销的 Token JTI（JWT ID），实现 Token 撤销功能。

- `jti: TEXT/VARCHAR`（主键，JWT 唯一标识）
- `user_id: UUID`（用户 ID，用于查询用户的所有已撤销 token）
- `expires_at: TIMESTAMP`（Token 原始过期时间，用于清理过期记录）
- `revoked_at: TIMESTAMP`（撤销时间）

**使用场景**：
- 刷新 Token 成功后，旧 Token 的 JTI 记录到此表
- 管理员强制用户登出时，将用户的所有活跃 Token 记录到此表

**清理策略**：
- 定期清理 `expires_at < 当前时间` 的记录（避免表无限增长）

---

## 4. JWT 设计

### 4.1 Token 类型与生命周期

- **Access Token**：用于访问业务 API
  - 生命周期建议：15–60 分钟（视安全要求）
  - 必需字段：`typ/sub/iat/exp/jti`
  - 存储：仅客户端存储（不存储在服务端）
  - 撤销：通过 RevokedToken 表记录 JTI 实现撤销

- **Refresh Token**：用于刷新 Access Token
  - 生命周期建议：7–30 天
  - 必需字段：`typ/sub/iat/exp/jti`
  - 存储：客户端安全存储（httpOnly Cookie 或本地加密存储）
  - 撤销：刷新成功后旧 Refresh Token 立即失效
  - **一次性使用**：刷新成功后必须返回新的 Refresh Token，旧的立即撤销

### 4.2 Access Token Claims

```json
{
  "typ": "access",
  "sub": "user_id (UUID)",
  "iat": 1738368000,
  "exp": 1738370800,
  "jti": "unique-token-id"
}
```

**字段说明**：
- `typ`: 固定为 `"access"`（区分 token 类型）
- `sub`: `user_id`（UUID 字符串），**唯一用户标识**
- `iat`: 签发时间（unix timestamp）
- `exp`: 过期时间（unix timestamp）
- `jti`: Token 唯一标识（UUID），用于撤销追踪

**注意**：
- **不在 Access Token 中存储 phone**，避免 token 泄露导致手机号暴露
- 如需获取手机号，通过 `user_id` 查询数据库

### 4.3 Refresh Token Claims

```json
{
  "typ": "refresh",
  "sub": "user_id (UUID)",
  "iat": 1738368000,
  "exp": 1741046400,
  "jti": "unique-refresh-token-id"
}
```

**字段说明**：
- `typ`: 固定为 `"refresh"`（区分 token 类型）
- 其他字段与 Access Token 相同

### 4.4 JWT 安全隐患与防范

#### 4.4.1 主要安全隐患

1. **Token 泄露**：Access Token 一旦泄露，攻击者可在有效期内冒用用户身份
2. **无法主动撤销**：JWT 本质是无状态的，签发后直到过期前都有效
3. **重放攻击**：如果 Refresh Token 未加密存储，可能被窃取重放

#### 4.4.2 防范措施

**1. Token 撤销机制（必需）**
- 刷新 Token 成功后，将旧 Access Token 和 Refresh Token 的 JTI 记录到 `RevokedToken` 表
- 验证 Token 时检查 JTI 是否在撤销列表中
- **限制**：只能撤销已知的 JTI，无法撤销未知泄露的 token（但可通过短期生命周期降低风险）

**2. 短期 Access Token 生命周期**
- 建议 15 分钟，降低 token 泄露后的风险窗口
- Refresh Token 可长期有效（7-30 天），但存储在客户端安全区域

**3. Refresh Token 一次性使用**
- 刷新成功后，旧 Refresh Token 立即失效
- 每次刷新返回新的 Refresh Token
- 防止 Refresh Token 被长期滥用

**4. 客户端存储安全**
- **Access Token**：内存存储（如 React State），页面关闭即丢失（符合无状态设计）
- **Refresh Token**：httpOnly Cookie（防 XSS）或 加密 LocalStorage（防 XSS）

**5. HTTPS 强制使用**
- 所有 API 必须使用 HTTPS，防止 token 在传输中被窃取
- 开发环境可配置 `allow_insecure`，生产环境必须禁用

**6. 速率限制**
- 登录接口限制：同一 IP + 手机号 5 分钟内最多 5 次请求
- 刷新 Token 接口限制：同一 JTI 只能使用一次
- 防止暴力破解和 DoS 攻击

### 4.5 加密与算法

**推荐算法**：HS256（对称加密）

**理由**：
- 单服务部署场景，无需复杂的密钥分发
- 性能优于非对称算法
- 密钥通过环境变量注入，运维简单

**非对称算法（可选）**：
- 如果未来需要多服务部署或更强的密钥管理，可使用 RS256/ES256
- 通过 `kid`（Key ID）选择公钥验证

### 4.6 密钥管理与轮换

**密钥配置**：
```python
class JWTConfig:
    secret_key: str  # 必须通过环境变量注入，长度至少 32 字节
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"
```

**密钥轮换策略（简单版）**：
- 维护 `active_secret` 和 `previous_secret` 两把密钥
- 签发时使用 `active_secret`
- 验证时依次尝试 `active_secret` 和 `previous_secret`
- 定期（如每 30 天）更新 `active_secret`，旧的降级为 `previous_secret`

**密钥轮换策略（进阶版）**：
- 为每个 token 的 `jti` 记录对应的 `kid`（Key ID）
- 维护多个密钥，每个密钥有 `kid`、`secret`、`active`、`created_at`
- 签发时使用当前活跃密钥，记录 `kid` 到 token claims
- 验证时根据 `kid` 选择对应密钥

---

## 5. API 设计（对外）

> 路由前缀示例：`/auth/*`（具体路径与风格可与项目现有路由保持一致）。

### 5.1 发送验证码

- `POST /auth/send-otp`
- 入参
  - `phone: string`（手机号码，规范化后）
- 出参
  - `expires_in: number`（验证码过期时间，秒）
- 错误码
  - 400：手机号格式不合法
  - 429：发送频率过高（速率限制）
- **行为说明**
  - 生成 6 位数字验证码
  - 存储到 OTPCode 表或 Redis（带 TTL）
  - 如果用户不存在则自动创建用户（首次使用即注册）
  - 调用短信服务发送验证码（需集成短信服务商 API）

### 5.2 登录/注册（验证码换取 Token）

- `POST /auth/login`
- 入参
  - `phone: string`（手机号码）
  - `code: string`（验证码）
- 出参
  - `access_token: string`
  - `refresh_token: string`
  - `token_type: "bearer"`
  - `expires_in: number`（Access Token 过期时间，秒）
  - `user: { id, phone, created_at, last_login_at }`
- 错误码
  - 400：手机号或验证码格式不合法
  - 401：验证码错误/过期/已使用
  - 403：用户被禁用
  - 429：验证失败次数过多（防暴力破解）
- **行为说明**
  - 验证码校验成功后，如果用户不存在则自动创建
  - 更新 `last_login_at` 时间戳
  - 签发 Access Token 和 Refresh Token
  - 将验证码标记为已使用（防止重复使用）

### 5.3 刷新 Token

- `POST /auth/refresh`
- 入参
  - `refresh_token: string`
- 出参
  - `access_token: string`
  - `refresh_token: string`（新的 Refresh Token）
  - `token_type: "bearer"`
  - `expires_in: number`（Access Token 过期时间，秒）
- 错误码
  - 401：Refresh Token 无效/过期/已撤销
- **行为说明**
  - 验证 Refresh Token 的有效性
  - 将旧的 Refresh Token 的 JTI 记录到 `RevokedToken` 表（立即撤销）
  - 将旧的 Access Token 的 JTI 记录到 `RevokedToken` 表（如果存在）
  - 签发新的 Access Token 和 Refresh Token
  - **重要**：Refresh Token 是一次性的，每次刷新必须返回新的

### 5.4 获取当前用户

- `GET /auth/me`
- Header
  - `Authorization: Bearer <access_token>`
- 出参
  - `id: UUID`
  - `phone: string`
  - `created_at: datetime`
  - `last_login_at: datetime`
  - `is_active: boolean`
- 错误码
  - 401：Token 缺失/无效/过期/已撤销

### 5.5 登出（可选）

- `POST /auth/logout`
- Header
  - `Authorization: Bearer <access_token>`
- 出参
  - `message: "success"`
- 错误码
  - 401：Token 无效
- **行为说明**
  - 将当前 Access Token 和 Refresh Token 的 JTI 记录到 `RevokedToken` 表
  - 客户端删除本地存储的 token
  - **注意**：JWT 无状态，服务端无法强制客户端删除 token，此操作仅标记 token 为已撤销

---

## 6. 服务内能力：向其他模块提供"获取用户数据"

通过依赖注入方式提供服务内能力，适用于 `server` 是一个 FastAPI 应用，`agent/dashboard/knowledgebase/...` 等模块都在同进程内。

### 6.1 依赖注入函数

`auth` 模块提供以下 FastAPI 依赖函数：

- `get_current_user()`：从请求头解析 Access Token，返回当前用户上下文
- `get_user_by_id(user_id)`：按 UUID 查询用户
- `get_user_by_phone(phone)`：按 phone 查询用户
- `require_active_user()`：确保用户处于激活状态

**使用示例**：
```python
from fastapi import Depends, APIRouter
from auth.dependencies import get_current_user

router = APIRouter()

@router.get("/api/dashboard")
async def get_dashboard(
    current_user: User = Depends(get_current_user)
):
    # current_user 包含用户信息
    user_id = current_user.id
    phone = current_user.phone
    # 业务逻辑...
```

### 6.2 优势

- 无额外网络开销
- 统一校验逻辑与数据模型
- 易于测试
- 类型安全（FastAPI 自动处理）

### 6.3 用户数据暴露分层

建议定义两套 DTO：

- `UserPublic`
  - `id: UUID`
  - `phone: string`
  - `created_at: datetime`
  - `last_login_at: datetime`

- `UserInternal`
  - 继承 `UserPublic`
  - `is_active: boolean`

**使用说明**：
- `UserPublic`：用于对客户端响应（如 `/auth/me` 接口）
- `UserInternal`：用于服务内使用（如依赖注入返回的类型）

**注意**：
- 不在 JWT 中存储 phone，避免 token 泄露导致隐私泄露
- 如需获取 phone，通过 `user_id` 查询数据库

---

## 7. 安全设计

### 7.1 OTP 验证码安全

- 验证码长度：6 位数字
- 验证码有效期：5-10 分钟（可配置）
- 验证码尝试次数：最多 3-5 次（可配置）
- 验证码使用后立即失效（防止重复使用）
- 发送频率限制：同一手机号 1 分钟内最多 1 次，5 分钟内最多 3 次

### 7.2 防护与风控

- 登录接口增加速率限制（按 IP + phone）
- 连续失败触发冷却时间（如 5 分钟）
- 验证失败次数过多时要求重新发送验证码

### 7.3 错误信息策略

- 验证码错误时统一提示"验证码错误或已过期"，避免枚举手机号是否存在
- 内部接口在 404/403 时可返回更明确错误，便于服务联调（仅限内网）

---

## 8. 短信服务集成

### 8.1 短信服务商选择

建议集成主流短信服务商：
- 阿里云短信
- 腾讯云短信
- 网易云信

### 8.2 短信模板

- 注册/登录模板："您的验证码是 {code}，5 分钟内有效。"
- 提醒：验证码模板需在短信服务商平台备案

### 8.3 异常处理

- 短信发送失败时记录日志
- 返回明确的错误信息给客户端
- 提供重试机制（如客户端可重新请求发送）

---

## 9. 可观测性与审计

### 9.1 日志记录

记录关键事件（建议异步）：
- 用户注册成功
- 登录成功/失败（不含验证码）
- Token 签发（可记录 `jti/sub/iat/exp`）
- Token 刷新
- Token 撤销
- 验证码发送成功/失败

### 9.2 日志脱敏

- phone 仅显示部分（如 `138****5678`）或以 hash 形式记录（视合规要求）
- 验证码绝不在日志中出现

---

## 10. 目录结构建议（实现阶段参考）

本节只给出建议结构，不包含具体代码实现。

```
server/src/auth/
  ├── router.py          # 对外 API 路由
  ├── service.py         # 认证领域逻辑（OTP、登录、token）
  ├── models.py          # ORM 模型（User、OTPCode、RevokedToken）
  ├── schemas.py         # 请求/响应 DTO（UserPublic、UserInternal）
  ├── dependencies.py    # FastAPI 依赖注入（get_current_user 等）
  ├── config.py          # 配置（JWT 密钥、过期时间、短信配置）
  ├── utils.py           # 工具函数（手机号规范化）
  ├── exceptions.py      # 统一错误封装
  ├── security.py        # JWT 工具（签发、验证、撤销）
  └── sms.py            # 短信服务集成
```

---

## 11. 验收标准（实现阶段）

### 11.1 用户管理

- 手机号作为唯一用户名：同一号码无法重复注册
- 用户主键为 UUID：`id` 格式合法且服务端生成
- 用户表位于 `axiom_app` 数据库
- `axiom_agent` 等模块通过 `user_id` 引用用户

### 11.2 OTP 认证

- 发送验证码接口正常工作（调用短信服务）
- 验证码有效期与尝试次数限制生效
- 验证码使用后立即失效
- 验证码错误时返回统一错误信息

### 11.3 JWT 认证

- 登录可签发 Access Token 和 Refresh Token
- 受保护接口可验证 token 并解析出用户
- Token 过期与无效签名能正确拦截
- Token 撤销机制生效（刷新成功后旧 token 失效）

### 11.4 用户数据获取

- 业务模块可通过依赖注入获取当前用户信息
- 依赖注入返回的类型为 `UserInternal`（含 is_active）
- 对外接口返回的类型为 `UserPublic`（不含 is_active）

### 11.5 安全性

- JWT 中只存储 `user_id`，不存储 phone
- Access Token 生命周期建议 15 分钟
- Refresh Token 一次性使用
- 所有接口有速率限制
- HTTPS 强制使用（生产环境）

---

**文档结束**

*本文档为基于 OTP + JWT 的认证模块设计，涵盖数据模型、API 设计、安全机制、依赖注入等核心内容。建议在实现前由相关方详细评审。*
