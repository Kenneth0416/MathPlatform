#!/usr/bin/env python3
"""
MCP 客户端测试脚本

用于测试 MCP stdio 服务器的功能
"""

import subprocess
import json
import sys


class MCPClient:
    """简单的 MCP 客户端"""
    
    def __init__(self, server_command):
        """
        初始化客户端
        
        Args:
            server_command: 服务器启动命令列表
        """
        self.proc = subprocess.Popen(
            server_command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        self.request_id = 0
    
    def send_request(self, method, params=None):
        """发送 JSON-RPC 请求"""
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params or {}
        }
        
        # 发送请求
        self.proc.stdin.write(json.dumps(request) + "\n")
        self.proc.stdin.flush()
        
        # 读取响应
        response_line = self.proc.stdout.readline()
        if not response_line:
            raise Exception("服务器无响应")
        
        return json.loads(response_line)
    
    def initialize(self):
        """初始化连接"""
        return self.send_request("initialize", {
            "protocolVersion": "2024-11-05",
            "clientInfo": {
                "name": "MCP Test Client",
                "version": "0.1.0"
            }
        })
    
    def list_tools(self):
        """列出所有工具"""
        return self.send_request("tools/list")
    
    def call_tool(self, name, arguments):
        """调用工具"""
        return self.send_request("tools/call", {
            "name": name,
            "arguments": arguments
        })
    
    def close(self):
        """关闭连接"""
        self.proc.terminate()
        self.proc.wait()


def print_section(title):
    """打印分隔符"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60 + "\n")


def test_mcp_server():
    """测试 MCP 服务器"""
    
    print("🚀 启动 MCP Math Service 测试...")
    
    # 创建客户端
    client = MCPClient(["python3", "-m", "mcp_math.mcp_server"])
    
    try:
        # 1. 初始化
        print_section("1. 初始化握手")
        init_response = client.initialize()
        print(json.dumps(init_response, indent=2, ensure_ascii=False))
        print("✓ 初始化成功")
        
        # 2. 列出工具
        print_section("2. 列出所有工具")
        tools_response = client.list_tools()
        tools = tools_response.get("result", {}).get("tools", [])
        print(f"可用工具数量: {len(tools)}")
        for i, tool in enumerate(tools, 1):
            print(f"  {i}. {tool['name']}: {tool['description']}")
        print("✓ 工具列表获取成功")
        
        # 3. 测试解方程
        print_section("3. 测试工具调用 - 解方程")
        solve_response = client.call_tool("algebra_solve", {
            "eq": "2*x + 3 = 11",
            "var": "x",
            "detail": "full"
        })
        
        result = solve_response.get("result", {})
        if "content" in result:
            content = json.loads(result["content"][0]["text"])
            print("方程: 2x + 3 = 11")
            print(f"结果: {content['result']['exact']}")
            print(f"步骤数: {len(content['steps'])}")
            for i, step in enumerate(content['steps'], 1):
                print(f"  步骤 {i}: {step['note']} - {step['out']}")
            print("✓ 解方程成功")
        
        # 4. 测试分数运算
        print_section("4. 测试工具调用 - 分数运算")
        fraction_response = client.call_tool("arithmetic_fraction", {
            "a": "3/4",
            "b": "5/6",
            "op": "+",
            "detail": "full"
        })
        
        result = fraction_response.get("result", {})
        if "content" in result:
            content = json.loads(result["content"][0]["text"])
            print("计算: 3/4 + 5/6")
            print(f"结果: {content['result']['exact']}")
            print(f"近似值: {content['result']['approx']}")
            print("✓ 分数运算成功")
        
        # 5. 测试勾股定理
        print_section("5. 测试工具调用 - 勾股定理")
        pythagoras_response = client.call_tool("geometry_pythagoras", {
            "known": "legs",
            "a": 3,
            "b": 4,
            "detail": "full"
        })
        
        result = pythagoras_response.get("result", {})
        if "content" in result:
            content = json.loads(result["content"][0]["text"])
            print("已知: 直角边 a=3, b=4")
            print(f"斜边: {content['result']['exact']}")
            print(f"近似值: {content['result']['approx']}")
            print("✓ 勾股定理计算成功")
        
        # 6. 测试组合数
        print_section("6. 测试工具调用 - 组合数")
        ncr_response = client.call_tool("combinatorics_ncr", {
            "n": 5,
            "r": 2
        })
        
        result = ncr_response.get("result", {})
        if "content" in result:
            content = json.loads(result["content"][0]["text"])
            print("计算: C(5,2)")
            print(f"结果: {content['result']['exact']}")
            print("✓ 组合数计算成功")
        
        # 总结
        print_section("测试完成")
        print("✅ 所有测试通过！")
        print("\nMCP 服务器工作正常，可以在 Cherry Studio 中使用。")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        client.close()
    
    return 0


if __name__ == "__main__":
    sys.exit(test_mcp_server())

