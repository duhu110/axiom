AGENT 运行设计（FastAPI + LangChain/LangGraph + SSE）

本设计文档用于指导在现有 FastAPI 模块化架构中实现可运行、可观测、可扩展的 Agent 服务。设计基于以下两个既有方案文档：
1. docs/server/agent-sse-design.md（SSE 流式协议与数据格式）
2. docs/server/agent-folder-design.md（模块化目录与职责划分）

本轮只做“多轮采访式设计”与文档落地，不进行任何代码编写。

---

一、目标与范围

1. 目标
   - 产出可实施的 Agent 运行设计，覆盖 API、流式协议、组件划分、配置、存储、日志与可观测性。
   - 设计必须与现有服务约束一致：统一响应封装、Scalar 文档、日志体系、数据库与依赖注入规范。
2. 范围
   - 先实现一个基于 OpenAI SDK 的简单 ChatAgent（非 RAG）。
   - 规划后续演进：RAG、工具调用、任务队列、长时任务、会话记忆。
   - 输出 SSE 协议与前端测试策略（不写代码，仅设计）。

---

二、多轮采访式设计（需求澄清模板）

说明：以下问题用于逐轮采访业务方与研发方，收敛需求。每轮采访后，将结论补充到“采访结论”段落。

第 1 轮：业务目标与场景
1. Agent 主要业务场景是什么？（客服、SQL 助手、知识问答、流程编排等）
2. 最关键的成功指标是什么？（响应时间、准确率、可解释性、成本等）
3. 是否需要对接内部系统或数据库？（SQL、文件系统、搜索引擎）

第 2 轮：交互与体验
1. 前端是否需要可视化“思考过程/工具调用”？
2. 是否要求多轮对话记忆？记忆范围与保留时长？
3. 是否需要消息重试、撤回、编辑、对话分支？

第 3 轮：技术与安全
1. 目标模型与供应商？（OpenAI/自建/第三方）
2. 是否有数据脱敏或权限隔离要求？
3. 是否需要审计日志或输出内容的合规过滤？

第 4 轮：运维与稳定性
1. 并发规模与峰值 QPS？
2. 是否需要任务队列或异步 Worker？
3. 目标可用性与降级策略？

采访结论（每轮结束后补充）
- 业务目标：
- 关键指标：
- 交互体验：
- 安全与权限：
- 运维与稳定性：

---

三、总体架构设计

1. 核心原则
   - Agent 作为“业务服务”落在模块层，避免将 HTTP 细节侵入 Agent 逻辑。
   - 统一响应规范与异常处理，与现有 response.py 和 exceptions.py 保持一致。
   - SSE 流式输出使用标准协议，前端可直接消费。
2. 逻辑分层
   - Router：HTTP 与 SSE 出入口，负责鉴权与入参校验。
   - Service：Agent 组装与调用（LLM、Prompt、Tools、Graph）。
   - Tools/Utils：工具函数与格式化逻辑，保持可复用与可测试。
   - Schemas：输入输出与响应结构，提供完整 Scalar 文档说明。

---

四、目录与模块映射

建议遵循现有模块化结构，Agent 模块建议如下：

server/src/agent/
├── router.py          接口层（含 /chat 与 /chat/stream）
├── service.py         业务层（Agent/Graph 组装与执行）
├── schemas.py         输入/输出契约
├── tools.py           工具集合
├── prompts.py         Prompt 模板
├── dependencies.py    依赖注入与单例管理
└── utils.py           辅助工具（流式协议转换）

---

五、协议与数据流设计（SSE）

采用 Vercel AI SDK Data Stream Protocol，优势：
1. 前端易集成，具备成熟生态。
2. 可表达文本流、工具调用、工具结果。

核心流式数据类型建议：
1. 文本增量：0:"text_delta"
2. 工具调用定义：9:{toolCallDef}
3. 工具调用结果：a:{toolResult}

流式工作流：
1. Router 调用 Service 获取异步生成器。
2. Service 使用 LangGraph astream_events(version="v2") 获取细粒度事件流。
3. Utils 将事件流转换为 Vercel 数据流格式。
4. Router 返回 StreamingResponse，增加 X-Vercel-AI-Data-Stream: v1 头。

---

六、API 设计（对标现有规范）

1. POST /agent/chat
   - 功能：非流式对话
   - 输入：AgentRequest（query、history、session_id）
   - 输出：统一响应结构（code/msg/data）
2. POST /agent/chat/stream
   - 功能：流式对话
   - 输出：SSE 流式响应
   - 头部：X-Vercel-AI-Data-Stream: v1

说明：
- 每个接口必须配置完整 Scalar 文档说明。
- 全部 POST 接口统一由 response.py 管理返回结构。

---

七、Agent 运行流程（基础 ChatAgent）

阶段 1：简单 ChatAgent
1. 输入：用户 query + 历史消息。
2. Service 创建 ChatOpenAI 实例。
3. 使用最小 Prompt（系统提示 + 历史 + 用户消息）。
4. 输出：直接返回模型结果（非 RAG、不调用工具）。

阶段 2：工具调用与扩展
1. 增加 tools.py 中的工具集合。
2. 通过 create_tool_calling_agent 让模型可调用工具。
3. SSE 需要输出工具调用与结果。

阶段 3：LangGraph 编排
1. 使用 Graph 维护节点与状态。
2. 通过 astream_events 输出中间事件。
3. 支持中断与恢复、外部 Worker 续写。

---

八、状态与记忆

1. 会话 ID
   - 由客户端或服务端生成，确保可追踪。
2. 记忆存储
   - 使用数据库持久化（Postgres）。
   - 建议使用 LangGraph Checkpointer。
3. 历史控制
   - 限制最大历史长度，避免上下文过长。
   - 对历史进行摘要存储，降低成本。

---

九、日志与可观测性

1. 重要节点记录日志
   - 对话开始、结束、模型调用、工具调用结果。
2. 使用现有 logging_service 统一落盘与标准日志桥接。
3. 关键指标
   - 请求耗时、模型响应时长、工具耗时。

---

十、安全与权限

1. 接口鉴权
   - 复用现有 auth 体系。
2. 数据隔离
   - thread_id 与 user.id 绑定。
3. 输出过滤
   - 必要时对敏感信息脱敏。

---

十一、扩展与演进路线

1. RAG
   - 文档拆分、向量化、召回、重排序。
2. Worker/任务队列
   - 长耗时任务异步化。
3. 多 Agent 协作
   - 调度器或编排层管理子 Agent。

---

十二、前端测试策略（仅设计）

目标：验证 SSE 流式数据是否可正确解析与展示。
1. 单页 HTML 作为测试端。
2. 模拟输入与发送请求。
3. 输出完整 SSE 事件日志。
4. 支持手动测试工具调用状态与结果。

本轮仅做测试方案设计，不编写 HTML。

---

十三、待补充清单

1. 采访结论完善。
2. 明确模型供应商与成本控制策略。
3. 是否需要对接现有数据库表与权限体系。
