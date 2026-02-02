# Web 基础工程化设计（Next.js 16.1.6 / 企业级 Feature-Sliced 变体）

本文档定义 `web/` 在构建企业级复杂应用（HR 系统 + AI 平台 + FastAPI 后端）时的基础工程化规范，用于“控制复杂度”。  
`app/` 只负责路由与布局，不承载复杂业务逻辑；复杂逻辑下沉到 `features/`，基础设施收敛到 `lib/`，全局客户端状态集中到 `stores/`，全局类型集中到 `types/`。

---

## 1. 总体原则

- 路由层薄：`app/` 的 page/layout 只做组装与少量数据预取，不写业务逻辑
- 业务按领域拆：按“认证/HR/Agents/KB”等领域切片，而不是按技术类型堆文件夹
- 数据流清晰：Server → Client 单向流动；Client 不直接触碰服务端机密（如 token）
- 基础设施集中：网络请求、错误映射、日志/埋点、工具函数放在 `lib/`，避免散落
- 全局状态最小化：只把“跨页面共享的 UI/用户/偏好”放到 `stores/`，避免把服务器数据也塞进 store

---

## 2. 推荐目录结构（Feature-Based + 基础设施收敛）

建议以 `web/` 为根目录，直接落这些顶层目录（如未来决定引入 `src/`，结构不变，仅整体下移一层）：

```text
web/
├── app/                         # 只负责路由定义与布局（薄）
│   ├── (auth)/login/page.tsx     # 引入 features/auth
│   ├── (dashboard)/hr/page.tsx   # 引入 features/hr
│   ├── (dashboard)/agents/page.tsx
│   └── api/                      # Next Route Handlers（仅对“同源代理/回调/webhook/流式代理”）
├── features/                     # 核心业务逻辑（按领域划分）
│   ├── auth/
│   ├── hr/
│   ├── agents/
│   └── knowledgebase/
├── components/                   # 全局通用组件（原子级/布局级）
│   ├── ui/                       # shadcn/ui 组件（Button/Input/...）
│   └── layout/                   # Header/Sidebar 等全局布局组件
├── lib/                          # 全局基础设施（网络、错误、toast、工具、配置）
├── stores/                       # 全局客户端状态（Zustand）
└── types/                        # 全局类型（API Response 泛型、领域共享类型等）
```

约束：

- `features/*/components` 只放该领域独享组件，不可被其他领域直接依赖（除非显式抽到 `components/`）
- 领域间共享能力应“上提”：共享 types → `types/`，共享 utils → `lib/`，共享 UI → `components/`

---

## 3. Feature 目录规范（领域内聚）

每个领域统一采用类似结构（可按复杂度删减，但不建议随意加新目录名）：

```text
features/<domain>/
├── components/          # 领域独享组件
├── hooks/               # 领域独享 hooks（只处理 UI/交互，不做跨域基础设施）
├── server/              # Server Actions / server-only helpers（actions.ts 等）
├── types.ts             # 领域内部类型（若跨域共享则上提到 types/）
├── utils.ts             # 领域内部辅助函数（若跨域共享则上提到 lib/）
└── index.ts             # 领域对外导出（可选，但推荐）
```

对 `server/` 的约束：

- 仅放 server-only：读取 cookie、调用后端、数据库/密钥等
- 任何 client 组件不得直接 import `server/` 内模块

---

## 4. 数据流规则（必须遵守）

### 4.1 “服务器状态 / 全局 UI 状态” 分离

- 服务器状态（列表、详情、分页、轮询、AI 历史）：应交给专门的“server state”方案管理（推荐 TanStack Query；或在 Server Component 做预取 + 客户端 cache）
- 全局 UI 状态（主题、侧边栏折叠、当前登录用户信息、全局偏好）：放 `stores/`（Zustand）

### 4.2 UI 层不要直接依赖后端细节

- UI 组件不要拼接后端 URL
- UI 组件不要解析后端错误码细节
- UI 组件只调用 `features/<domain>/server/actions.ts` 或领域内封装的 client-side service

---

## 5. 状态管理：三层分治（推荐组合）

| 状态类型 | 推荐方案 | 场景举例 |
|---|---|---|
| 服务器状态 | TanStack Query（可选引入） | HR 列表、KB 文档列表、AI 会话列表、轮询 |
| URL 状态 | Nuqs（可选引入） | 筛选、分页、Tab、Modal、看板视图参数 |
| 全局 UI 状态 | Zustand | 主题、Sidebar、当前登录用户信息、布局偏好 |
| 表单状态 | React Hook Form + Zod（按需） | 员工录入、Agent 配置、复杂校验 |

本仓库已安装 Zod；其余库按业务复杂度再引入，避免一开始“全家桶”。

---

## 6. 主题（Dark Mode）设计（next-themes + shadcn）

主题切换建议采用 `next-themes`（shadcn 官方推荐方案），在 `web/app/layout.tsx` 根布局接入：

- 在 `<html>` 添加 `suppressHydrationWarning`
- 根部用 `ThemeProvider`（`attribute="class"`，`defaultTheme="system"`，`enableSystem`）
- 主题切换按钮可放在全局布局（如 `components/layout/header`）

另外，你偏好用 Zustand 管理全局 UI 状态时，建议规则是：

- DOM 主题来源仍以 `next-themes` 为准（它负责 class 切换与 SSR/hydration 细节）
- Zustand 只记录“用户偏好”（例如 `themePreference: system|light|dark`），用于持久化与业务联动

---

## 7. 全局 Toast（Sonner）设计

### 7.1 放置位置

Sonner 的 `<Toaster />` 直接放 `web/app/layout.tsx` 中即可，不需要单独创建组件文件：

- 位置：右上角（`position="top-right"`）
- 作为“应用基础设施”，任何 feature 可调用统一的 toast 工具（可选放 `lib/toast.ts`，只做 thin wrapper）

### 7.2 使用规则

- 网络层默认不自动 toast，避免重复弹窗
- “动作层”（例如 `features/*/server/actions.ts` 或领域 service）决定何时 toast
- “会话失效”这种全局事件允许底层统一 toast 一次并触发登出/跳转

---

## 8. 基础设施：lib 目录边界

`lib/` 只放跨域共享、与业务无关的基础能力，建议拆分：

- `lib/api/`：fetch 封装、统一错误映射、SSE 客户端/代理工具
- `lib/toast.ts`：toast thin wrapper（可选）
- `lib/config/`：站点常量、导航配置、环境变量校验（如未来引入 t3-env）
- `lib/telemetry/`：埋点与错误上报（可选）

强约束：

- `lib/` 不允许导入任何 `features/*`（避免倒依赖）

---

## 9. 全局类型：types 目录边界

把跨域共享类型统一到 `types/`，避免在各处重复定义：

- `types/api.ts`：`ApiResponse<T>`、通用分页结构、错误码枚举（与后端对齐）
- `types/domain.ts`：跨领域共享的实体类型（例如 `UserPublic`、`FileObject` 的精简版本）

领域内部类型仍放在 `features/<domain>/types.ts`，只有当“多个领域都要用”才上提到 `types/`。

---

## 10. 类型同步与 Codegen（建议路线）

既然后端是 FastAPI，建议建立类型同步机制，减少手写接口与字段漂移：

- 导出 `openapi.json`
- 用 `openapi-typescript` 生成前端类型到 `types/`（或 `types/generated/`）

注意：

- 生成文件应作为“只读产物”，业务代码不要直接改它
- 业务层推荐再包一层“领域内稳定类型”，避免生成类型变动导致全项目大范围抖动

---

## 11. Server Actions 规范（工程化约束）

建议每个领域采用“桥接层”模式：

- `features/<domain>/server/actions.ts`：只暴露领域动作（CRUD/触发任务/调用 agent）
- `app/` 的 page 只 import actions，不直连后端
- 对 actions 的输入输出用 Zod 做验证与收口

如果后续 actions 变多，可考虑引入 `next-safe-action` 来统一：

- 输入校验（Zod）
- 统一错误捕获与错误消息映射
- 统一鉴权（读取 cookie、校验用户）

---

## 12. 与认证设计文档的关系

认证相关细节（Token、刷新、401/403 特殊处理、路由守卫）请参考：

- `docs/web/auth-design.md`
