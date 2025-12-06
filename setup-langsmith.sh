#!/bin/bash

# LangSmith 環境配置腳本
# 確保所有流程都通過 LangSmith 進行監控

echo "🔧 配置 LangSmith 環境變量..."
echo "=================================="

# 檢查是否已經有 API Key
if [ -z "$LANGCHAIN_API_KEY" ]; then
    echo "⚠️  LANGCHAIN_API_KEY 未設置"
    echo "請設置您的 LangSmith API Key:"
    echo "export LANGCHAIN_API_KEY=your-api-key-here"
    echo ""
    echo "獲取 API Key: https://smith.langchain.com/"
else
    echo "✅ LANGCHAIN_API_KEY 已設置"
fi

# 設置追踪
echo "📊 設置追踪配置..."
export LANGCHAIN_TRACING_V2=true
echo "✅ LANGCHAIN_TRACING_V2=true"

# 設置項目名稱
if [ -z "$LANGCHAIN_PROJECT" ]; then
    export LANGCHAIN_PROJECT="dse-math-tutoring"
    echo "✅ LANGCHAIN_PROJECT=dse-math-tutoring (默認)"
else
    echo "✅ LANGCHAIN_PROJECT=$LANGCHAIN_PROJECT"
fi

# 設置 LangSmith 端點
export LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
echo "✅ LANGCHAIN_ENDPOINT=https://api.smith.langchain.com"

echo ""
echo "🎯 當前配置:"
echo "  LANGCHAIN_API_KEY=${LANGCHAIN_API_KEY:0:10}..."
echo "  LANGCHAIN_TRACING_V2=$LANGCHAIN_TRACING_V2"
echo "  LANGCHAIN_PROJECT=$LANGCHAIN_PROJECT"
echo "  LANGCHAIN_ENDPOINT=$LANGCHAIN_ENDPOINT"

echo ""
echo "💡 要使配置永久生效，請將這些變量添加到您的 .bashrc, .zshrc 或 .env 文件中"