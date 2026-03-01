"""
Agent 事件收集测试脚本

直接通过 HTTP API 测试并收集各种 Agent 事件输出
"""
import asyncio
import sys
import os
import json
import aiohttp

API_BASE = "http://localhost:8000"

# 使用固定 token
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXAiOiJhY2Nlc3MiLCJzdWIiOiI4MjYxZTFlNS1lYzE5LTQ0ZjUtODM2OS0zYTIwNDhjODcyNzQiLCJleHAiOjE3NzE1MDUxMzIsImlhdCI6MTc3MTUwNDIzMiwianRpIjoiZDY3MmRmYWMtZjIzOS00NThhLWE1MTYtOWQ3YWFhMjlkYjY1In0.STNuanzKwyS8zLz7qSY5JtP5EIiFRYxzLtMH26qTiLM"


async def test_qa_events():
    """测试 QA Agent 事件"""
    print("\n" + "="*80)
    print("【QA Agent 事件】用户: 你好")
    print("="*80 + "\n")

    headers = {"Authorization": f"Bearer {TOKEN}"}
    payload = {"query": "你好", "session_id": "test-qa-session"}

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_BASE}/agent/chat/stream",
            headers=headers,
            json=payload
        ) as resp:
            print(f"响应状态: {resp.status}\n")

            event_types = {}
            line_count = 0
            text_chunks = []
            tool_calls = []
            route_target = None

            async for line in resp.content:
                line = line.decode('utf-8').strip()
                if not line:
                    continue

                line_count += 1

                # 解析事件类型
                if line.startswith('0:'):
                    event_type = 'text'
                    try:
                        content = json.loads(line[2:])
                        if len(text_chunks) < 5:  # 只显示前5个
                            print(f"[文本流] {content[:80]}")
                        text_chunks.append(content[:50])
                    except: pass
                elif line.startswith('2:'):
                    event_type = 'reasoning'
                    try:
                        content = json.loads(line[2:])
                        print(f"[推理] {content[:80]}")
                    except: pass
                elif line.startswith('9:'):
                    event_type = 'tool_call'
                    try:
                        data = json.loads(line[2:])
                        tool_calls.append(data)
                        print(f"[工具调用] {data.get('toolName')}: {data.get('args')}")
                    except: pass
                elif line.startswith('a:'):
                    event_type = 'tool_result'
                    try:
                        data = json.loads(line[2:])
                        print(f"[工具结果] {data.get('result')[:100]}")
                    except: pass
                elif line.startswith('e:'):
                    event_type = 'debug'
                    try:
                        data = json.loads(line[2:])
                        evt = data.get('event', 'unknown')
                        name = data.get('name', '')
                        event_types[evt] = event_types.get(evt, 0) + 1

                        # 捕获路由决策
                        if evt == 'on_chain_end' and name == 'route_node':
                            route_target = data.get('data', {}).get('output', {}).get('route')
                            print(f"[路由] 决定使用: {route_target}")

                        # 只打印关键调试事件
                        if evt in ['on_chain_start', 'on_chain_end'] and name in ['route_node', 'agent', 'rewrite', 'search']:
                            print(f"[调试] {evt} | {name}")
                    except: pass

                # 限制输出
                if line_count > 100:
                    break

            print(f"\n\n【统计】")
            print(f"  总事件行数: {line_count}")
            print(f"  路由目标: {route_target}")
            print(f"  文本块数: {len(text_chunks)}")
            print(f"  工具调用数: {len(tool_calls)}")
            print(f"【事件类型统计】")
            for evt, count in sorted(event_types.items()):
                print(f"  {evt}: {count}")

            return {
                "line_count": line_count,
                "route": route_target,
                "text_chunks": len(text_chunks),
                "tool_calls": len(tool_calls),
                "event_types": event_types
            }


async def test_rag_events():
    """测试 RAG Agent 事件"""
    print("\n" + "="*80)
    print("【RAG Agent 事件】用户: 文档搜索功能怎么用？")
    print("="*80 + "\n")

    headers = {"Authorization": f"Bearer {TOKEN}"}
    payload = {"query": "文档搜索功能怎么用？", "session_id": "test-rag-session"}

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_BASE}/agent/chat/stream",
            headers=headers,
            json=payload
        ) as resp:
            print(f"响应状态: {resp.status}\n")

            event_types = {}
            line_count = 0
            route_target = None
            rag_nodes = []

            async for line in resp.content:
                line = line.decode('utf-8').strip()
                if not line:
                    continue

                line_count += 1

                if line.startswith('e:'):
                    try:
                        data = json.loads(line[2:])
                        evt = data.get('event', 'unknown')
                        name = data.get('name', '')
                        event_types[evt] = event_types.get(evt, 0) + 1

                        # 捕获路由
                        if evt == 'on_chain_end' and name == 'route_node':
                            route_target = data.get('data', {}).get('output', {}).get('route')
                            print(f"[路由] 决定使用: {route_target}")

                        # 打印 RAG 特有事件
                        if name in ['rewrite', 'search', 'answer']:
                            if name not in rag_nodes:
                                rag_nodes.append(name)
                            print(f"[RAG节点] {evt} | {name}")
                    except: pass
                elif line.startswith('0:'):
                    try:
                        content = json.loads(line[2:])
                        if len(rag_nodes) < 3:  # 只显示前几个
                            print(f"[文本] {content[:60]}")
                    except: pass

                if line_count > 80:
                    break

            print(f"\n【统计】")
            print(f"  总事件行数: {line_count}")
            print(f"  路由目标: {route_target}")
            print(f"  RAG节点: {rag_nodes}")

            return {"line_count": line_count, "route": route_target, "nodes": rag_nodes}


async def test_sql_events():
    """测试 SQL Agent 事件"""
    print("\n" + "="*80)
    print("【SQL Agent 事件】用户: 查询用户表有多少条记录")
    print("="*80 + "\n")

    headers = {"Authorization": f"Bearer {TOKEN}"}
    payload = {"query": "查询用户表有多少条记录", "session_id": "test-sql-session"}

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_BASE}/agent/chat/stream",
            headers=headers,
            json=payload
        ) as resp:
            print(f"响应状态: {resp.status}\n")

            line_count = 0
            route_target = None

            async for line in resp.content:
                line = line.decode('utf-8').strip()
                if not line:
                    continue

                line_count += 1

                if line.startswith('e:'):
                    try:
                        data = json.loads(line[2:])
                        evt = data.get('event', 'unknown')
                        name = data.get('name', '')

                        if evt == 'on_chain_end' and name == 'route_node':
                            route_target = data.get('data', {}).get('output', {}).get('route')
                            print(f"[路由] 决定使用: {route_target}")

                        if name in ['SQLAgent', 'answer']:
                            print(f"[SQL Agent] {evt}")
                    except: pass
                elif line.startswith('0:'):
                    try:
                        content = json.loads(line[2:])
                        print(f"[文本] {content[:80]}")
                    except: pass

                if line_count > 30:
                    break

            print(f"\n【统计】")
            print(f"  路由结果: {route_target}")

            return {"route": route_target}


async def test_tool_events():
    """测试工具调用事件"""
    print("\n" + "="*80)
    print("【工具调用事件】用户: 北京今天天气怎么样？")
    print("="*80 + "\n")

    headers = {"Authorization": f"Bearer {TOKEN}"}
    payload = {"query": "北京今天天气怎么样？", "session_id": "test-tool-session"}

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_BASE}/agent/chat/stream",
            headers=headers,
            json=payload
        ) as resp:
            print(f"响应状态: {resp.status}\n")

            tool_events = []
            line_count = 0

            async for line in resp.content:
                line = line.decode('utf-8').strip()
                if not line:
                    continue

                line_count += 1

                if line.startswith('9:'):
                    try:
                        data = json.loads(line[2:])
                        tool_events.append(('start', data))
                        print(f"[工具调用开始] {data.get('toolName')}")
                        print(f"  参数: {data.get('args')}")
                    except: pass
                elif line.startswith('a:'):
                    try:
                        data = json.loads(line[2:])
                        tool_events.append(('end', data))
                        print(f"[工具调用结束] {data.get('result')[:100]}")
                    except: pass
                elif line.startswith('0:'):
                    try:
                        content = json.loads(line[2:])
                        if line_count < 20:
                            print(f"[文本] {content[:60]}")
                    except: pass

                if line_count > 80:
                    break

            print(f"\n【统计】")
            print(f"  工具调用次数: {len([e for e in tool_events if e[0] == 'start'])}")

            return {"tool_calls": len(tool_events) // 2}


async def main():
    """主测试函数"""
    print("="*80)
    print("Agent 事件收集测试")
    print("="*80)

    try:
        # 运行测试
        await test_qa_events()
        await test_rag_events()
        await test_sql_events()
        await test_tool_events()

        print("\n" + "="*80)
        print("事件收集完成！")
        print("="*80)

    except Exception as e:
        print(f"测试出错: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
