I have analyzed the requirements and the existing codebase. Here is the implementation plan:

# 1. Configuration (`server/src/config.py`)
- Add `AgentConfig` class to `Settings` to manage `openai_api_key`.
- This follows the rule: "Project configuration directly written to `server\src\config.py`".

# 2. Agent Service (`server/src/agent/service.py`)
- Replace the existing `langchain.agents` implementation with `LangGraph`.
- Implement a simple graph with a single `call_model` node using `ChatOpenAI`.
- **Memory**: Use `MemorySaver` (in-memory checkpointer) as the requested "checkpointer store" for simplicity and speed, with a fixed `thread_id` (based on the user provided `f8133b8e-c488-45ee-82d3-466deb34768e`).
- **Streaming**: Implement `chat_stream` method that yields events from `graph.astream_events`.

# 3. Agent Utilities (`server/src/agent/utils.py`)
- Add `convert_to_vercel_sse` function to transform LangGraph events into Vercel AI SDK compatible SSE format (e.g., `0:"text_delta"`).

# 4. Agent Router (`server/src/agent/router.py`)
- Add `POST /agent/chat/stream` endpoint.
- Use `StreamingResponse` with `media_type="text/event-stream"`.
- Set `X-Vercel-AI-Data-Stream: v1` header.

# 5. Main Application (`server/src/main.py`)
- Register the agent router: `app.include_router(agent_router, prefix="/agent", tags=["agent"])`.

# 6. Web Test (`webtest/index.html`)
- Create a simple HTML page with vanilla JavaScript.
- Use `fetch` to POST to `/agent/chat/stream` with the fixed `userId`.
- Parse the SSE stream manually (since standard `EventSource` doesn't support POST body) and display the chat response in real-time.

# 7. Verification
- Verify the SSE endpoint using the created HTML page.
