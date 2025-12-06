#!/bin/bash
# MCP Math Service - curl 示例脚本
# 使用方法: chmod +x curl_examples.sh && ./curl_examples.sh

BASE_URL="http://localhost:8000"

echo "================================"
echo "MCP Math Service - API 测试"
echo "================================"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 健康检查
echo -e "\n${BLUE}[1] 健康检查${NC}"
curl -s "${BASE_URL}/health" | jq '.'

# 解一次方程
echo -e "\n${BLUE}[2] 解一次方程: 2x + 3 = 11${NC}"
curl -s -X POST "${BASE_URL}/algebra/solve" \
  -H "Content-Type: application/json" \
  -d '{
    "eq": "2*x + 3 = 11",
    "var": "x",
    "detail": "full"
  }' | jq '.result, .steps'

# 解二次方程
echo -e "\n${BLUE}[3] 解二次方程: x² - 5x + 6 = 0${NC}"
curl -s -X POST "${BASE_URL}/algebra/solve" \
  -H "Content-Type: application/json" \
  -d '{
    "eq": "x**2 - 5*x + 6 = 0",
    "var": "x",
    "method": "auto",
    "detail": "full"
  }' | jq '.result, .meta.intermediate'

# 化简表达式
echo -e "\n${BLUE}[4] 化简表达式: 2x + 3x${NC}"
curl -s -X POST "${BASE_URL}/algebra/simplify" \
  -H "Content-Type: application/json" \
  -d '{
    "expr": "2*x + 3*x"
  }' | jq '.result'

# 展开表达式
echo -e "\n${BLUE}[5] 展开表达式: (x+1)(x+2)${NC}"
curl -s -X POST "${BASE_URL}/algebra/expand" \
  -H "Content-Type: application/json" \
  -d '{
    "expr": "(x+1)*(x+2)"
  }' | jq '.result, .display.latex'

# 因式分解
echo -e "\n${BLUE}[6] 因式分解: x² - 1${NC}"
curl -s -X POST "${BASE_URL}/algebra/factor" \
  -H "Content-Type: application/json" \
  -d '{
    "expr": "x**2 - 1"
  }' | jq '.result'

# 分数加法
echo -e "\n${BLUE}[7] 分数加法: 3/4 + 5/6${NC}"
curl -s -X POST "${BASE_URL}/arithmetic/fraction" \
  -H "Content-Type: application/json" \
  -d '{
    "a": "3/4",
    "b": "5/6",
    "op": "+",
    "detail": "full"
  }' | jq '.result, .steps'

# 分数乘法
echo -e "\n${BLUE}[8] 分数乘法: 2/3 × 3/4${NC}"
curl -s -X POST "${BASE_URL}/arithmetic/fraction" \
  -H "Content-Type: application/json" \
  -d '{
    "a": "2/3",
    "b": "3/4",
    "op": "*"
  }' | jq '.result'

# 百分比增长
echo -e "\n${BLUE}[9] 百分比增长: 100 增长 20%${NC}"
curl -s -X POST "${BASE_URL}/arithmetic/percent" \
  -H "Content-Type: application/json" \
  -d '{
    "base": 100,
    "rate": 20,
    "mode": "increase"
  }' | jq '.result, .steps'

# 勾股定理
echo -e "\n${BLUE}[10] 勾股定理: a=3, b=4, 求c${NC}"
curl -s -X POST "${BASE_URL}/geometry/pythagoras" \
  -H "Content-Type: application/json" \
  -d '{
    "known": "legs",
    "a": 3,
    "b": 4,
    "detail": "full"
  }' | jq '.result, .steps'

# 相似三角形
echo -e "\n${BLUE}[11] 相似三角形: 求对应边${NC}"
curl -s -X POST "${BASE_URL}/geometry/similar" \
  -H "Content-Type: application/json" \
  -d '{
    "tri1": {"AB": 3, "BC": 4, "CA": 5},
    "tri2": {"DE": 6, "EF": null, "FD": 10},
    "mapping": {"A": "D", "B": "E", "C": "F"},
    "query": "EF",
    "detail": "full"
  }' | jq '.result, .meta.scale_k'

# 圆心角与圆周角
echo -e "\n${BLUE}[12] 圆周角定理: 圆心角60°，求圆周角${NC}"
curl -s -X POST "${BASE_URL}/geometry/circle_angles" \
  -H "Content-Type: application/json" \
  -d '{
    "center_angle": 60,
    "query": "inscribed"
  }' | jq '.result'

# 组合数
echo -e "\n${BLUE}[13] 组合数: C(5,2)${NC}"
curl -s -X POST "${BASE_URL}/combinatorics/ncr" \
  -H "Content-Type: application/json" \
  -d '{
    "n": 5,
    "r": 2
  }' | jq '.result'

# 排列数
echo -e "\n${BLUE}[14] 排列数: P(5,2)${NC}"
curl -s -X POST "${BASE_URL}/combinatorics/npr" \
  -H "Content-Type: application/json" \
  -d '{
    "n": 5,
    "r": 2
  }' | jq '.result'

# 数值计算
echo -e "\n${BLUE}[15] 数值计算: sqrt(2) + pi${NC}"
curl -s -X POST "${BASE_URL}/eval/numeric" \
  -H "Content-Type: application/json" \
  -d '{
    "expr": "sqrt(2) + pi",
    "precision": 10
  }' | jq '.result'

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}测试完成！${NC}"
echo -e "${GREEN}================================${NC}"



