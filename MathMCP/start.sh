#!/bin/bash
# MCP Math Service 快速启动脚本

echo "================================"
echo "MCP Math Service 启动中..."
echo "================================"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3"
    exit 1
fi

# 检查依赖
echo "检查依赖..."
python3 -c "import fastapi, sympy, uvicorn" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "正在安装依赖..."
    pip install -r requirements.txt
fi

# 启动服务
echo ""
echo "启动服务于 http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo "================================"

# 使用 uvicorn 启动
python3 -m uvicorn mcp_math.app:app --host 0.0.0.0 --port 8000 --reload



