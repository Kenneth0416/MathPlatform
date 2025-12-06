#!/bin/bash

# MCP Math Service 展示網頁啟動腳本

echo "🚀 啟動 MCP Math Service 展示網頁..."
echo ""

# 檢查是否有 Python
if command -v python3 &> /dev/null; then
    echo "✅ 使用 Python3 啟動本地服務器"
    echo "📱 網頁將在 http://localhost:8080 開啟"
    echo "🔄 按 Ctrl+C 停止服務器"
    echo ""
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    echo "✅ 使用 Python 啟動本地服務器"
    echo "📱 網頁將在 http://localhost:8080 開啟"
    echo "🔄 按 Ctrl+C 停止服務器"
    echo ""
    python -m http.server 8080
else
    echo "❌ 未找到 Python，請手動開啟 presentation.html 文件"
    echo "💡 或者安裝 Python 後重新運行此腳本"
    echo ""
    echo "📁 文件位置：$(pwd)/presentation.html"
    
    # 嘗試用系統默認瀏覽器開啟
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open presentation.html
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open presentation.html
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows
        start presentation.html
    fi
fi

