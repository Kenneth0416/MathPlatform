#!/usr/bin/env python3
"""
MCP Math Service 演示客户端
展示如何通过自然语言路由到相应的数学工具端点
"""

import requests
import json
import re
from typing import Dict, Any, Optional


# 服务基础 URL
BASE_URL = "http://localhost:8000"


class MathClient:
    """数学服务客户端"""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        
    def call_tool(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """调用工具端点"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}
    
    def route_query(self, query: str) -> Optional[tuple[str, Dict[str, Any]]]:
        """
        简单的意图路由：从自然语言问题识别工具和参数
        
        Returns:
            (endpoint, payload) 或 None
        """
        query_lower = query.lower()
        
        # 解方程
        if re.search(r'解方程|求解|solve', query_lower):
            # 提取方程
            eq_match = re.search(r'([0-9x\+\-\*\/\^\=\s]+)', query)
            if eq_match:
                eq = eq_match.group(1).strip()
                return "/algebra/solve", {"eq": eq, "detail": "full"}
        
        # 化简
        if re.search(r'化简|simplify', query_lower):
            expr_match = re.search(r'([0-9xy\+\-\*\/\^\s]+)', query)
            if expr_match:
                expr = expr_match.group(1).strip()
                return "/algebra/simplify", {"expr": expr}
        
        # 展开
        if re.search(r'展开|expand', query_lower):
            expr_match = re.search(r'\(.*\)', query)
            if expr_match:
                expr = expr_match.group(0)
                return "/algebra/expand", {"expr": expr}
        
        # 因式分解
        if re.search(r'因式分解|factor', query_lower):
            expr_match = re.search(r'([0-9xy\+\-\*\/\^\s]+)', query)
            if expr_match:
                expr = expr_match.group(1).strip()
                return "/algebra/factor", {"expr": expr}
        
        # 分数运算
        if re.search(r'分数|fraction', query_lower):
            frac_match = re.search(r'(\d+/\d+)\s*([+\-*/])\s*(\d+/\d+)', query)
            if frac_match:
                a, op, b = frac_match.groups()
                return "/arithmetic/fraction", {"a": a, "b": b, "op": op, "detail": "full"}
        
        # 百分比
        if re.search(r'增长|减少|百分比|percent', query_lower):
            num_matches = re.findall(r'(\d+(?:\.\d+)?)', query)
            if len(num_matches) >= 2:
                base = float(num_matches[0])
                rate = float(num_matches[1])
                mode = "increase" if "增长" in query_lower or "increase" in query_lower else "decrease"
                return "/arithmetic/percent", {"base": base, "rate": rate, "mode": mode}
        
        # 勾股定理
        if re.search(r'勾股|直角三角形|pythagoras', query_lower):
            nums = re.findall(r'(\d+(?:\.\d+)?)', query)
            if len(nums) >= 2:
                if "斜边" in query_lower or "hypotenuse" in query_lower:
                    return "/geometry/pythagoras", {"known": "legs", "a": float(nums[0]), "b": float(nums[1]), "detail": "full"}
                else:
                    return "/geometry/pythagoras", {"known": "legs", "a": float(nums[0]), "b": float(nums[1]), "detail": "full"}
        
        # 圆心角圆周角
        if re.search(r'圆心角|圆周角|circle', query_lower):
            angle_match = re.search(r'(\d+(?:\.\d+)?)', query)
            if angle_match:
                angle = float(angle_match.group(1))
                if "圆心角" in query_lower or "center" in query_lower:
                    return "/geometry/circle_angles", {"center_angle": angle, "query": "inscribed"}
                else:
                    return "/geometry/circle_angles", {"inscribed_angle": angle, "query": "center"}
        
        # 组合数
        if re.search(r'组合|combination|c\(', query_lower):
            nums = re.findall(r'(\d+)', query)
            if len(nums) >= 2:
                return "/combinatorics/ncr", {"n": int(nums[0]), "r": int(nums[1])}
        
        # 排列数
        if re.search(r'排列|permutation|p\(', query_lower):
            nums = re.findall(r'(\d+)', query)
            if len(nums) >= 2:
                return "/combinatorics/npr", {"n": int(nums[0]), "r": int(nums[1])}
        
        return None
    
    def query(self, natural_query: str) -> Dict[str, Any]:
        """处理自然语言查询"""
        print(f"\n问题: {natural_query}")
        print("=" * 60)
        
        # 路由
        route_result = self.route_query(natural_query)
        if not route_result:
            return {"error": "无法识别问题类型，请尝试更明确的表述"}
        
        endpoint, payload = route_result
        print(f"路由到: {endpoint}")
        print(f"参数: {json.dumps(payload, ensure_ascii=False, indent=2)}")
        print("-" * 60)
        
        # 调用
        result = self.call_tool(endpoint, payload)
        
        # 显示结果
        if "ok" in result and result["ok"]:
            print(f"✓ 结果: {result['result']['exact']}")
            if result['result'].get('approx'):
                print(f"  近似值: {result['result']['approx']}")
            
            print(f"\n步骤:")
            for i, step in enumerate(result['steps'], 1):
                note = step.get('note', '')
                out = step.get('out', '')
                print(f"  {i}. {note}: {out}")
            
            print(f"\nLaTeX: {result['display']['latex']}")
            print(f"追踪ID: {result['meta']['trace_id']}")
            
            if result['meta'].get('intermediate'):
                print(f"中间结果: {result['meta']['intermediate']}")
        else:
            print(f"✗ 错误: {result.get('error', result)}")
        
        print("=" * 60)
        return result


def main():
    """主函数：运行示例查询"""
    client = MathClient()
    
    # 检查服务健康
    try:
        health = requests.get(f"{BASE_URL}/health", timeout=5)
        health.raise_for_status()
        print(f"服务状态: {health.json()}")
    except Exception as e:
        print(f"错误: 无法连接到服务 ({e})")
        print(f"请确保服务正在运行: uvicorn mcp_math.app:app --reload")
        return
    
    # 示例查询
    examples = [
        "解方程 2*x + 3 = 11",
        "化简 2*x + 3*x",
        "展开 (x+1)*(x+2)",
        "因式分解 x**2 - 1",
        "计算 3/4 + 5/6",
        "100 增长 20%",
        "直角三角形两直角边为 3 和 4，求斜边",
        "圆心角 60 度，求圆周角",
        "求组合数 C(5,2)",
        "求排列数 P(5,2)",
    ]
    
    print("\n" + "=" * 60)
    print("MCP Math Service 演示客户端")
    print("=" * 60)
    
    for example in examples:
        client.query(example)
    
    print("\n提示：可以修改 examples 列表添加更多测试用例")
    print("或者调用 client.query('你的问题') 进行交互式查询\n")


if __name__ == "__main__":
    main()



