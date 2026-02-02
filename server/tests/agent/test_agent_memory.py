import asyncio
import uuid
from langchain_core.messages import HumanMessage
from src.agent.service import AgentService
from src.agent.dependencies import init_agent_dependencies, close_agent_dependencies
from config import settings

# 确保在脚本运行时能正确加载配置（可能需要设置环境变量，这里假设 .env 或默认值可用）

async def run_memory_test():
    print("=== Starting LangGraph Memory Persistence Test ===")
    
    # 1. 初始化依赖 (Postgres Checkpointer & Store)
    print("Initializing dependencies...")
    await init_agent_dependencies()
    
    try:
        # 2. 初始化 Agent Service
        service = AgentService()
        
        # 定义测试用户 ID (跨 Session 共享)
        test_user_id = f"test-user-{uuid.uuid4().hex[:8]}"
        print(f"Test User ID: {test_user_id}")
        
        # === Session 1: 存入记忆 ===
        session_id_1 = str(uuid.uuid4())
        print(f"\n--- Session 1 (ID: {session_id_1}) ---")
        
        query_1 = "My name is AxiomTester and I love coding in Python."
        print(f"User: {query_1}")
        
        # 模拟调用 (这里直接使用 service.app.ainvoke 以便完全控制 config)
        config_1 = {
            "configurable": {"thread_id": session_id_1},
            "metadata": {"user_id": test_user_id}
        }
        
        result_1 = await service.app.ainvoke(
            {"messages": [HumanMessage(content=query_1)]}, 
            config=config_1
        )
        response_1 = result_1["messages"][-1].content
        print(f"Agent: {response_1}")
        
        # 强制保存记忆 (如果 Agent 没有自动调用，我们可以提示它)
        # 通常第一次对话 Agent 可能只会回复 "Hello AxiomTester..." 而不一定立即调用 upsert_memory
        # 为了确保测试通过，我们追加一条指令让它保存
        if "saved" not in response_1.lower() and "memory" not in response_1.lower():
             query_1b = "Please save my name and hobby to your long-term memory."
             print(f"User: {query_1b}")
             result_1b = await service.app.ainvoke(
                {"messages": [HumanMessage(content=query_1b)]},
                config=config_1
             )
             response_1b = result_1b["messages"][-1].content
             print(f"Agent: {response_1b}")

        # === Session 2: 检索记忆 (新 Session，但相同 User) ===
        session_id_2 = str(uuid.uuid4())
        print(f"\n--- Session 2 (ID: {session_id_2}) ---")
        print("Note: This is a NEW session (empty short-term memory). Agent must rely on Long-Term Memory (Store).")
        
        query_2 = "What is my name and what do I like?"
        print(f"User: {query_2}")
        
        config_2 = {
            "configurable": {"thread_id": session_id_2},
            "metadata": {"user_id": test_user_id}
        }
        
        result_2 = await service.app.ainvoke(
            {"messages": [HumanMessage(content=query_2)]},
            config=config_2
        )
        response_2 = result_2["messages"][-1].content
        print(f"Agent: {response_2}")
        
        # === 验证结果 ===
        if "AxiomTester" in response_2 and "Python" in response_2:
            print("\n✅ TEST PASSED: Agent successfully retrieved long-term memory across sessions.")
        else:
            print("\n❌ TEST FAILED: Agent failed to retrieve memory.")
            
    finally:
        # 清理
        print("\nClosing dependencies...")
        await close_agent_dependencies()

if __name__ == "__main__":
    # Fix for Windows asyncio loop
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(run_memory_test())
