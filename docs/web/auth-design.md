# Web 前端认证设计（Next.js 16 / React 19）

本文档描述 `web/`（Next.js 16.1.6）对接 `server/` 现有认证体系（短信验证码登录、获取用户信息、刷新 Token、退出登录）的前端整体方案，覆盖：

- 统一 API 调用工具（普通 JSON / SSE 流式）
- Token 保存策略与无感刷新机制
- 路由守卫（除 login 外均需登录）
- 全局错误拦截与 Toast（Sonner，右上角）
- 用户信息保存与全局复用
- 退出登录的“混合退出”体验

后端统一响应格式为：

- 成功：`{ code: 0, msg: "ok", data: any | null }`
- 失败：`{ code: number (!=0), msg: string, data: any | null }`

参考后端实现：

- 统一响应：`server/src/response.py`
- 全局异常：`server/src/exceptions.py`
- 认证路由：`server/src/auth/router.py`

关于 Next.js 16 的 `proxy.ts`（替代 `middleware.ts`）官方说明：

- Proxy 文件约定：https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- 迁移说明：https://nextjs.org/docs/messages/middleware-to-proxy

---

## 1. 后端认证契约（与前端交互点）

### 1.1 已有接口

后端 `server/src/auth/router.py` 当前提供：

- `POST /api/auth/send`：发送验证码
- `POST /api/auth/login`：验证码登录，返回 Token（access/refresh/expires_in/server_time/access_expires_at/refresh_expires_at）
- `POST /api/auth/refresh`：刷新 Token（需要 `Authorization: Bearer <access_token>` 且 body 传 `refresh_token`，并会撤销旧 access token）
- `GET /api/auth/me`：获取当前用户信息（需要 `Authorization`）
- `POST /api/auth/logout`：登出（撤销 access token，需要 `Authorization`）

### 1.2 对前端的关键影响

- 后端约定：除认证/鉴权失败（401/403）外，其余错误统一返回 HTTP 200，通过 `code` 表达业务失败
- 认证失败应优先依赖 HTTP 状态码（401/403）判断，`code` 作为补充区分（例如 Token 过期 vs 无效凭证）
- refresh 依赖“仍有效的 access token”，因此必须在过期前主动刷新，不能等 401 后再刷新（一旦 access 过期，refresh 将无法调用成功）

建议前端识别的错误码（示例）：

- `10003`：UNAUTHORIZED（无效/撤销的 access token、缺少凭证等）
- `10004`：FORBIDDEN（无权限）
- `10005`：TOKEN_EXPIRED（access 或 refresh 已过期）

---

## 2. 目标与边界

### 2.1 目标

- 登录成功后自动建立登录态（Token + 用户信息），可跨刷新保持
- 所有 API 统一入口：统一 base URL、统一错误转换、统一认证注入
- access token 到期前自动刷新（无感），并对并发刷新做互斥
- 除 `/login` 外页面默认都需登录才能访问（服务端优先、客户端兜底）
- 全局 Toast 能稳定输出，不需要每个页面重复搭建

### 2.2 非目标（暂不做）

- 不在本文档阶段引入第三方身份系统（Auth0/Clerk 等）
- 不做角色/权限（RBAC）细化，只做“是否已登录”的门禁

---

## 3. 推荐总架构：BFF（Next Route Handlers）+ HttpOnly Cookie

### 3.1 为什么推荐走 Next 的 BFF 层

把“Token 注入 / 刷新 / SSE 代理”等放在 Next 的服务端边界（Route Handlers / Server Actions）有明显优势：

- 浏览器不持久化敏感 Token（降低 XSS 直接窃取风险）
- SSE 更容易做：服务端代理可以注入 `Authorization`（绕开 `EventSource` 无法设置 Header 的限制）
- 前端统一同源访问 `/api/*`，避免跨域与 base URL 分散配置
- 路由守卫更符合 App Router：服务端 layout 可读取 Cookie 并直接 `redirect()`

### 3.2 Token 保存策略（推荐）

按敏感程度分层保存：

- `access_token`：HttpOnly Cookie（仅 Next 服务端可读）
- `refresh_token`：HttpOnly Cookie（仅 Next 服务端可读）
- `access_expires_at`：可读 Cookie 或 `sessionStorage`（仅用于刷新调度，不含敏感信息）
- `user`：前端状态（内存）+ 可选 sessionStorage 缓存

说明：

- 若因特殊原因必须让浏览器直连后端（不走 BFF），建议 `access_token` 仅存内存，`refresh_token` 存 `sessionStorage`（不建议 `localStorage`）

---

## 4. 目录规划（贴合当前仓库）

认证属于典型“跨页面共享能力”，建议按 Feature-Sliced 变体组织，避免认证逻辑散落 `app/` 与各页面中。基础工程化整体规范见 `docs/web/base-design.md`，这里仅列出认证相关的落位建议：

- `web/app/(auth)/login/page.tsx`：登录页（只做页面组装，引用 `features/auth`）
- `web/features/auth/`：认证领域
  - `components/`：登录表单、验证码输入等仅认证模块使用的组件
  - `hooks/`：仅认证模块使用的 hooks
  - `server/actions.ts`：登录/刷新/登出/拉取用户信息的 Server Actions（或对接 Next BFF 的桥接层）
  - `types.ts`：认证域内部类型（如 LoginForm 值、状态枚举）
  - `utils.ts`：认证域内部辅助函数
- `web/stores/`：全局客户端状态（Zustand）
  - `auth-store.ts`：登录态元信息（如 `status`、`access_expires_at`）与用户信息缓存（或拆成 user-store）
  - `ui-store.ts`：全局 UI 状态（主题/侧边栏等）
- `web/types/`：全局共享类型
  - `api.ts`：`ApiResponse<T>`、通用错误码、分页结构等
- `web/lib/api/`：基础设施
  - `client.ts`：JSON API fetch 封装（统一响应解析、错误映射）
  - `sse.ts`：SSE 相关封装（浏览器侧消费/Next 侧代理策略）
  - `errors.ts`：统一错误类型

---

## 5. API 调用层设计

### 5.1 JSON API：api-client 的职责

`api-client` 面向同源 `/api/*`（由 Next Route Handlers 提供），主要职责：

- 统一 base：`/api`
- 统一携带 `credentials: 'include'`（让 Cookie 自动随请求发送）
- 统一解析包裹响应：`{ code, msg, data }`
- 统一把业务失败（`code!=0`）转换为 `ApiError`
- 统一把 401/403 转换为 `AuthError`（触发清理登录态与跳转登录）
- 对断网/超时转换为 `NetworkError`

Toast 策略建议：

- 底层默认不自动 toast（避免重复弹窗）
- 在“动作层/页面层”按场景 toast
- 仅对“会话失效”这类全局事件允许底层做“只提示一次”的 toast

### 5.2 SSE：api-sse 的职责

本项目后端存在 `text/event-stream` 的流式接口（例如 `POST /agent/chat/stream`，并且要求登录态）。前端需要单独的 SSE 工具层，原因：

- SSE 的返回不是 JSON，而是事件流（需逐段解析/转发）
- `EventSource` 不支持设置自定义 `Authorization` Header（除非走代理或使用 fetch + 自解析）
- 需要在断线、401、刷新 Token 等边界条件下做更精细控制

推荐策略（与 BFF 配套）：

1) 浏览器请求 `GET/POST /api/agent/chat/stream`（同源，带 Cookie）  
2) Next Route Handler 读取 Cookie 中的 `access_token`，向后端发起带 `Authorization` 的请求  
3) Next 将后端 SSE 内容“原样转发”给浏览器，并保留必要头（如 `Content-Type: text/event-stream`）

这样浏览器端无需在 JS 中持有 Token，也无需绕开 `EventSource` 的 header 限制。

---

## 6. Token 生命周期与无感刷新

### 6.1 关键约束：后端 refresh 需要“仍有效的 access_token”

后端 `POST /api/auth/refresh` 在刷新时会先校验 `Authorization` 中的 access token（并撤销旧 token）。因此：

- **不能等到 access token 彻底过期再刷新**  
- 必须提前刷新（例如在过期前 30~60 秒）

### 6.2 刷新调度策略（推荐）

登录成功后，前端应获得/保存一个“可读的过期时间信息”，用于定时刷新：

- 优先使用后端返回的 `access_expires_at`（unix 秒）作为“绝对过期时间”
- 若仅返回 `expires_in`，建议使用 `server_time + expires_in` 计算 `access_expires_at`，避免客户端本地时间不准
- 刷新定时：`max(0, access_expires_at - now - skew)`  
  - `skew` 建议 30~60 秒，避免客户端时钟漂移/网络抖动导致刷新太晚

触发刷新时，前端调用同源 `/api/auth/refresh`，由 Next 代为注入 `Authorization` 和 `refresh_token`。

### 6.3 刷新并发控制（必须）

当多个请求同时遇到“即将过期/需要刷新”的状态时，需要避免并发刷新导致：

- 多个 refresh 竞争、互相撤销 token
- 业务请求拿到旧 token 再次失败

推荐机制：

- 全局唯一 refresh Promise（互斥锁）
- 其余请求在 refresh 进行中时排队等待结果
- refresh 成功后重放排队请求；失败则统一登出

### 6.4 兜底策略：401/403

如果仍然出现 401/403（如 token 已被撤销、refresh 失败、用户禁用），统一处理：

- 清理登录态（用户、过期信息、任何本地标记）
- 跳转 `/login`（可携带 `next=` 参数回跳）
- 触发一次 toast（例如“登录已失效，请重新登录”），避免每个接口重复弹窗

---

## 7. 登录态状态管理（Next.js 最佳实践）

### 7.1 状态内容

建议最小化并明确区分“可信来源”：

- `session`（登录态元信息）
  - `status`: `unknown | authenticated | unauthenticated`
  - `access_expires_at`: number（可读、用于刷新调度）
- `user`（`/api/auth/me` 返回的用户信息）
  - `id, phone, name, avatar, created_at, last_login_at`

注意：

- Token 本体不进入前端 store（推荐方案下由 HttpOnly Cookie 承载）
- `status=unknown` 仅用于首屏 hydration 前后的过渡（避免闪屏/错误跳转）

### 7.2 建议实现方式

按 Next.js 社区常见做法，有两条路线：

1) **轻量 Context + 自定义 hooks**（依赖少、可控性强）  
2) **全局 store（如 Zustand）**（订阅粒度更细、组件重渲染更可控）

你已明确倾向 Zustand，因此建议把认证相关的全局客户端状态统一收敛到 `web/stores/auth-store.ts`（或拆成 `auth-store` + `user-store`）：

- `auth.status`：`unknown | authenticated | unauthenticated`
- `auth.access_expires_at`：用于刷新调度
- `user.profile`：当前用户信息（来自 `/api/auth/me`）
- `actions`：`setAuthenticated`/`setUnauthenticated`/`setUser`/`clearSession` 等

对 Zustand 的约束：

- 只存“跨页面共享且需要频繁读取”的状态（登录态、用户信息、主题/布局偏好）
- 不要把服务器列表数据塞进 store（列表/分页/轮询属于 server state，更适合专门的缓存层）

### 7.3 用户信息加载策略

- 登录成功：立即调用 `/api/auth/me` 并写入 `user`
- 应用启动（受保护区域）：尝试调用 `/api/auth/me`
  - 成功 → `authenticated`
  - 失败（401/403）→ `unauthenticated`

---

## 8. 路由守卫设计（除 login 外都需登录）

### 8.1 路由分组（推荐）

在 `app/` 下用路由组区分公共区与受保护区：

- `app/(public)/login/page.tsx`
- `app/(protected)/...`（其余页面）

### 8.2 服务端守卫（首选）

在 `app/(protected)/layout.tsx` 使用**服务端**逻辑判定是否有有效会话：

- 读取 Cookie（由 Next 提供的 `cookies()`）
- 需要登录但没有会话 → `redirect('/login?next=...')`
- 有会话 → 允许渲染；并可在服务端预取用户信息（可选）

这样可以避免客户端“闪一下再跳转”的体验问题，且更符合 App Router 的 SSR/Streaming 模式。

### 8.3 客户端兜底守卫（必要时）

对于必须运行在客户端的页面（纯 Client Component 页面，或依赖浏览器 API），仍建议加一层兜底：

- `AuthGuard`：若 `status=unauthenticated` 则 `router.replace('/login')`
- `status=unknown` 时渲染 skeleton/loading

### 8.4 proxy.ts 的使用原则

由于 `proxy.ts` 位于网络边界，适合做：

- 重写/转发（例如把 `/server/*` 转发到后端）
- 设置某些通用 header
- 轻量级重定向（如把 `/` 重定向到 `/app`）

不建议把“读取用户信息、刷新 token、复杂鉴权”全部堆在 proxy.ts；这些更适合放在受保护 layout 的服务端逻辑与 `/app/api/*` 的 Route Handlers 中（官方也强调 Proxy 应作为最后手段使用，见文档链接）。

---

## 9. 统一 Toast：Sonner（右上角）

### 9.1 目标

- 全局只挂载一次 Toaster（在根布局）
- 错误提示默认在“动作层/页面层”触发，避免底层重复 toast
- 对关键的全局事件（会话失效）允许在底层只弹一次 toast

### 9.2 组件放置建议

- `web/app/layout.tsx` 中直接挂载 `<Toaster />`（无需单独创建组件文件）
- Sonner 位置：`top-right`
- 风格：建议开启 rich colors，保证“错误/成功/警告”一眼可辨

说明：

- Toast 属于全局基础设施，建议遵循“底层默认不 toast，动作层决定 toast”的规则（避免重复弹窗）

---

## 9.5 主题与认证的协同（工程化约束）

主题属于全局 UI 状态，但其 SSR/hydration 细节建议交给 `next-themes` 处理；`web/app/layout.tsx` 建议同时：

- 接入 `ThemeProvider`（`attribute="class"`、`defaultTheme="system"`、`enableSystem`），并对 `<html>` 添加 `suppressHydrationWarning`
- 挂载 Sonner `<Toaster position="top-right" />`

Zustand 侧建议只记录“用户偏好主题”（例如 `system|light|dark`），并在主题切换时同步给 `next-themes`，避免 store 与 DOM 状态不一致。主题的完整规范见 `docs/web/base-design.md`。

---

## 10. 登录、退出与用户信息流程

### 10.1 登录流程（短信验证码）

1) 用户在 `/login` 输入手机号 → 调用 `/api/auth/send`  
2) 输入验证码 → 调用 `/api/auth/login`  
3) 后端/Next BFF 将 token 写入 HttpOnly Cookie，并返回 `server_time`/`expires_in`/`access_expires_at`  
4) 前端保存 `access_expires_at`（可读）并启动刷新定时器  
5) 立即调用 `/api/auth/me` 获取用户信息并写入 store  
6) 跳转到 `next` 参数或默认首页

### 10.2 退出登录（混合退出，体验优先）

“混合退出”推荐做法：

- 前端立刻执行：
  - 清空 store 中的 `user/session`
  - 跳转 `/login`
- 同时 fire-and-forget 调用 `/api/auth/logout`：
  - 由 Route Handler 读取 Cookie 中 access token 调用后端 `/api/auth/logout` 撤销 token
  - 同时在响应里清除本地 Cookie（access/refresh）
  - 前端不等待结果（忽略成功/失败），提升退出操作的即时性

---

## 11. Zod 的使用建议（接口契约与防御性解析）

Zod（已安装）建议用于两件事：

1) **统一响应包裹解析**：保证 `code/msg/data` 形状稳定  
2) **关键数据结构解析**：Token、User、分页结构等

收益：

- 后端字段变更能尽早在前端报错
- 错误可统一映射成可读的 `ApiError`，并携带结构化信息（便于 toast/表单提示/埋点）

---

## 12. 安全与工程细节（额外考虑）

### 12.1 Cookie 安全属性

建议对 token cookie 设置：

- `HttpOnly: true`
- `Secure: true`（本地开发可放宽；生产必须 true）
- `SameSite: Lax`（兼顾安全与常见跳转场景）
- `Path: /`

### 12.2 CSRF

当认证态依赖 Cookie（即使只对同源 `/api/*` 生效），仍需考虑 CSRF：

- `SameSite=Lax` 已能挡住大部分跨站 POST
- Route Handlers 可额外校验 `Origin/Referer`（只允许本站来源）
- 需要更强保障时再加 CSRF token（双提交 Cookie）

### 12.3 日志与可观测性

建议在前端错误层增加：

- `requestId/traceId` 透传（若后端未来提供，可在响应 header 或 data 中返回）
- 将 `ApiError` 统一上报（Sentry/自建埋点），并对 401/403 单独统计

### 12.4 离线与超时

对 `NetworkError`：

- toast：提示“网络异常，请稍后重试”
- 可对幂等请求做有限重试（不建议对登录/刷新做自动重试）

---

## 13. 验收清单（实现完成后应满足）

- 访问除 `/login` 外任意页面：未登录会被重定向到 `/login`
- 登录成功后：用户信息可在全局访问，且刷新页面仍保持登录态
- access token 到期前：会自动刷新；刷新过程中不会产生多次 refresh 并发
- access token 意外失效：能统一登出并跳转 `/login`，且只 toast 一次
- SSE 流式接口：能携带认证态工作，且断线/401 时能正确处理
- 退出登录：立刻退出页面；后端撤销失败不会影响体验

---

## 14. 关键参考

- Next.js Proxy（proxy.ts）：https://nextjs.org/docs/app/api-reference/file-conventions/proxy  
- Middleware → Proxy 迁移说明：https://nextjs.org/docs/messages/middleware-to-proxy  
- 后端统一响应：`server/src/response.py`  
- 后端认证路由：`server/src/auth/router.py`  
- 后端 SSE 示例：`server/src/agent/router.py`

