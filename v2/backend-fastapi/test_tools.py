#!/usr/bin/env python3
"""
Test script for tool functionality
"""
import asyncio
from tools import tool_registry, LsTool, ReadFileTool

async def test_tools():
    print("Testing Tool System\n")
    
    # Test 1: Registry
    print("1. Tool Registry:")
    print(f"   Registered tools: {tool_registry.list_tools()}")
    print(f"   Tool definitions: {len(tool_registry.get_definitions())} tools")
    
    # Test 2: ls tool
    print("\n2. Testing ls tool:")
    result = await tool_registry.execute("ls", path=".")
    print(f"   Success: {result.success}")
    if result.success:
        print(f"   Found {result.data['count']} items")
        print(f"   First 5 items: {result.data['items'][:5]}")
    else:
        print(f"   Error: {result.error}")
    
    # Test 3: read_file tool
    print("\n3. Testing read_file tool:")
    result = await tool_registry.execute("read_file", path="requirements.txt")
    print(f"   Success: {result.success}")
    if result.success:
        print(f"   File size: {result.data['size']} bytes")
        print(f"   First 100 chars: {result.data['content'][:100]}...")
    else:
        print(f"   Error: {result.error}")
    
    # Test 4: Error handling
    print("\n4. Testing error handling:")
    result = await tool_registry.execute("read_file", path="nonexistent.txt")
    print(f"   Success: {result.success}")
    print(f"   Error: {result.error}")

if __name__ == "__main__":
    asyncio.run(test_tools())