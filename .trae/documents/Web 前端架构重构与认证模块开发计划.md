# Web 前端重构与认证模块开发计划

根据 `docs/web/base-design.md` 和 `docs/web/auth-design.md`，制定以下开发计划。

## 1. 基础设施建设 (Infrastructure)

### 1.1 依赖安装
- 安装缺失的核心依赖：`zustand`, `sonner`, `next-themes`。
- 确认 `lucide-react`, `clsx`, `tailwind-merge` 已存在（已确认）。

### 1.2 目录结构初始化
按照 Feature-Sliced 规范创建目录：
- `web/features/` (业务领域)
- `web/stores/` (全局状态)
- `web/types/` (全局类型)
- `web/lib/api/` (API 基础设施)

### 1.3 全局类型定义 (`web/types/`)
- 创建 `api.ts`: 定义 `ApiResponse<T>`, `ApiError` 接口。
- 创建 `auth.ts`: 定义 `User`, `TokenPayload` 等认证相关基础类型。

### 1.4 核心工具库封装 (`web/lib/`)
- `api/client.ts`: 封装 Fetch 请求，实现统一的 Base URL、错误处理（将 HTTP 错误转为 `ApiError`）、响应解包。
- `utils.ts`: 确保现有工具函数保留，整合 `cn` 等样式合并工具。

### 1.5 全局状态管理 (`web/stores/`)
- 创建 `auth-store.ts`: 使用 Zustand 管理 `status` (unknown/authenticated/unauthenticated), `user`, `access_expires_at`。
- 创建 `ui-store.ts`: 管理全局 UI 偏好（如 Sidebar 状态）。

### 1.6 全局布局配置 (`web/app/layout.tsx`)
- 接入 `ThemeProvider` (next-themes) 实现暗黑模式支持。
- 接入 `Toaster` (Sonner) 实现全局 Toast。

## 2. 认证模块实现 (Feature: Auth)

### 2.1 认证领域层 (`web/features/auth/`)
- **Types**: 定义 `LoginForm`, `LoginResponse` schema (Zod)。
- **Components**:
  - `login-form.tsx`: 登录表单（手机号 + 验证码）。
  - `sms-code-input.tsx`: 验证码输入组件（带倒计时）。
- **Server Actions** (`server/actions.ts`):
  - `login`: 调用后端 `/api/auth/login`，设置 HttpOnly Cookie。
  - `logout`: 清除 Cookie，调用后端注销接口。
  - `getMe`: 获取当前用户信息。
- **Hooks**: `useAuth` 封装 Store 和 Actions，提供 `login`, `logout` 方法。

### 2.2 登录页面 (`web/app/(public)/login/page.tsx`)
- 组装登录页面，使用 `features/auth` 组件。
- 页面加载时若已登录则自动跳转。

### 2.3 Token 管理与 BFF 层
- **Route Handlers** (`web/app/api/auth/[...nextauth]/route.ts` 或独立路由):
  - 虽然不使用 NextAuth.js 库，但遵循 Next.js 模式。
  - 实现 `/api/auth/refresh` 代理：Next 服务端读取 Refresh Token Cookie -> 调用后端刷新 -> 更新 Cookie -> 返回前端结果。
  - 前端 `auth-store` 中实现定时刷新逻辑。

## 3. 路由重构与守卫 (Routing & Guard)

### 3.1 路由分组
- 创建 `web/app/(public)`: 放置 `login` 等无需登录页面。
- 创建 `web/app/(protected)`: 放置 `dashboard`, `chat` 等需登录页面。

### 3.2 服务端守卫
- 在 `web/app/(protected)/layout.tsx` 中实现：
  - 检查 Cookie 中是否存在 Access Token。
  - 若不存在 -> Redirect to `/login`.
  - 若存在 -> 允许渲染，并预取用户信息注入 Store。

### 3.3 现有页面迁移
- 将 `web/app/chat` 移动至 `web/app/(protected)/chat` (暂定，或保持在根目录但受 Middleware 保护)。
- 推荐使用 Route Group 方案，将 `chat` 移入 `(protected)`。

## 4. 验证与测试
- 验证登录流程（发送验证码 -> 登录 -> 跳转）。
- 验证页面刷新后登录态保持。
- 验证 Token 过期自动刷新机制（通过修改本地时间或缩短 Token 有效期测试）。
- 验证退出登录功能。
- 验证未登录访问受保护页面被拦截。

## 执行策略
- **非破坏性**：优先新建文件，不直接覆盖 `app/page.tsx` 直到新结构就绪。
- **增量迁移**：先跑通登录，再接入现有 Chat 功能。
