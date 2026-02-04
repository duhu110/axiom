# LLM 用量统计设计（草案）

本文档聚焦**用量统计**：解析所有 LLM 调用的返回元数据并保存当前用户的模型用量。现阶段仅需要一个用量表与少量统计接口，不做供应商/模型目录与用户配置管理。

---

## 1. 设计目标

1. 统一记录：所有 LLM 调用结束后解析 `usage` 元数据并落库。
2. 用户维度：按当前登录用户记录每次调用的 Token 用量。
3. 轻量接口：提供用户自身用量查询与汇总接口。

---

## 2. 总体架构

核心思路是将“用量记录”抽象为一个可复用的记录器，不关心具体模型或供应商。

建议新增轻量模块 `server/src/llm_usage/`：

```
server/src/llm_usage/
├── models.py        # llm_usage 表定义
├── schemas.py       # 查询与响应模型
├── router.py        # 用量查询接口
└── service.py       # 解析 usage + 写入数据库
```

LLM 调用侧只需要在调用完成后调用 `llm_usage.service.record_usage(...)`。

---

## 3. 数据库模型设计

### 3.1 用量统计表：`llm_usage`

记录每次模型调用的 Token 使用情况。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| user_id | UUID | 外键 -> users.id |
| model_name | String | 实际模型名称 |
| prompt_tokens | Integer | 输入 Token |
| completion_tokens | Integer | 输出 Token |
| total_tokens | Integer | 总 Token |
| request_id | String | 请求追踪 ID |
| trace_id | String | 链路追踪（可选） |
| meta | JSON | 原始 usage 信息或其他元数据 |
| created_at | datetime | 调用时间 |

索引建议：
1. `(user_id, created_at)`
2. `(model_name, created_at)`

说明：
1. `model_name` 由程序统一写入，来源于调用参数或响应元数据。
2. 不区分供应商，所有模型统一落此表。

---

## 4. API 设计

### 4.1 用量查询

1. `GET /llm/usage`
   - 查询当前用户的用量明细
   - 支持日期范围与 `model_name` 过滤
2. `GET /llm/usage/summary`
   - 查询当前用户的用量汇总
   - 支持按天或按模型分组（由参数控制）

---

## 5. 记录流程

1. LLM 调用完成后从响应元数据解析 `usage`。
2. 组装 `llm_usage` 记录并写库：
   - `user_id` 取当前登录用户
   - `model_name` 从调用参数或响应中获取
   - `prompt_tokens` / `completion_tokens` / `total_tokens` 直接落库
   - `meta` 保存原始 usage 字段或原始响应中的 `usage` 子结构
3. 若响应不包含 `usage`，记录为 `null` 并可在后续补全。

---

## 6. 安全与合规

1. 禁止在日志中输出完整请求体或完整响应体。
2. 用户只能访问自己的 `llm_usage` 记录。

---

## 7. 实施计划

1. 在所有 LLM 调用完成后增加 `record_usage` 调用，并将解析后的 usage 写入 `llm_usage`。
