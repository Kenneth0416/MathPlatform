#!/bin/bash
# MCP Math Service 启动脚本 - 供 Cherry Studio 使用

cd /Users/kenneth/Documents/MCP/MathMCP
export PYTHONPATH=/Users/kenneth/Documents/MCP/MathMCP
export PYTHONUNBUFFERED=1
exec python3 -m mcp_math.mcp_server "$@"
