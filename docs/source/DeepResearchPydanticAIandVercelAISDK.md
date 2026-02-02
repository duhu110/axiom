
Design and Implementation Specification for a Production-Grade Multi-Agent System: 
Integrating PydanticAI and Vercel AI SDK

来源指南

    这份技术规范详述了如何通过结合 PydanticAI 和 Vercel AI SDK 来构建生产级的多智能体系统。其核心架构将 Python 后端的严谨逻辑与类型安全验证，同 TypeScript 前端的实时交互与流式生成界面有机统一，解决了数据传输不一致的痛点。文中深入探讨了实现多租户隔离、持久化内存管理以及复杂智能体协作的关键技术路径，确保系统在处理长程推理任务时依然具备高可靠性。最终，该文档为开发者提供了一套从后端编排到前端动态渲染的标准指南，旨在打造安全、可扩展且具备深度观测能力的自主人工智能应用。

The integration of advanced Python-based agent frameworks with high-performance TypeScript-based user interfaces marks a significant milestone in the development of sovereign AI systems. This report provides a comprehensive technical specification and product design for a system architecture that leverages PydanticAI for complex multi-agent orchestration and the Vercel AI SDK for real-time, event-driven frontend interactions. The architecture is designed to address the inherent complexities of production environments, specifically focusing on type-safe data streaming, persistent memory management, and rigorous multi-tenant isolation.[1, 2]

Architectural Vision and Strategic Objectives
The transition from monolithic Large Language Model (LLM) wrappers to distributed multi-agent systems necessitates a fundamental reimagining of the client-server boundary. In the proposed architecture, the backend is not merely a provider of text but a sophisticated orchestrator of reasoning chains and tool executions. By utilizing PydanticAI, developers can enforce strict data validation and type safety through Pydantic models, ensuring that the unstructured outputs of models like GPT-4o or Claude 3.5 are transformed into reliable, structured data before reaching the application logic.[1, 3]

The frontend, powered by Next.js and the Vercel AI SDK, serves as a high-fidelity window into the agent's internal state. It utilizes the Vercel AI Data Stream Protocol to render the evolution of a response in real-time, including thinking steps, tool invocations, and final outputs.[4, 5] This synergy between a robust Python backend and a reactive TypeScript frontend allows for the creation of "Generative UI," where the interface itself is treated as a streamable data structure controlled by the agent.[5]
Core Functional Requirements for Production Systems
To reach a production-ready status, the system must fulfill a set of intersecting requirements across the stack. These include the ability to handle long-running reasoning tasks, isolate user data at both the logical and physical layers, and maintain a persistent conversational context that can survive server restarts or session timeouts.
Feature Category
Production Requirement
Implementation Strategy
Streaming Protocol
Standardized Server-Sent Events (SSE) for heterogeneous environments.
Vercel AI Data Stream Protocol v1 via VercelAIAdapter.[6, 7]
Agent Orchestration
Type-safe delegation and programmatic hand-offs.
PydanticAI Agent Delegation and pydantic_graph.[8, 9]
Persistence
Durable storage of all messages, tool calls, and states.
PostgreSQL JSONB storage with Pydantic TypeAdapter.[10, 11]
User Isolation
Cryptographically verified multi-tenancy.
JWT-based middleware with Row-Level Security (RLS).[12, 13]
Memory System
Semantic recall and "superseding" of outdated facts.
Dynamic system prompts and memory-specialized agents.[10, 14]
UI Rendering
Specialized components for reasoning and tool states.
Vercel AI Elements (Reasoning, Tool, Message).[15, 16, 17]
Backend Engineering: PydanticAI and FastAPI Integration
The backend is constructed as a FastAPI application that serves as the proxy for PydanticAI agents. PydanticAI is uniquely suited for this role because it treats agents as reusable components—similar to FastAPI apps—which can be instantiated globally or dynamically based on request parameters.[18]
Agent Lifecycle and Dependency Injection
A PydanticAI agent is defined by its system prompt, its toolset, its dependencies, and its expected output type. The dependency injection system is a critical feature for production, as it allows for the passing of database connections, API clients, and user context into tool functions in a type-safe manner.[1, 18] For instance, a bank support agent might have a dependency type of SupportDependencies, which includes a connection to a PostgreSQL database for fetching customer records.
When a tool is decorated with @agent.tool, it has access to the RunContext, which carries these dependencies. This ensures that the agent's actions are always grounded in the current request's context, facilitating user isolation. If an agent attempts to access data outside its injected dependencies, static type checkers and runtime Pydantic validation will intervene.[1, 18]
Interface Organization and Endpoint Design
The backend interface is organized primarily around a POST endpoint, typically /api/chat. This endpoint is responsible for:
1. Authentication: Verifying the user's identity and extracting tenant information.
2. State Retrieval: Loading the conversation history and user memories from the database.[11, 19]
3. Agent Initialization: Configuring the PydanticAI agent with the appropriate model, system prompt, and tools.
4. Streaming Orchestration: Utilizing the VercelAIAdapter to run the agent and stream the response to the client.[6, 20]
The VercelAIAdapter is a specialized interface within PydanticAI that simplifies the mapping between internal agent events and the Vercel AI Data Stream Protocol. It provides a dispatch_request method for Starlette-based frameworks like FastAPI, which automatically handles request parsing, agent execution, and SSE encoding.[6, 20]
Schema Mapping and the Data Stream Protocol
One of the most significant challenges in building cross-language AI systems is the mapping between the backend's internal representations of agent actions and the frontend's requirements for rendering. The Vercel AI Data Stream Protocol (v1) solves this by defining a set of standardized SSE chunk types that the frontend SDK can parse into a UIMessage structure.[4, 7]
Translation of PydanticAI Parts to Vercel Chunks
The VercelAIAdapter performs a real-time transformation of PydanticAI's AgentStreamEvent objects into Vercel-compatible SSE data parts. This allows the backend to communicate complex states—such as a model "thinking" before it speaks—without the frontend needing to understand the underlying LLM provider's specific API.[6, 7]
PydanticAI Internal Part
Vercel SSE Type
Description
TextPart (Delta)
text-delta
Incremental chunks of assistant response.[4]
ThinkingPart (Delta)
reasoning-delta
Internal "Chain of Thought" or reasoning tokens.[4, 7]
ToolCallPart
tool-input-start
Indicates the model is starting a tool invocation.[4, 7]
ToolCallPart (Args)
tool-input-delta
Streaming of the JSON arguments for the tool.[4, 7]
ToolReturnPart
tool-output-available
The result of a successful tool execution.[4, 7]
ErrorPart
error
Signals a tool execution or model failure.[21, 22]
DataPart
data-*
Custom structured data sent alongside the response.[23]
This mapping is crucial for the "Schema Mapping" confusion often encountered by developers. The backend does not return a simple JSON object; it returns a stream of these parts. The frontend's useChat hook intercepts these parts and reconstructs the messages array, where each message contains a parts property representing the sequence of text, reasoning, and tool calls.[4, 24, 25]
The Lifecycle of a Tool Invocation
When a model decides to use a tool, the VercelAIAdapter ensures the frontend remains synchronized through the following sequence:
1. Initiation: The backend sends a tool-input-start chunk with a toolCallId.
2. Streaming Arguments: As the model generates arguments, tool-input-delta chunks are emitted. The frontend can display these as "AI is preparing to...".[4, 26]
3. Execution: Once the arguments are complete, PydanticAI executes the tool on the server (or requests client execution).
4. Result Delivery: The output is streamed back via tool-output-available.
5. Refinement: The model receives the tool result and generates a final text response, which arrives as text-delta chunks.[27, 28]
Multi-Agent Orchestration and Delegation Patterns
Production-level AI applications rarely rely on a single agent. Instead, they utilize a multi-agent system where a "Parent" or "Manager" agent delegates sub-tasks to "Worker" or "Specialized" agents.[8, 9]
Agent-to-Agent (A2A) Delegation
In PydanticAI, delegation is achieved by defining a tool that internally runs a second agent. This is a powerful pattern because it maintains a clean separation of concerns. For example, a ResearchAgent might have a tool called run_search_agent, which instantiates a WebSearchAgent with specialized tools for querying search engines.[9]
To ensure accurate resource tracking, the parent agent's RunContext.usage is passed to the delegate agent. This allows the system to enforce global token limits across the entire reasoning chain, preventing runaway costs if agents enter a loop.[9]
Graph-Based Control with pydantic_graph
For more complex workflows that involve state machines or non-linear logic, pydantic_graph is the preferred tool. A graph-based system treats the multi-agent workflow as a series of "Nodes," where each node represents a specific state or agent turn.[9]
Graph Component
Description
Relevance to Production
State
A shared dataclass or Pydantic model passed between nodes.
Ensures context is shared across multiple agent turns.[9]
Nodes
Classes inheriting from BaseNode implementing run() logic.
Provides modular, testable steps in a complex workflow.[9]
Transitions
Type-hinted return values of nodes defining the next step.
Enforces valid execution paths at compile time.[9]
Persistence
Snapshots of the state recorded after every node.
Enables "Durable Execution" where a flow can resume after a crash.[9, 29]
The use of pydantic_graph allows for "Human-in-the-Loop" patterns, where a node might transition to a "Waiting for Approval" state, pausing execution until a human provides feedback through the frontend.[9]
User Isolation and Multi-Tenant Security
In a production environment, multi-tenancy is not an optional feature but a foundational requirement. The system must ensure that User A cannot access the chat history, memories, or tool outputs of User B, even if they share the same backend infrastructure.[12, 30]
Multi-Level Isolation Strategy
Isolation is implemented at three distinct layers:
1. Logical Layer (Middleware): Every request must include an authentication token. FastAPI middleware extracts the tenant_id and user_id, attaching them to the request.state. This information is then used to scope all downstream actions.[12, 30]
2. Database Layer (Persistence): The database schema uses a "Shared Database, Shared Schema" approach with tenant identifiers. To prevent accidental leakage, Row-Level Security (RLS) is used in PostgreSQL. Policies are defined such that any query executed on a session will only return rows matching the active tenant_id.[13, 31]
3. Agent Context Layer (Memory): When an agent is initialized, it is injected with dependencies that are already scoped to the user. Its "Memory" retrieval tool is restricted by the user's ID, ensuring the agent only "remembers" facts relevant to the current participant.[12, 14]
Infrastructure Isolation
For higher security tiers, the architecture can support "Containerized Isolation," where each tenant runs in its own isolated runtime environment (e.g., via Docker or serverless functions). This provides the strongest protection against cross-tenant interference and is often required for enterprise-grade compliance like SOC2 or HIPAA.[12]
Persistence, Memory, and Session Management
A multi-agent system is only as effective as its ability to recall past interactions. Persistence in this system covers both the "Short-term History" (messages in the current conversation) and "Long-term Memory" (facts learned about the user across sessions).[14, 32]
PostgreSQL for Chat History
Chat history is stored in a Messages table using a JSONB column to accommodate the complex structure of ModelMessage objects. This structure includes user prompts, assistant text, reasoning chains, and tool call/result pairs.[11]
The backend utilizes ModelMessagesTypeAdapter to handle the serialization of these objects. When a session is resumed, the history is loaded and passed to the agent's message_history parameter. PydanticAI automatically uses this history to reconstruct the conversation context, skipping the generation of a new system prompt if the history already contains one.[10]
Context Trimming and History Processors
As conversations grow, they may exceed the model's context window. "History Processors" are used to summarize or prune the history before it is sent to the LLM. A production-grade processor must be "Tool-Aware," meaning it must ensure that a ToolCallPart is never removed without its corresponding ToolReturnPart, as an "orphaned" tool call will often cause model errors.[10]
Trimming Strategy
Mechanism
Benefit
Window-based
Keep the last N messages.
Low latency, predictable cost.[10]
Summarization
Use a smaller model (e.g., GPT-4o-mini) to condense old history.
Preserves long-term context while saving tokens.[10]
Reactive Compression
Remove intermediate tool call/return pairs from the middle of history.
Maintains the start (system prompt) and the end (active task).[10]
Long-term User Memory
Unlike chat history, which is a linear record of messages, user memory is a collection of extracted facts. A specialized "Memory Agent" runs post-conversation to analyze the history and update the user's profile.[14] This agent identifies new preferences (e.g., "User prefers Python over Java") and stores them as distinct memory entities.
These memories are then injected into future conversations through a dynamic system prompt. By using an experience_str method on the user dependency object, the agent can be given a concise list of "things it knows about this user" at the start of every run.[14]
Frontend Implementation with Next.js and Vercel AI SDK
The frontend design focuses on providing a seamless "Generative UI" experience. Instead of using the full Vercel AI SDK for all components, the architecture utilizes Vercel AI Elements, which are prebuilt, headless-first UI primitives designed specifically for the Data Stream Protocol.[16, 17]
Customizing the useChat Hook
The useChat hook is the primary engine of the frontend. It is configured to communicate with the FastAPI backend and handle the specific stream format.
// Example frontend configuration
const { messages, input, handleInputChange, handleSubmit } = useChat({
  api: '/api/chat',
  streamProtocol: 'data', // Required for Data Stream Protocol v1 [4, 33]
  onData: (dataPart) => {
    // Handle custom data parts, e.g., notifications or UI updates [23]
  },
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls, // Automatic multi-turn [25, 27]
});
Rendering with AI Elements
Vercel AI Elements provide a structured way to render the parts of a message. This is the solution to the user's doubt about "Backend SCHEMA vs Frontend SDK parsing." By using these elements, the mapping is handled automatically.[24, 34]
1. <Conversation />: Wraps the chat interface and provides smart auto-scrolling that respects the user's manual scroll position.[16, 34]
2. <Message />: Maps the role property (user, assistant) to specific styles. Within the message, the parts array is iterated over.[24]
3. <Reasoning />: Specifically looks for reasoning parts in the message. It renders a "Thought" panel that can be expanded to see the chain of thought.[15]
4. <ToolInvocation />: Handles the rendering of tool states. This allows for the creation of custom "Tool Cards" that change their appearance as the tool moves from call to result.[27, 28]
Generative UI and Custom Data Parts
Beyond standard chat, the system supports "Generative UI" through custom Data Parts. The backend can emit a data-widget part containing the parameters for a specific React component (e.g., a stock chart). The frontend, upon receiving this part, can render a <StockChart /> component directly within the conversation flow.[5, 23]
Observability, Debugging, and Production Monitoring
Monitoring a distributed multi-agent system requires more than just logging error rates; it requires "Tracing" the path of a request through the various agents and tools.
Tracing with Pydantic Logfire
Pydantic Logfire is the recommended observability platform for this architecture. It integrates deeply with PydanticAI and FastAPI, providing OpenTelemetry-compatible traces that capture the entire lifecycle of an agent run.[35, 36]
When a user sends a message, Logfire captures:
• The raw LLM input and output.
• Validation successes and failures.
• The latency and cost of each tool call.
• The delegation path (e.g., Parent Agent -> Research Tool -> Search Agent).[9, 35]
Performance Optimization
To ensure a high-quality user experience, the system implements several performance optimizations:
1. Stream Throttling: The experimental_throttle parameter in useChat can be used to prevent UI lag by limiting the frequency of React re-renders during high-speed streaming.[25]
2. Connection Pooling: The FastAPI backend uses connection pooling for PostgreSQL (e.g., via psycopg or SQLAlchemy) to minimize the overhead of establishing database connections for every SSE chunk.[11, 37]
3. Model Switching: Using the prepareStep function in the AI SDK or delegating to smaller models for simpler sub-tasks can significantly reduce latency and costs.[38, 39]
Deployment and Infrastructure Considerations
A production-grade system must be deployable to cloud environments with high availability.
Backend Deployment (FastAPI)
The FastAPI backend is typically deployed using a containerized approach (Docker) on platforms like AWS ECS, Google Cloud Run, or Vercel Functions. Because the backend uses SSE, it is critical that the infrastructure supports long-lived HTTP connections and does not have aggressive timeout policies that would terminate a reasoning stream prematurely.[5, 40]
Frontend Deployment (Next.js)
The frontend is ideally deployed on Vercel, which provides native support for the AI SDK and edge functions. This allows for low-latency delivery of the UI and optimized handling of the data stream protocol.[40, 41]
Security and Governance
For enterprise environments, the system can integrate with MintMCP, which provides a governance layer over agentic tools. MintMCP offers audit logging, role-based access control (RBAC), and centralized credential management for MCP (Model Context Protocol) servers that agents might interact with.[38, 42]
Conclusion: Strategic Recommendations for Implementation
The proposed architecture provides a robust, scalable foundation for building sovereign AI applications. By choosing PydanticAI and the Vercel AI SDK, developers gain access to the best-in-class tools for both backend reasoning and frontend interaction.
Key Implementation Milestones
To successfully build this system, the development team should follow these prioritized steps:
1. Establish the Data Stream: Implement the VercelAIAdapter in FastAPI and configure the useChat hook with streamProtocol: 'data'. This establishes the core communication channel.[4, 6]
2. Define the Data Model: Create the PostgreSQL schema with JSONB support for messages and implement RLS for multi-tenant isolation.[11, 13]
3. Build the Multi-Agent Logic: Start with simple delegation for specialized tasks and evolve to pydantic_graph for more complex, state-driven workflows.[9]
4. Integrate AI Elements: Move from raw JSON rendering to Vercel AI Elements, specifically for reasoning and tool states, to provide a professional user experience.[16, 17]
5. Enable Observability: Configure Logfire early in the development cycle to monitor agent behavior and optimize token usage.[35]
By strictly adhering to these architectural patterns, organizations can build AI systems that are not only powerful and intelligent but also reliable, secure, and ready for production at scale. The synergy between Pydantic's validation and Vercel's streaming excellence ensures a future-proof foundation in the rapidly evolving landscape of generative AI.[1, 5]
--------------------------------------------------------------------------------
1. Pydantic AI - Pydantic AI, https://ai.pydantic.dev/
2. AI SDK by Vercel, https://ai-sdk.dev/docs/introduction
3. A Practioner's Guide to PydanticAI Agents | ADaSci Blog, https://adasci.org/blog/a-practioners-guide-to-pydanticai-agents
4. Stream Protocols - AI SDK UI, https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
5. Stop Parsing JSON: The Vercel AI SDK's "AI Protocol" is Revolutionizing Generative UI, https://dev.to/programmingcentral/stop-parsing-json-the-vercel-ai-sdks-ai-protocol-is-revolutionizing-generative-ui-40k1
6. Announcement: Pydantic AI support for Vercel AI Elements, https://pydantic.dev/articles/pydantic-ai-ui-vercel-ai
7. pydantic_ai.ui.vercel_ai - Pydantic AI, https://ai.pydantic.dev/api/ui/vercel_ai/
8. Building a Multi-Agent System in Pydantic AI - DEV Community, https://dev.to/hamluk/advanced-pydantic-ai-agents-building-a-multi-agent-system-in-pydantic-ai-1hok
9. Multi-Agent Patterns - Pydantic AI, https://ai.pydantic.dev/multi-agent-applications/
10. Messages and chat history - Pydantic AI, https://ai.pydantic.dev/message-history/
11. PostgresChatMessageHistory — LangChain documentation, https://reference.langchain.com/v0.3/python/postgres/chat_message_histories/langchain_postgres.chat_message_histories.PostgresChatMessageHistory.html
12. How does AI Agent isolate data in a multi-tenant environment? - Tencent Cloud, https://www.tencentcloud.com/techpedia/126617
13. Multitenancy with FastAPI - A practical guide — Documentation - App Generator, https://app-generator.dev/docs/technologies/fastapi/multitenancy.html
14. Adding a Memory layer to PydanticAI Agents | by Dream AI - Medium, https://medium.com/@dreamai/adding-a-memory-layer-to-pydanticai-agents-5e7b257590f4
15. Reasoning - AI SDK, https://ai-sdk.dev/elements/components/reasoning
16. How I built an AI productivity assistant with Vercel AI Elements - LogRocket Blog, https://blog.logrocket.com/vercel-ai-elements/
17. Build chat UIs with Vercel AI Elements - Inkeep Open Source Docs, https://docs.inkeep.com/talk-to-your-agents/vercel-ai-sdk/ai-elements
18. Agents - Pydantic AI, https://ai.pydantic.dev/agents/
19. Building an AI Chat with Memory (Context) using Spring AI and Angular - Loiane Groner, https://loiane.com/2025/10/building-ai-chat-with-memory-using-spring-ai-and-angular/
20. Vercel AI - Pydantic AI, https://ai.pydantic.dev/ui/vercel-ai/
21. AI SDK Core: Generating Structured Data, https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
22. lointain/langchain_aisdk_adapter: langchain ai-sdk adapter - GitHub, https://github.com/lointain/langchain_aisdk_adapter
23. Streaming Custom Data - AI SDK UI, https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data
24. Introducing AI Elements: Prebuilt, composable AI SDK components - Vercel, https://vercel.com/changelog/introducing-ai-elements
25. useChat - AI SDK UI, https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
26. Using AI SDK UI | Frameworks | Mastra Docs, https://mastra.ai/guides/build-your-ui/ai-sdk-ui
27. Chatbot Tool Usage - AI SDK UI, https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
28. Tool Use | Vercel Academy, https://vercel.com/academy/ai-sdk/tool-use
29. pydantic_graph.persistence - Pydantic AI, https://ai.pydantic.dev/api/pydantic_graph/persistence/
30. Building Multi-Tenant APIs with FastAPI and Subdomain Routing: A Complete Guide, https://medium.com/@diwasb54/building-multi-tenant-apis-with-fastapi-and-subdomain-routing-a-complete-guide-cc076cb02513
31. How to Build an AI Agent That Saves Data to a Database, https://brightdata.com/blog/ai/ai-agent-with-a-database
32. Extending Pydantic AI Agents with Chat History - DEV Community, https://dev.to/hamluk/extending-pydantic-ai-agents-with-chat-history-messages-and-chat-history-in-pydantic-ai-d4f
33. Handling JSON Data in Data Stream responses with FastAPI and Vercel AI SDK #2840, https://github.com/vercel/ai/discussions/2840
34. AI Elements | Vercel Academy, https://vercel.com/academy/ai-sdk/ai-elements
35. Logfire Integration - Pydantic AI, https://ai.pydantic.dev/evals/how-to/logfire-integration/
36. A Fun PydanticAI Example For Automating Your Life, https://christophergs.com/blog/pydantic-ai-example-github-actions
37. Postgres Chat Memory - NavinInspire.ai - Enterprise AI Solutions, https://navinspire.ai/RAG/documentation/components/memories/postgres-chat
38. Vercel AI SDK with MCP: Connect Multiple AI Models to Your Enterprise Application, https://www.mintmcp.com/blog/connect-multiple-ai-models
39. AI SDK Core: Tool Calling, https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
40. FastAPI on Vercel, https://vercel.com/docs/frameworks/backend/fastapi
41. Create an AI Agent with Vercel AI SDK | by Emily Xiong | Dec, 2025 - Medium, https://emilyxiong.medium.com/create-an-ai-agent-with-vercel-ai-sdk-e690b807eb2a
42. FastAPI with MCP: Build Enterprise AI Agents for API-Driven Apps | MintMCP Blog, https://www.mintmcp.com/blog/build-enterprise-ai-agents