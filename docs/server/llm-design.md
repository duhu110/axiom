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

## 10. 后续演进

1. **密钥加密**：使用 Fernet 对称加密存储 `api_key`
2. **费用管理**：为每个模型配置 Token 单价，在用量表中增加费用字段
3. **配额限制**：支持用户级别的每日 Token 配额
4. **管理界面**：如需要，可后续添加管理员 API 接口
