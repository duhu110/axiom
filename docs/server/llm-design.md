# LLM 模块设计文档

本文档描述 LLM 管理模块的完整设计，包括模型配置管理、多供应商适配和用量统计。

---

## 1. 设计目标

1. **模型配置管理**：以模型为单位管理 LLM 配置，支持多供应商
2. **多供应商适配**：统一适配 DeepSeek、DashScope（通义千问）、OpenAI 兼容接口
3. **用量统计**：记录每次调用的 Token 用量，支持用户维度查询
4. **动态模型选择**：用户可在 Chat 接口中选择模型，支持默认模型机制

---

## 2. 总体架构

### 2.1 模块目录结构

```
server/src/llm/
├── __init__.py                 # 模块入口，导出核心接口
├── models.py                   # 数据库模型（llm_model + llm_usage）
├── schemas.py                  # Pydantic 请求/响应模型
├── service.py                  # 业务逻辑层
├── router.py                   # FastAPI 路由
├── factory.py                  # LLM 工厂函数（核心适配层）
└── adapters/
    ├── __init__.py
    ├── deepseek.py             # DeepSeekChat 适配器
    ├── dashscope.py            # 阿里云通义千问适配器
    └── openai_compatible.py    # OpenAI 兼容接口适配器
```

### 2.2 核心原则

1. **工厂模式**：统一工厂函数根据供应商类型返回对应的 LangChain ChatModel 实例
2. **配置数据库化**：模型配置存储在数据库中，由开发者直接维护
3. **向后兼容**：保留 `config.py` 中的硬编码配置作为备用

---

## 3. 数据库设计

### 3.1 模型配置表：llm_model

存储在 `axiom_app` 数据库。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK | 主键 |
| `provider` | VARCHAR(50) | NOT NULL, INDEX | 供应商：deepseek / dashscope / openai_compatible |
| `base_url` | VARCHAR(255) | NOT NULL | API 端点 |
| `api_key` | TEXT | NOT NULL | 密钥（当前明文存储） |
| `model_name` | VARCHAR(100) | NOT NULL, INDEX | 显示名称（如 DeepSeek-V3） |
| `model_id` | VARCHAR(100) | NULLABLE | 调用标识（某些平台需要 ID 而非名称） |
| `use_model_id` | BOOLEAN | DEFAULT FALSE | 调用时使用 model_id 还是 model_name |
| `support_reasoning` | BOOLEAN | DEFAULT FALSE | 支持推理思考（思维链） |
| `support_image` | BOOLEAN | DEFAULT FALSE | 支持图片输入 |
| `support_file` | BOOLEAN | DEFAULT FALSE | 支持文件输入 |
| `support_batch` | BOOLEAN | DEFAULT FALSE | 支持批处理 |
| `is_default` | BOOLEAN | DEFAULT FALSE, INDEX | 全局唯一默认模型 |
| `is_enabled` | BOOLEAN | DEFAULT TRUE, INDEX | 是否启用 |
| `sort_order` | INTEGER | DEFAULT 0 | 排序字段 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 创建时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 更新时间 |

**索引**：
- `(provider, is_enabled)` - 加速可用模型列表查询
- `(is_default)` - 快速定位默认模型
- `(model_name)` - 模型名称查询

**字段说明**：
- `use_model_id`：某些平台（如息壤）调用时需要传递 model_id 而非 model_name
- `support_reasoning`：标识模型是否支持推理思考，如 DeepSeek-Reasoner

### 3.2 用量统计表：llm_usage

**保持现有结构不变**。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 外键 -> users.id |
| model_name | String | 实际模型名称（字符串，不用外键） |
| prompt_tokens | Integer | 输入 Token |
| completion_tokens | Integer | 输出 Token |
| total_tokens | Integer | 总 Token |
| request_id | String | 请求追踪 ID |
| trace_id | String | 链路追踪（可选） |
| meta | JSON | 原始 usage 信息或其他元数据 |
| created_at | datetime | 调用时间 |

**设计决策**：
- `model_name` 保持字符串类型，不使用外键关联 `llm_model` 表
- 原因：历史数据兼容（模型删除后用量记录仍保留）、避免外键约束影响高频写入性能

---

## 4. 工厂模式适配器架构

### 4.1 核心工厂函数

```python
# llm/factory.py
async def get_llm_instance(
    model_id: UUID | None,
    db: AsyncSession
) -> BaseChatModel:
    """
    根据 model_id 获取 LLM 实例
    
    Args:
        model_id: 模型配置 ID，为空时使用默认模型
        db: 数据库会话
        
    Returns:
        配置好的 LangChain BaseChatModel 实例
        
    Raises:
        ModelNotFoundError: 模型不存在或未启用
    """
```

**工厂函数逻辑**：
1. 如果 `model_id` 为空，查询 `is_default=True` 的模型
2. 根据模型的 `provider` 字段，动态创建对应适配器
3. 根据 `use_model_id` 决定传递 `model_id` 还是 `model_name` 给底层 SDK
4. 返回已配置的 LangChain `BaseChatModel` 实例

### 4.2 适配器实现

| 适配器 | 继承自 | 特殊处理 |
|--------|--------|---------|
| DeepSeekChat | ChatOpenAI | 支持 `reasoning_content` 流式输出、历史消息字段补齐 |
| DashScopeChat | ChatOpenAI | 通义千问 OpenAI 兼容接口 |
| OpenAICompatibleChat | ChatOpenAI | 通用兼容接口，无特殊处理 |

### 4.3 DeepSeek 适配器特殊处理

DeepSeek Reasoner 模型需要特殊处理：

1. **reasoning_content 流式输出**：重写 `_stream` 和 `_astream` 方法，提取并传递推理内容
2. **历史消息字段补齐**：在 `_get_request_payload` 中为 assistant 消息补齐 `reasoning_content` 字段，避免 API 400 错误

```python
# 消息补齐逻辑
for message in messages:
    if message.get("role") == "assistant" and "reasoning_content" not in message:
        message["reasoning_content"] = ""
```

---

## 5. API 设计

### 5.1 模型管理方式

**模型配置由系统开发者直接在数据库中维护**，不提供管理员 API 接口。

### 5.2 用户接口

#### GET /api/llm/models

获取可用模型列表（仅返回 `is_enabled=True` 的模型，不含 `api_key`）。

**响应**：
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "items": [
      {
        "id": "uuid",
        "provider": "deepseek",
        "model_name": "DeepSeek-V3",
        "support_reasoning": false,
        "support_image": false,
        "support_file": false,
        "support_batch": false,
        "is_default": true,
        "sort_order": 0
      }
    ]
  }
}
```

### 5.3 用量查询接口（保留现有）

- `GET /api/llm/usage` - 查询当前用户的用量明细
- `GET /api/llm/usage/summary` - 查询当前用户的用量汇总

### 5.4 Chat 接口改造

`POST /agent/chat/stream` 新增可选参数：

```python
class ChatRequest(BaseModel):
    query: str
    session_id: str
    kb_id: str | None = None
    model_id: UUID | None = None  # 新增：指定模型，为空使用默认
```

---

## 6. 关键设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| APIKEY 层级 | 系统级别 | 管理员配置，所有用户共用平台的 APIKEY |
| 模型可见性 | 全部可见 | 启用的模型对所有用户可见 |
| 用量表关联 | 保持字符串 | 便于历史数据兼容和模型删除后数据保留 |
| 适配器组织 | 工厂模式 | 统一工厂函数根据供应商返回对应实例 |
| 默认模型 | 单一默认 | 系统全局只有一个默认模型 |
| 管理员接口 | 不提供 | 模型配置由开发者直接在数据库维护 |
| 模型验证 | 不自动验证 | 由开发者确保配置正确 |
| config.py 配置 | 保留 | 作为备用/默认值 |

---

## 7. 与 Agent 模块集成

### 7.1 改造点

1. `agent/service.py` 的 `chat_stream()` 方法新增 `model_id` 参数
2. 调用 `get_llm_instance(model_id)` 获取 LLM 实例
3. 将 LLM 实例传递给子 Agent（QAAgent、RAGAgent 等）

### 7.2 用量记录调整

- 统一在 `service.py` 的 `on_chat_model_end` 事件中记录
- 模型名称从 LLM 实例的 `model` 属性读取

### 7.3 调用流程

```
Chat 请求 (model_id)
    ↓
get_llm_instance(model_id)
    ↓
查询 llm_model 表
    ↓
根据 provider 创建适配器
    ↓
返回 ChatModel 实例
    ↓
传递给子 Agent 执行
    ↓
记录用量到 llm_usage 表
```

---

## 8. 数据迁移

### 8.1 模块重命名

```bash
git mv server/src/llm_usage server/src/llm
```

**影响点**：
- `server/src/main.py` - 路由注册
- `server/src/agent/service.py` - 导入路径
- `server/src/agent/subagents/qa_agent.py` - 导入路径

### 8.2 Alembic 迁移脚本

1. 创建 `llm_model` 表
2. 插入默认 DeepSeek 配置：

```sql
INSERT INTO llm_model (
    id, provider, base_url, api_key, model_name, model_id,
    use_model_id, support_reasoning, is_default, is_enabled, sort_order
) VALUES 
(
    gen_random_uuid(),
    'deepseek',
    'https://api.deepseek.com',
    'sk-xxx',  -- 从 config.py 读取
    'DeepSeek-V3',
    'deepseek-chat',
    true,
    false,
    true,   -- 设为默认
    true,
    0
),
(
    gen_random_uuid(),
    'deepseek',
    'https://api.deepseek.com',
    'sk-xxx',
    'DeepSeek-Reasoner',
    'deepseek-reasoner',
    true,
    true,   -- 支持推理
    false,
    true,
    1
);
```

---

## 9. 安全与合规

1. **API Key 保护**：用户接口不返回 `api_key` 字段
2. **用户隔离**：用户只能访问自己的 `llm_usage` 记录
3. **日志脱敏**：禁止在日志中输出完整请求体或响应体

---

## 10. 现状差距分析

基于对当前代码的审查，以下是现状与设计的完整差距对照。

### 10.1 差距总览

| # | 设计要求 | 当前状态 | 差距级别 |
|---|---------|---------|---------|
| 1 | 模块名为 `server/src/llm/` | 模块名为 `server/src/llm_usage/` | 需重命名 |
| 2 | 包含 `llm_model` 数据库表 | 不存在 | 需新建 |
| 3 | 包含 `factory.py` 工厂函数 | 不存在 | 需新建 |
| 4 | 包含 `adapters/` 适配器子包 | 不存在 | 需新建 |
| 5 | DeepSeek 适配器在 `llm/adapters/deepseek.py` | 在 `agent/llm.py` | 需移动 |
| 6 | DashScope 适配器 | 不存在 | 需新建 |
| 7 | OpenAI 兼容适配器 | 不存在 | 需新建 |
| 8 | `GET /api/llm/models` 用户接口 | 不存在 | 需新建 |
| 9 | Chat 接口支持 `model_id` 参数 | `AgentRequest` 无此字段 | 需改造 |
| 10 | 子 Agent 通过工厂获取 LLM | 各自硬编码创建 `DeepSeekChat` | 需改造 |
| 11 | 用量记录统一收口、模型名动态读取 | `service.py` 硬编码 `'deepseek-chat'`；RAG Agent 无用量记录 | 需修复 |

### 10.2 各文件详细问题

#### `agent/llm.py` - DeepSeekChat 适配器

- **现状**：位于 `agent/` 模块内，包含继承 `ChatOpenAI` 的 `DeepSeekChat` 类
- **设计要求**：移动到 `llm/adapters/deepseek.py`
- **改造**：整体移动，代码逻辑不变，仅改变位置；原文件删除

#### `agent/service.py` - AgentService

| 问题 | 说明 | 严重程度 |
|------|------|---------|
| 硬编码模型名 | 用量记录中写死 `'deepseek-chat'` | 高 |
| `_init_agents()` | 各子 Agent 自行创建 LLM 实例，不支持动态模型切换 | 高 |
| `chat_stream()` 缺少 `model_id` | 无法透传用户选择的模型 | 高 |
| 用量记录逻辑 | 在 `astream_events` 循环内反复赋值 `final_usage`，仅记录最后一个事件 | 中 |

#### `agent/schemas.py` - 请求模型

- **现状**：`AgentRequest` 缺少 `model_id` 字段
- **设计要求**：新增 `model_id: UUID | None = None`

#### `agent/subagents/qa_agent.py` - QA Agent

- **现状**：`__init__` 中若未传 llm 则硬编码创建 `DeepSeekChat(deepseek_think_model)`
- **设计要求**：LLM 由外部通过工厂函数创建后传入，QA Agent 不再自行创建

#### `agent/subagents/rag_agent.py` - RAG Agent

- **现状**：`__init__` 中硬编码创建 `DeepSeekChat(deepseek_model)`；`_rewrite_question` 和 `_answer` 两个 LLM 调用完全没有记录用量
- **设计要求**：LLM 由外部传入；用量统一记录

#### `agent/router_graph.py` - 路由图

- **现状**：`route_by_llm()` 每次调用时若未传入 llm 就新建 `DeepSeekChat` 实例
- **设计要求**：路由 LLM 也通过工厂函数获取

#### `main.py` - 路由注册

- **现状**：`from llm_usage.router import router as llm_usage_router`
- **设计要求**：改为 `from llm.router import router as llm_router`

---

## 11. 改造计划

按依赖关系分为 6 个阶段，严格顺序执行。

### 阶段 1：基础结构（模块重命名 + 数据库）

| 步骤 | 操作 | 文件 |
|------|------|------|
| 1.1 | `git mv server/src/llm_usage server/src/llm` 重命名模块 | 目录级 |
| 1.2 | 修改所有导入路径：`llm_usage` → `llm` | `main.py`、`agent/service.py`、`agent/subagents/qa_agent.py`、`llm/__init__.py`、`llm/service.py`、`llm/router.py`、`llm/schemas.py` |
| 1.3 | 在 `llm/models.py` 新增 `LLMModel` ORM 模型 | `llm/models.py` |
| 1.4 | 编写 Alembic 迁移脚本：建 `llm_model` 表 + 插入默认 DeepSeek 配置 | `alembic/versions/xxx_add_llm_model.py` |
| 1.5 | 执行迁移，验证表创建和默认数据 | - |

### 阶段 2：适配器迁移

| 步骤 | 操作 | 文件 |
|------|------|------|
| 2.1 | 创建 `llm/adapters/` 目录及 `__init__.py` | `llm/adapters/__init__.py` |
| 2.2 | 将 `agent/llm.py` 中的 `DeepSeekChat` 类移动到 `llm/adapters/deepseek.py` | `llm/adapters/deepseek.py`（新建） |
| 2.3 | 创建 `llm/adapters/dashscope.py`（继承 ChatOpenAI，基础实现） | `llm/adapters/dashscope.py`（新建） |
| 2.4 | 创建 `llm/adapters/openai_compatible.py`（直接使用 ChatOpenAI） | `llm/adapters/openai_compatible.py`（新建） |
| 2.5 | 删除 `agent/llm.py`，更新所有对 `agent.llm.DeepSeekChat` 的引用 | `agent/llm.py`（删除）；`qa_agent.py`、`rag_agent.py`、`router_graph.py`（更新导入） |

### 阶段 3：工厂函数 + 模型查询服务

| 步骤 | 操作 | 文件 |
|------|------|------|
| 3.1 | 创建 `llm/factory.py`，实现 `get_llm_instance(model_id, db)` | `llm/factory.py`（新建） |
| 3.2 | 在 `llm/service.py` 新增模型查询方法：`get_available_models(db)`、`get_default_model(db)` | `llm/service.py`（修改） |
| 3.3 | 更新 `llm/__init__.py` 导出新接口 | `llm/__init__.py`（修改） |

### 阶段 4：API 接口

| 步骤 | 操作 | 文件 |
|------|------|------|
| 4.1 | 在 `llm/schemas.py` 新增 `LLMModelResponse`、`LLMModelListResponse` | `llm/schemas.py`（修改） |
| 4.2 | 在 `llm/router.py` 新增 `GET /api/llm/models` 接口，配备完整 Scalar 文档 | `llm/router.py`（修改） |

### 阶段 5：Agent 模块集成

| 步骤 | 操作 | 文件 |
|------|------|------|
| 5.1 | `agent/schemas.py`：`AgentRequest` 新增 `model_id: UUID | None = None` | `agent/schemas.py`（修改） |
| 5.2 | `agent/router.py`：透传 `model_id` 给 `service.chat_stream()` | `agent/router.py`（修改） |
| 5.3 | `agent/service.py`：改造 `chat_stream()`：新增 `model_id` 参数；调用 `get_llm_instance()` 获取 LLM；将 LLM 传递给子 Agent；用量记录改用 LLM 实例的 `model` 属性替代硬编码 | `agent/service.py`（修改） |
| 5.4 | `agent/subagents/qa_agent.py`：移除 `__init__` 中自行创建 LLM 的 fallback 逻辑，强制要求外部传入 | `qa_agent.py`（修改） |
| 5.5 | `agent/subagents/rag_agent.py`：同上移除自建 LLM；在 `_rewrite_question` 和 `_answer` 中补齐用量记录 | `rag_agent.py`（修改） |
| 5.6 | `agent/router_graph.py`：`route_by_llm()` 改为接收外部传入的 LLM，移除自建 fallback | `router_graph.py`（修改） |

### 阶段 6：验证

| 步骤 | 操作 |
|------|------|
| 6.1 | 执行 Alembic 迁移，确认 `llm_model` 表和默认数据正确 |
| 6.2 | 运行 `pytest`，确保所有现有测试通过 |
| 6.3 | 手动测试 `GET /api/llm/models` 接口 |
| 6.4 | 手动测试 Chat 流程：不传 `model_id`（使用默认模型）和指定 `model_id` 两种场景 |
| 6.5 | 验证 `llm_usage` 表中用量记录的 `model_name` 正确反映实际模型 |

---

## 12. 改造影响的完整文件清单

| 文件 | 操作 | 阶段 |
|------|------|------|
| `server/src/llm_usage/` → `server/src/llm/` | 重命名 | 1 |
| `server/src/llm/models.py` | 新增 `LLMModel` | 1 |
| `server/src/llm/__init__.py` | 更新导出 | 1, 3 |
| `server/src/llm/service.py` | 新增模型查询方法 | 3 |
| `server/src/llm/schemas.py` | 新增模型 Schema | 4 |
| `server/src/llm/router.py` | 新增模型列表接口 | 4 |
| `server/src/llm/factory.py` | **新建**，工厂函数 | 3 |
| `server/src/llm/adapters/__init__.py` | **新建** | 2 |
| `server/src/llm/adapters/deepseek.py` | **新建**，从 `agent/llm.py` 移入 | 2 |
| `server/src/llm/adapters/dashscope.py` | **新建** | 2 |
| `server/src/llm/adapters/openai_compatible.py` | **新建** | 2 |
| `server/src/agent/llm.py` | **删除** | 2 |
| `server/src/agent/schemas.py` | 新增 `model_id` 字段 | 5 |
| `server/src/agent/router.py` | 透传 `model_id` | 5 |
| `server/src/agent/service.py` | 改造 `chat_stream()`，移除硬编码 | 5 |
| `server/src/agent/subagents/qa_agent.py` | 移除自建 LLM，强制外部传入 | 5 |
| `server/src/agent/subagents/rag_agent.py` | 移除自建 LLM，补齐用量记录 | 5 |
| `server/src/agent/router_graph.py` | 移除自建 LLM fallback | 5 |
| `server/src/main.py` | 更新导入路径 | 1 |
| `server/alembic/versions/xxx_add_llm_model.py` | **新建**，迁移脚本 | 1 |

---

## 13. 后续演进

1. **密钥加密**：使用 Fernet 对称加密存储 `api_key`
2. **费用管理**：为每个模型配置 Token 单价，在用量表中增加费用字段
3. **配额限制**：支持用户级别的每日 Token 配额
4. **管理界面**：如需要，可后续添加管理员 API 接口
