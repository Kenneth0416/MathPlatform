#!/usr/bin/env python3
"""
诊断脚本 - 检查 MCP Math Service 的所有依赖和配置
"""

import sys
import os

print("=" * 60)
print("MCP Math Service 诊断工具")
print("=" * 60)

# 1. 检查 Python 版本
print("\n[1] Python 版本:")
print(f"    版本: {sys.version}")
print(f"    路径: {sys.executable}")

# 2. 检查工作目录
print("\n[2] 工作目录:")
print(f"    当前目录: {os.getcwd()}")
print(f"    项目路径: /Users/kenneth/Documents/MCP/MathMCP")

# 3. 检查核心模块导入
print("\n[3] 核心模块导入测试:")
try:
    import json
    print("    ✓ json 导入成功")
except Exception as e:
    print(f"    ✗ json 导入失败: {e}")
    sys.exit(1)

try:
    import asyncio
    print("    ✓ asyncio 导入成功")
except Exception as e:
    print(f"    ✗ asyncio 导入失败: {e}")

try:
    import sympy
    print(f"    ✓ sympy 导入成功 (版本: {sympy.__version__})")
except Exception as e:
    print(f"    ✗ sympy 导入失败: {e}")

try:
    import fastapi
    print(f"    ✓ fastapi 导入成功 (版本: {fastapi.__version__})")
except Exception as e:
    print(f"    ✗ fastapi 导入失败: {e}")

try:
    import pydantic
    print(f"    ✓ pydantic 导入成功 (版本: {pydantic.__version__})")
except Exception as e:
    print(f"    ✗ pydantic 导入失败: {e}")

# 4. 检查项目模块
print("\n[4] 项目模块导入测试:")
try:
    from mcp_math.core import schema
    print("    ✓ mcp_math.core.schema 导入成功")
except Exception as e:
    print(f"    ✗ mcp_math.core.schema 导入失败: {e}")

try:
    from mcp_math.core import parser
    print("    ✓ mcp_math.core.parser 导入成功")
except Exception as e:
    print(f"    ✗ mcp_math.core.parser 导入失败: {e}")

try:
    from mcp_math.core import algebra
    print("    ✓ mcp_math.core.algebra 导入成功")
except Exception as e:
    print(f"    ✗ mcp_math.core.algebra 导入失败: {e}")

try:
    from mcp_math import app
    print("    ✓ mcp_math.app 导入成功")
except Exception as e:
    print(f"    ✗ mcp_math.app 导入失败: {e}")

try:
    from mcp_math import mcp_server
    print("    ✓ mcp_math.mcp_server 导入成功")
except Exception as e:
    print(f"    ✗ mcp_math.mcp_server 导入失败: {e}")
    print(f"    详细错误:")
    import traceback
    traceback.print_exc()

# 5. 测试 MCP 服务器实例化
print("\n[5] MCP 服务器实例化测试:")
try:
    from mcp_math.mcp_server import MCPServer
    server = MCPServer()
    print(f"    ✓ MCP 服务器创建成功")
    print(f"    服务器名称: {server.name}")
    print(f"    服务器版本: {server.version}")
    print(f"    注册工具数: {len(server.tools)}")
except Exception as e:
    print(f"    ✗ MCP 服务器创建失败: {e}")
    import traceback
    traceback.print_exc()

# 6. 测试 JSON 处理
print("\n[6] JSON 处理测试:")
try:
    test_data = {"test": "数据", "number": 123}
    json_str = json.dumps(test_data, ensure_ascii=False)
    parsed = json.loads(json_str)
    print("    ✓ JSON 序列化/反序列化成功")
    print(f"    测试数据: {json_str}")
except Exception as e:
    print(f"    ✗ JSON 处理失败: {e}")

# 7. 检查配置文件
print("\n[7] 配置文件检查:")
config_file = "/Users/kenneth/Documents/MCP/MathMCP/mcp-servers.json"
if os.path.exists(config_file):
    print(f"    ✓ 找到配置文件: {config_file}")
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        print(f"    ✓ 配置文件 JSON 格式正确")
        print(f"    服务器配置: {list(config.get('mcpServers', {}).keys())}")
    except Exception as e:
        print(f"    ✗ 配置文件读取失败: {e}")
else:
    print(f"    - 配置文件不存在（可选）")

# 8. 检查 Python 路径
print("\n[8] Python 路径:")
for i, path in enumerate(sys.path[:5], 1):
    print(f"    {i}. {path}")

print("\n" + "=" * 60)
print("诊断完成！")
print("=" * 60)

# 总结
print("\n如果所有测试都显示 ✓，说明环境配置正常。")
print("如果有 ✗，请检查对应的错误信息。")
print("\n常见问题解决：")
print("1. 如果缺少依赖包：pip3 install -r requirements.txt")
print("2. 如果找不到模块：export PYTHONPATH=/Users/kenneth/Documents/MCP/MathMCP")
print("3. 如果 JSON 导入失败：检查 Python 安装是否完整")



