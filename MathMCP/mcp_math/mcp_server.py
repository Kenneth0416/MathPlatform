"""
MCP Math Service - 标准 MCP stdio 协议服务器

这是标准 MCP 协议的实现，使用 stdio 进行通信。
可以直接被 Cherry Studio 等 MCP Host 调用。
"""

import sys
import json
import asyncio
from typing import Any, Dict, List, Optional
import traceback

# 导入现有的核心功能（保持 schema 不变）
from .core.algebra import (
    simplify_expression, expand_expression, factor_expression, solve_equation
)
from .core.arithmetic import fraction_operation, percent_calculation
from .core.geometry import pythagoras_theorem, similar_triangles, circle_angles
from .core.combinatorics import combination, permutation
from .core.inequality import solve_inequality
from .core.trigonometry import (
    trigonometry_sine, 
    trigonometry_cosine, 
    trigonometry_tangent,
    trigonometry_law_of_sines
)
from .core.parser import parse_expression


class MCPServer:
    """MCP 协议服务器"""
    
    def __init__(self):
        self.version = "0.1.0"
        self.name = "MCP Math Service"
        self.tools = self._register_tools()
        self.prompts = self._register_prompts()
    
    def _register_prompts(self) -> List[Dict[str, Any]]:
        """註冊系統提示詞，幫助AI正確選擇工具"""
        return [
            {
                "name": "math_tool_guide",
                "description": "數學工具選擇指南",
                "arguments": []
            }
        ]
    
    def _validate_arguments(self, arguments: Any) -> Dict[str, Any]:
        """
        驗證並規範化參數
        防止 AI 模型錯誤地將工具定義當作參數值發送
        
        Returns:
            規範化後的參數字典
        """
        # 情況1: arguments 是字符串（AI 模型發送了 JSON 字符串）
        if isinstance(arguments, str):
            try:
                # 嘗試解析 JSON
                parsed = json.loads(arguments)
                # 檢查解析後的內容是否是 schema 定義
                if isinstance(parsed, dict) and ("type" in parsed and parsed.get("type") == "object"):
                    raise ValueError(
                        "收到的是工具定義的 inputSchema，而非實際參數。"
                        "請提供實際的參數值，例如：{'eq': '2*x+3=11'}"
                    )
                arguments = parsed
            except json.JSONDecodeError:
                raise ValueError(f"無法解析參數 JSON 字符串: {arguments[:100]}...")
        
        # 情況2: arguments 不是字典
        if not isinstance(arguments, dict):
            raise ValueError(
                f"參數類型錯誤：預期字典，收到 {type(arguments).__name__}。"
                f"請提供格式正確的參數，例如：{{'eq': '2*x+3=11'}}"
            )
        
        # 情況2.5: 檢查 arguments 本身是否是 schema 定義
        if "type" in arguments and "properties" in arguments:
            raise ValueError(
                "收到的是工具定義的 inputSchema，而非實際參數。"
                f"請提供實際的參數值，例如：{{'n': 5, 'r': 3}}"
            )
        
        # 情況3: 檢查字典中的每個值是否是 schema 對象
        for key, value in arguments.items():
            if isinstance(value, dict):
                # 檢查是否是錯誤的 schema 對象
                if "type" in value or "description" in value or "enum" in value:
                    raise ValueError(
                        f"參數 '{key}' 收到了工具定義的 schema 而非實際值。"
                        f"請提供實際的參數值，而不是參數定義。"
                        f"例如：應該傳遞 'eq': '2*x+3=11' 而不是 'eq': {{'type': 'string'}}"
                    )
        
        return arguments
    
    def _register_tools(self) -> List[Dict[str, Any]]:
        """注册所有可用工具"""
        return [
            {
                "name": "algebra_solve",
                "description": """解方程（一元方程求解）
                
適用範圍：
- 一元一次方程：2*x + 3 = 11
- 一元二次方程：x^2 - 5*x + 6 = 0
- 簡單的多項式方程：x^3 - 8 = 0

不適用（會失敗）：
- 複雜分式方程：(x-1)/(x+2) = 1 → 建議先用 algebra_simplify 化簡
- 含多個變量的方程
- 超越方程（含 sin, cos, exp 等）

使用建議：
1. 對於分式方程，先通分化簡為多項式方程
2. 如果方程很複雜，先嘗試 algebra_simplify 或 algebra_expand
3. 確保方程格式正確（使用 * 表示乘法，** 表示乘方）

參數：
- eq: 方程字符串（必需），如 "2*x+3=11"
- var: 變量名（默認 "x"）
- detail: "short" 或 "full"（默認 "full"）""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "eq": {"type": "string", "description": "方程字符串，如 '2*x+3=11'"},
                        "var": {"type": "string", "default": "x", "description": "變量名"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "full", "description": "詳細程度"}
                    },
                    "required": ["eq"]
                }
            },
            {
                "name": "algebra_simplify",
                "description": """化簡表達式 - 將代數式簡化為最簡形式

適用範圍：
- 多項式化簡：(x+1)^2 - (x-1)^2 → 4*x
- 分式化簡：(x^2-1)/(x-1) → x+1
- 三角函數化簡：sin(x)^2 + cos(x)^2 → 1
- 複雜表達式：((x-1)/(x+2) - (2x+3)/(x-2)) → 簡化後的分式

使用場景：
1. 在解方程前，先化簡複雜的分式方程
2. 驗證兩個表達式是否相等
3. 將複雜表達式轉換為更簡單的形式

參數：
- expr: 要化簡的表達式（必需）
- detail: "short" 或 "full"（默認 "short"）

提示：對於分式方程，化簡後可能仍需手動處理""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "expr": {"type": "string", "description": "要化簡的表達式"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "short", "description": "詳細程度"}
                    },
                    "required": ["expr"]
                }
            },
            {
                "name": "algebra_expand",
                "description": """展開表達式 - 將括號和乘法完全展開

適用範圍：
- 多項式乘法：(x+1)(x+2) → x^2 + 3*x + 2
- 多層括號：((x+1)(x+2))^2 → 完全展開
- 三角恆等式：sin(2*x) → 2*sin(x)*cos(x)

使用場景：
1. 展開括號後再化簡
2. 將複雜表達式轉換為標準多項式形式
3. 在解方程前，將方程兩邊完全展開

參數：
- expr: 要展開的表達式（必需）
- detail: "short" 或 "full"（默認 "short"）

注意：展開後可能得到很長的表達式，此時建議再用 algebra_simplify 化簡""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "expr": {"type": "string", "description": "要展開的表達式"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "short", "description": "詳細程度"}
                    },
                    "required": ["expr"]
                }
            },
            {
                "name": "algebra_factor",
                "description": """因式分解 - 將多項式分解為因數的乘積

適用範圍：
- 二次多項式：x^2 - 5*x + 6 → (x-2)(x-3)
- 三次及以上：x^3 - 8 → (x-2)(x^2+2*x+4)
- 提取公因數：2*x^2 + 4*x → 2*x*(x+2)

使用場景：
1. 解多項式方程（分解後令每個因數為0）
2. 簡化分式（約分）
3. 找多項式的根

參數：
- expr: 要分解的表達式（必需）
- detail: "short" 或 "full"（默認 "short"）

注意：不是所有多項式都能分解為有理係數因式""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "expr": {"type": "string", "description": "要分解的多項式"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "short", "description": "詳細程度"}
                    },
                    "required": ["expr"]
                }
            },
            {
                "name": "algebra_inequality",
                "description": """求解不等式 - 求解一元不等式問題

適用範圍：
- 一元一次不等式：2*x + 3 >= 5
- 一元二次不等式：x^2 - 5*x + 6 > 0
- 分式不等式：(x-1)/(x+2) >= 0
- 含參數不等式：(x+1)/(k-2) >= 3（會提供分類討論提示）

使用場景：
1. 求不等式的解集
2. 分式不等式（自動考慮分母符號）
3. 含參數的不等式（提供關鍵點和討論思路）

參數：
- ineq: 不等式字符串（必需），支持 >=, <=, >, <
- var: 變量名（默認 "x"）
- detail: "short" 或 "full"（默認 "full"）

示例：
- 簡單不等式：{"ineq": "2*x+3 >= 5", "var": "x"} → x ≥ 1
- 分式不等式：{"ineq": "(x-1)/(x+2) > 0", "var": "x"} → x<-2 或 x>1
- 含參數：{"ineq": "(x+1)/(k-2) >= 3", "var": "x"} → 提供分類討論提示

注意：含參數的不等式可能需要手動分類討論""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "ineq": {"type": "string", "description": "不等式字符串，如 '2*x+3 >= 5'"},
                        "var": {"type": "string", "default": "x", "description": "變量名"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "full", "description": "詳細程度"}
                    },
                    "required": ["ineq"]
                }
            },
            {
                "name": "arithmetic_fraction",
                "description": "分數運算 - 計算兩個分數的加減乘除，如 '1/2 + 1/3' 或 '2/3 × 3/4'",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "a": {"type": "string"},
                        "b": {"type": "string"},
                        "op": {"type": "string", "enum": ["+", "-", "*", "/"]},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "full"}
                    },
                    "required": ["a", "b", "op"]
                }
            },
            {
                "name": "arithmetic_percent",
                "description": "百分比計算 - 計算百分比增減，如原價100增加20%或減少15%",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "base": {"type": "number"},
                        "rate": {"type": "number"},
                        "mode": {"type": "string", "enum": ["increase", "decrease"]}
                    },
                    "required": ["base", "rate", "mode"]
                }
            },
            {
                "name": "geometry_pythagoras",
                "description": """勾股定理（畢氏定理）- 直角三角形邊長計算

公式：a² + b² = c²（a、b為直角邊，c為斜邊）

使用場景：
1. 已知兩直角邊，求斜邊
   - known="legs"，提供 a 和 b
2. 已知斜邊和一直角邊，求另一直角邊
   - known="hypotenuse"，提供 c 和 a（或 c 和 b）

參數說明：
- known: "legs"（已知兩直角邊）或 "hypotenuse"（已知斜邊）
- a, b: 直角邊長度
- c: 斜邊長度
- detail: "short" 或 "full"

示例：
- 求斜邊：{"known": "legs", "a": 3, "b": 4} → c = 5
- 求直角邊：{"known": "hypotenuse", "c": 13, "a": 5} → b = 12""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "known": {"type": "string", "enum": ["legs", "hypotenuse"], "description": "已知條件類型"},
                        "a": {"type": "number", "description": "直角邊a"},
                        "b": {"type": "number", "description": "直角邊b"},
                        "c": {"type": "number", "description": "斜邊c"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "full", "description": "詳細程度"}
                    },
                    "required": ["known"]
                }
            },
            {
                "name": "geometry_circle_angles",
                "description": """圓角度計算 - 圓心角與圓周角的轉換

定理：同弧所對的圓周角 = 圓心角 ÷ 2

使用場景：
1. 已知圓心角，求圓周角
   - query="inscribed"，提供 center_angle
2. 已知圓周角，求圓心角
   - query="center"，提供 inscribed_angle

參數說明：
- query: "inscribed"（求圓周角）或 "center"（求圓心角）
- center_angle: 圓心角度數
- inscribed_angle: 圓周角度數

示例：
- 求圓周角：{"query": "inscribed", "center_angle": 80} → 40°
- 求圓心角：{"query": "center", "inscribed_angle": 30} → 60°""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "center_angle": {"type": "number", "description": "圓心角度數"},
                        "inscribed_angle": {"type": "number", "description": "圓周角度數"},
                        "query": {"type": "string", "enum": ["center", "inscribed"], "description": "要求的角度類型"}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "geometry_similar_triangles",
                "description": """相似三角形比例計算 - 對應邊成比例

原理：當△ABC 與 △A'B'C' 相似時，對應邊之比相等
即：A'B'/AB = A'C'/AC = B'C'/BC

使用場景：
已知一組對應邊的長度，求另一組對應邊

需要提供的信息：
1. 一組已知的對應邊（用於計算相似比）
   - side1_name, side1_length（三角形1的邊）
   - side2_name, side2_length（三角形2的對應邊）
2. 三角形1的另一條已知邊
   - known_side_name, known_side_length
3. 要求的三角形2的邊
   - query_side_name

計算步驟：
1. 計算相似比 k = side2_length / side1_length
2. 求未知邊 = known_side_length × k

示例：△ABC與△A'B'C'對應，AC=8，A'C'=12，AB=6，求A'B'
參數：{"side1_name": "AC", "side1_length": 8, "side2_name": "A'C'", "side2_length": 12, "known_side_name": "AB", "known_side_length": 6, "query_side_name": "A'B'"}
結果：A'B' = 9""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "side1_name": {"type": "string", "description": "三角形1的邊名稱，如 'AC'"},
                        "side1_length": {"type": "number", "description": "三角形1的邊長度"},
                        "side2_name": {"type": "string", "description": "三角形2的對應邊名稱，如 'A\\'C\\''"},
                        "side2_length": {"type": "number", "description": "三角形2的對應邊長度"},
                        "known_side_name": {"type": "string", "description": "已知邊的名稱，如 'AB'"},
                        "known_side_length": {"type": "number", "description": "已知邊的長度"},
                        "query_side_name": {"type": "string", "description": "要求的邊名稱，如 'A\\'B\\'"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "short"}
                    },
                    "required": ["side1_name", "side1_length", "side2_name", "side2_length", "known_side_name", "known_side_length", "query_side_name"]
                }
            },
            {
                "name": "combinatorics_ncr",
                "description": "組合數 C(n,r) - 從n個不同元素中取r個的組合數（不考慮順序）。如：從8個人中選3個人的方法數",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "n": {"type": "integer"},
                        "r": {"type": "integer"}
                    },
                    "required": ["n", "r"]
                }
            },
            {
                "name": "combinatorics_npr",
                "description": "排列數 P(n,r) - 從n個不同元素中取r個進行排列（考慮順序）。如：8個人選3個排成一列的方法數",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "n": {"type": "integer"},
                        "r": {"type": "integer"}
                    },
                    "required": ["n", "r"]
                }
            },
            {
                "name": "eval_numeric",
                "description": "數值計算與求值 - 計算數學表達式的數值結果，如 'sqrt(2)', 'sin(pi/4)', '2^10' 等",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "expr": {"type": "string"},
                        "precision": {"type": "integer", "default": 10}
                    },
                    "required": ["expr"]
                }
            },
            {
                "name": "trigonometry_sine",
                "description": """三角函數正弦計算 - 支援正弦值計算與角度求解

適用範圍：
- 正弦值計算：已知直角三角形對邊和斜邊，求 sin θ
- 角度求解：已知正弦值，求角度 θ

使用場景：
1. 正弦值計算（sin 模式）
   - 已知對邊和斜邊，計算正弦值
   - 例如：直角三角形對邊=3，斜邊=5，求 sin θ
2. 角度求解（arcsin 模式）
   - 已知正弦值，求角度
   - 例如：sin θ = 0.6，求 θ

參數說明：
- mode: "sin"（計算正弦值）或 "arcsin"（求角度）
- opposite: 對邊長度（sin 模式必填）
- hypotenuse: 斜邊長度（sin 模式必填）
- value: 正弦值（arcsin 模式必填，範圍 -1 到 1）
- unit: "degrees"（度數）或 "radians"（弧度），默認 "degrees"
- detail: "short" 或 "full"，默認 "full"

示例：
- 計算正弦值：{"mode": "sin", "opposite": 3, "hypotenuse": 5} → sin θ = 0.6
- 求角度：{"mode": "arcsin", "value": 0.6, "unit": "degrees"} → θ = 36.87°

注意：僅支援正弦函數，餘弦和正切函數可後續擴充""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "mode": {"type": "string", "enum": ["sin", "arcsin"], "description": "模式：'sin' 計算正弦值，'arcsin' 求角度"},
                        "opposite": {"type": "number", "description": "對邊長（sin 模式必填）"},
                        "hypotenuse": {"type": "number", "description": "斜邊長（sin 模式必填）"},
                        "value": {"type": "number", "description": "正弦值或角度（arcsin 模式必填，-1 到 1）"},
                        "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees", "description": "單位：度數或弧度"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "full", "description": "詳細程度"}
                    },
                    "required": ["mode"]
                }
            },
            {
                "name": "trigonometry_cosine",
                "description": """三角函數餘弦計算 - 支援餘弦值計算與角度求解

適用範圍：
- 餘弦值計算：已知直角三角形鄰邊和斜邊，求 cos θ
- 角度求解：已知餘弦值，求角度 θ

使用場景：
1. 餘弦值計算（cos 模式）
   - 已知鄰邊和斜邊，計算餘弦值
   - 例如：直角三角形鄰邊=4，斜邊=5，求 cos θ
2. 角度求解（arccos 模式）
   - 已知餘弦值，求角度
   - 例如：cos θ = 0.8，求 θ

參數說明：
- mode: "cos"（計算餘弦值）或 "arccos"（求角度）
- adjacent: 鄰邊長度（cos 模式必填）
- hypotenuse: 斜邊長度（cos 模式必填）
- value: 餘弦值（arccos 模式必填，範圍 -1 到 1）
- unit: "degrees"（度數）或 "radians"（弧度），默認 "degrees"
- detail: "short" 或 "full"，默認 "full"

示例：
- 計算餘弦值：{"mode": "cos", "adjacent": 4, "hypotenuse": 5} → cos θ = 0.8
- 求角度：{"mode": "arccos", "value": 0.8, "unit": "degrees"} → θ = 36.87°

注意：僅支援餘弦函數，正弦和正切函數使用對應的專用工具""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "mode": {"type": "string", "enum": ["cos", "arccos"], "description": "模式：'cos' 計算餘弦值，'arccos' 求角度"},
                        "adjacent": {"type": "number", "description": "鄰邊長（cos 模式必填）"},
                        "hypotenuse": {"type": "number", "description": "斜邊長（cos 模式必填）"},
                        "value": {"type": "number", "description": "餘弦值（arccos 模式必填，-1 到 1）"},
                        "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees", "description": "單位：度數或弧度"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "full", "description": "詳細程度"}
                    },
                    "required": ["mode"]
                }
            },
            {
                "name": "trigonometry_tangent",
                "description": """三角函數正切計算 - 支援正切值計算與角度求解

適用範圍：
- 正切值計算：已知直角三角形對邊和鄰邊，求 tan θ
- 角度求解：已知正切值，求角度 θ

使用場景：
1. 正切值計算（tan 模式）
   - 已知對邊和鄰邊，計算正切值
   - 例如：直角三角形對邊=3，鄰邊=4，求 tan θ
2. 角度求解（arctan 模式）
   - 已知正切值，求角度
   - 例如：tan θ = 0.75，求 θ

參數說明：
- mode: "tan"（計算正切值）或 "arctan"（求角度）
- opposite: 對邊長度（tan 模式必填）
- adjacent: 鄰邊長度（tan 模式必填）
- value: 正切值（arctan 模式必填）
- unit: "degrees"（度數）或 "radians"（弧度），默認 "degrees"
- detail: "short" 或 "full"，默認 "full"

示例：
- 計算正切值：{"mode": "tan", "opposite": 3, "adjacent": 4} → tan θ = 0.75
- 求角度：{"mode": "arctan", "value": 0.75, "unit": "degrees"} → θ = 36.87°

注意：鄰邊不能為 0（正切值無定義）""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "mode": {"type": "string", "enum": ["tan", "arctan"], "description": "模式：'tan' 計算正切值，'arctan' 求角度"},
                        "opposite": {"type": "number", "description": "對邊長（tan 模式必填）"},
                        "adjacent": {"type": "number", "description": "鄰邊長（tan 模式必填）"},
                        "value": {"type": "number", "description": "正切值（arctan 模式必填）"},
                        "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees", "description": "單位：度數或弧度"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "full", "description": "詳細程度"}
                    },
                    "required": ["mode"]
                }
            },
            {
                "name": "trigonometry_law_of_sines",
                "description": """正弦定理計算 - 解非直角三角形問題

正弦定理：a/sin(A) = b/sin(B) = c/sin(C)

適用範圍：
- 已知兩邊一角，求另一角
- 已知兩角一邊，求另一邊
- 解三角形（已知部分信息，求其他信息）

使用場景：
1. 求角度（find_angle 模式）
   - 已知兩邊和一個對應角，求另一個角
   - 例如：a=5, b=8.66, A=30°，求角B
2. 求邊長（find_side 模式）
   - 已知兩角和一個對應邊，求另一個邊
   - 例如：A=30°, B=60°, a=5，求邊b
3. 解三角形（solve_triangle 模式）
   - 已知兩角一邊，求其他所有信息
   - 例如：A=30°, B=60°, a=5，求C、b、c

參數說明：
- mode: "find_angle"、"find_side" 或 "solve_triangle"
- side_a, side_b, side_c: 邊長
- angle_A, angle_B, angle_C: 角度
- unit: "degrees"（度數）或 "radians"（弧度），默認 "degrees"
- detail: "short" 或 "full"，默認 "full"

示例：
- 求角：{"mode": "find_angle", "angle_A": 30, "side_a": 5, "side_b": 8.66}
- 求邊：{"mode": "find_side", "angle_A": 30, "angle_B": 60, "side_a": 5}
- 解三角形：{"mode": "solve_triangle", "angle_A": 30, "angle_B": 60, "side_a": 5}

注意：solve_triangle 模式目前只支援兩角一邊的情況""",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "mode": {"type": "string", "enum": ["find_angle", "find_side", "solve_triangle"], "description": "模式：求角、求邊或解三角形"},
                        "side_a": {"type": "number", "description": "邊 a 的長度"},
                        "side_b": {"type": "number", "description": "邊 b 的長度"},
                        "side_c": {"type": "number", "description": "邊 c 的長度"},
                        "angle_A": {"type": "number", "description": "角 A 的度數"},
                        "angle_B": {"type": "number", "description": "角 B 的度數"},
                        "angle_C": {"type": "number", "description": "角 C 的度數"},
                        "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees", "description": "單位：度數或弧度"},
                        "detail": {"type": "string", "enum": ["short", "full"], "default": "full", "description": "詳細程度"}
                    },
                    "required": ["mode"]
                }
            }
        ]
    
    async def call_tool(self, name: str, arguments: Any) -> Dict[str, Any]:
        """调用工具并返回结果"""
        try:
            # 驗證並規範化參數（防止 AI 模型錯誤地發送 schema 或字符串）
            arguments = self._validate_arguments(arguments)
            
            # 根据工具名称调用对应的函数
            if name == "algebra_solve":
                result = solve_equation(
                    arguments["eq"],
                    var=arguments.get("var", "x"),
                    detail=arguments.get("detail", "full")
                )
            elif name == "algebra_simplify":
                result = simplify_expression(
                    arguments["expr"],
                    detail=arguments.get("detail", "short")
                )
            elif name == "algebra_expand":
                result = expand_expression(
                    arguments["expr"],
                    detail=arguments.get("detail", "short")
                )
            elif name == "algebra_factor":
                result = factor_expression(
                    arguments["expr"],
                    detail=arguments.get("detail", "short")
                )
            elif name == "algebra_inequality":
                result = solve_inequality(
                    arguments["ineq"],
                    var=arguments.get("var", "x"),
                    detail=arguments.get("detail", "full")
                )
            elif name == "arithmetic_fraction":
                # 轉換參數為數字類型
                a = float(arguments["a"])
                b = float(arguments["b"])
                result = fraction_operation(
                    a,
                    b,
                    arguments["op"],
                    detail=arguments.get("detail", "full")
                )
            elif name == "arithmetic_percent":
                # 轉換參數為數字類型
                base = float(arguments["base"])
                rate = float(arguments["rate"])
                result = percent_calculation(
                    base,
                    rate,
                    arguments["mode"]
                )
            elif name == "geometry_pythagoras":
                # 檢查必需參數
                if "known" not in arguments:
                    raise ValueError(
                        "缺少必需參數 'known'。"
                        "geometry_pythagoras 需要的參數：\n"
                        "  - known: 'legs' 或 'hypotenuse'（必需）\n"
                        "  - a, b: 直角邊（當 known='legs' 時需要）\n"
                        "  - c, a 或 c, b: 斜邊和一直角邊（當 known='hypotenuse' 時需要）\n"
                        f"收到的參數：{list(arguments.keys())}"
                    )
                
                # 轉換參數為數字類型
                a = float(arguments["a"]) if arguments.get("a") is not None else None
                b = float(arguments["b"]) if arguments.get("b") is not None else None
                c = float(arguments["c"]) if arguments.get("c") is not None else None
                result = pythagoras_theorem(
                    arguments["known"],
                    a=a,
                    b=b,
                    c=c,
                    detail=arguments.get("detail", "full")
                )
            elif name == "geometry_circle_angles":
                # 檢查必需參數
                if "query" not in arguments:
                    raise ValueError(
                        "缺少必需參數 'query'。"
                        "geometry_circle_angles 需要的參數：\n"
                        "  - query: 'center' 或 'inscribed'（必需）\n"
                        "  - center_angle: 圓心角度數（當 query='inscribed' 時需要）\n"
                        "  - inscribed_angle: 圓周角度數（當 query='center' 時需要）\n"
                        f"收到的參數：{list(arguments.keys())}"
                    )
                
                # 轉換參數為數字類型
                center_angle = float(arguments["center_angle"]) if arguments.get("center_angle") is not None else None
                inscribed_angle = float(arguments["inscribed_angle"]) if arguments.get("inscribed_angle") is not None else None
                result = circle_angles(
                    center_angle=center_angle,
                    inscribed_angle=inscribed_angle,
                    query=arguments["query"]
                )
            elif name == "geometry_similar_triangles":
                # 簡化版相似三角形：直接計算相似比和結果
                side1_length = float(arguments["side1_length"])
                side2_length = float(arguments["side2_length"])
                known_length = float(arguments["known_side_length"])
                
                # 計算相似比
                scale_k = side2_length / side1_length
                # 計算結果
                result_length = known_length * scale_k
                
                from .core.schema import Step, Result, Display, Meta, SuccessResponse
                
                steps = [
                    Step(
                        op="ratio",
                        input=f"{arguments['side2_name']}/{arguments['side1_name']} = {side2_length}/{side1_length}",
                        out=f"相似比 k = {scale_k}",
                        note="計算相似比"
                    ),
                    Step(
                        op="apply_ratio",
                        input=f"{arguments['query_side_name']} = {arguments['known_side_name']} × k",
                        out=f"{arguments['query_side_name']} = {known_length} × {scale_k} = {result_length}",
                        note="應用相似比"
                    )
                ]
                
                result = SuccessResponse(
                    task="geometry.similar",
                    result=Result(
                        exact=f"{arguments['query_side_name']} = {result_length}",
                        approx=result_length
                    ),
                    steps=steps,
                    display=Display(
                        latex=f"{arguments['query_side_name']} = {result_length}",
                        latex_steps=[step.out for step in steps]
                    ),
                    meta=Meta(
                        method="similar_triangles",
                        strategy_hints=["計算相似比", "應用比例求未知邊"],
                        scale_k=scale_k
                    )
                )
            elif name == "combinatorics_ncr":
                # 轉換參數為整數類型
                n = int(arguments["n"])
                r = int(arguments["r"])
                result = combination(n, r)
            elif name == "combinatorics_npr":
                # 轉換參數為整數類型
                n = int(arguments["n"])
                r = int(arguments["r"])
                result = permutation(n, r)
            elif name == "eval_numeric":
                expr = parse_expression(arguments["expr"])
                result_val = float(expr.evalf(arguments.get("precision", 10)))
                
                from .core.schema import Step, Result, Display, Meta, SuccessResponse
                from .core.latex import to_latex
                
                result = SuccessResponse(
                    task="eval.numeric",
                    result=Result(exact=str(expr), approx=result_val),
                    steps=[Step(op="eval", input=arguments["expr"], out=str(result_val), note="数值计算")],
                    display=Display(latex=to_latex(expr)),
                    meta=Meta(method="numeric_eval")
                )
            elif name == "trigonometry_sine":
                # 檢查必需參數
                if "mode" not in arguments:
                    raise ValueError(
                        "缺少必需參數 'mode'。"
                        "trigonometry_sine 需要的參數：\n"
                        "  - mode: 'sin' 或 'arcsin'（必需）\n"
                        "  - opposite, hypotenuse: 對邊和斜邊（sin 模式需要）\n"
                        "  - value: 正弦值（arcsin 模式需要）\n"
                        "  - unit: 'degrees' 或 'radians'（可選，默認 'degrees'）\n"
                        "  - detail: 'short' 或 'full'（可選，默認 'full'）\n"
                        f"收到的參數：{list(arguments.keys())}"
                    )
                
                result = trigonometry_sine(arguments)
            elif name == "trigonometry_cosine":
                # 檢查必需參數
                if "mode" not in arguments:
                    raise ValueError(
                        "缺少必需參數 'mode'。"
                        "trigonometry_cosine 需要的參數：\n"
                        "  - mode: 'cos' 或 'arccos'（必需）\n"
                        "  - adjacent, hypotenuse: 鄰邊和斜邊（cos 模式需要）\n"
                        "  - value: 餘弦值（arccos 模式需要）\n"
                        "  - unit: 'degrees' 或 'radians'（可選，默認 'degrees'）\n"
                        "  - detail: 'short' 或 'full'（可選，默認 'full'）\n"
                        f"收到的參數：{list(arguments.keys())}"
                    )
                
                result = trigonometry_cosine(arguments)
            elif name == "trigonometry_tangent":
                # 檢查必需參數
                if "mode" not in arguments:
                    raise ValueError(
                        "缺少必需參數 'mode'。"
                        "trigonometry_tangent 需要的參數：\n"
                        "  - mode: 'tan' 或 'arctan'（必需）\n"
                        "  - opposite, adjacent: 對邊和鄰邊（tan 模式需要）\n"
                        "  - value: 正切值（arctan 模式需要）\n"
                        "  - unit: 'degrees' 或 'radians'（可選，默認 'degrees'）\n"
                        "  - detail: 'short' 或 'full'（可選，默認 'full'）\n"
                        f"收到的參數：{list(arguments.keys())}"
                    )
                
                result = trigonometry_tangent(arguments)
            elif name == "trigonometry_law_of_sines":
                # 檢查必需參數
                if "mode" not in arguments:
                    raise ValueError(
                        "缺少必需參數 'mode'。"
                        "trigonometry_law_of_sines 需要的參數：\n"
                        "  - mode: 'find_angle', 'find_side' 或 'solve_triangle'（必需）\n"
                        "  - side_a, side_b, side_c: 邊長（根據模式需要）\n"
                        "  - angle_A, angle_B, angle_C: 角度（根據模式需要）\n"
                        "  - unit: 'degrees' 或 'radians'（可選，默認 'degrees'）\n"
                        "  - detail: 'short' 或 'full'（可選，默認 'full'）\n"
                        f"收到的參數：{list(arguments.keys())}"
                    )
                
                result = trigonometry_law_of_sines(arguments)
            else:
                raise ValueError(f"未知工具: {name}")
            
            # 转换为 MCP 响应格式
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result.model_dump(by_alias=True), ensure_ascii=False, indent=2)
                    }
                ]
            }
            
        except Exception as e:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({
                            "error": str(e),
                            "traceback": traceback.format_exc()
                        }, ensure_ascii=False)
                    }
                ],
                "isError": True
            }
    
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """处理 MCP 请求"""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")
        
        try:
            if method == "initialize":
                # 初始化握手
                response = {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {
                        "name": self.name,
                        "version": self.version
                    },
                    "capabilities": {
                        "tools": {},
                        "prompts": {}
                    }
                }
            
            elif method == "prompts/list":
                # 列出所有可用提示詞
                response = {
                    "prompts": self.prompts
                }
            
            elif method == "prompts/get":
                # 獲取提示詞內容
                prompt_name = params.get("name")
                if prompt_name == "math_tool_guide":
                    response = {
                        "messages": [
                            {
                                "role": "user",
                                "content": {
                                    "type": "text",
                                    "text": """# 數學工具選擇指南

## 幾何問題
- **直角三角形求邊長** → 使用 `geometry_pythagoras`（勾股定理 a²+b²=c²）
- **相似三角形、對應三角形求邊長** → 使用 `geometry_similar_triangles`
  - 關鍵詞：「相似」、「對應」、「△ABC與△A'B'C'」、「成比例」
- **圓心角與圓周角** → 使用 `geometry_circle_angles`

## 三角學問題
- **正弦值計算** → 使用 `trigonometry_sine`
  - 關鍵詞：「sin θ」、「對邊」、「斜邊」、「正弦」
  - 例如：直角三角形對邊3，斜邊5，求 sin θ
- **餘弦值計算** → 使用 `trigonometry_cosine`
  - 關鍵詞：「cos θ」、「鄰邊」、「斜邊」、「餘弦」
  - 例如：直角三角形鄰邊4，斜邊5，求 cos θ
- **正切值計算** → 使用 `trigonometry_tangent`
  - 關鍵詞：「tan θ」、「對邊」、「鄰邊」、「正切」
  - 例如：直角三角形對邊3，鄰邊4，求 tan θ
- **角度求解** → 使用對應的反函數工具
  - arcsin：`trigonometry_sine`（arcsin 模式）
  - arccos：`trigonometry_cosine`（arccos 模式）
  - arctan：`trigonometry_tangent`（arctan 模式）
- **正弦定理** → 使用 `trigonometry_law_of_sines`
  - 關鍵詞：「正弦定理」、「非直角三角形」、「a/sin(A) = b/sin(B)」
  - 例如：已知兩角一邊，求其他邊或角

## 代數問題
- **解方程（求未知數）** → 使用 `algebra_solve`
- **展開括號** → 使用 `algebra_expand`
- **因式分解** → 使用 `algebra_factor`
- **化簡表達式** → 使用 `algebra_simplify`

## 排列組合
- **選擇但不排序（組合）** → 使用 `combinatorics_ncr`
  - 例如：從8個人中選3個人
- **選擇並排序（排列）** → 使用 `combinatorics_npr`
  - 例如：8個人選3個排成一列

## 算術
- **分數運算** → 使用 `arithmetic_fraction`
- **百分比增減** → 使用 `arithmetic_percent`
- **數值計算** → 使用 `eval_numeric`

## 重要提醒
⚠️ 看到「△ABC與△A'B'C'對應」這樣的描述，這是**相似三角形問題**，不是排列組合！
⚠️ 排列組合只用於計數問題（多少種方法、多少種選擇），不用於幾何計算！
"""
                                }
                            }
                        ]
                    }
                else:
                    raise ValueError(f"未知提示詞: {prompt_name}")
            
            elif method == "tools/list":
                # 列出所有工具
                response = {
                    "tools": self.tools
                }
            
            elif method == "tools/call":
                # 调用工具
                tool_name = params.get("name")
                arguments = params.get("arguments", {})
                response = await self.call_tool(tool_name, arguments)
            
            else:
                response = {
                    "error": {
                        "code": -32601,
                        "message": f"未知方法: {method}"
                    }
                }
            
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": response
            }
            
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32603,
                    "message": str(e),
                    "data": traceback.format_exc()
                }
            }
    
    async def run(self):
        """运行 MCP 服务器（stdio 通信）"""
        while True:
            try:
                # 从 stdin 读取一行
                line = await asyncio.get_event_loop().run_in_executor(
                    None, sys.stdin.readline
                )
                
                if not line:
                    break
                
                # 解析 JSON-RPC 请求
                request = json.loads(line.strip())
                
                # 处理请求
                response = await self.handle_request(request)
                
                # 写入 stdout
                sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
                sys.stdout.flush()
                
            except json.JSONDecodeError as e:
                # JSON 解析错误
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32700,
                        "message": f"JSON 解析错误: {str(e)}"
                    }
                }
                sys.stdout.write(json.dumps(error_response) + "\n")
                sys.stdout.flush()
            
            except Exception as e:
                # 其他错误
                sys.stderr.write(f"服务器错误: {str(e)}\n")
                sys.stderr.write(traceback.format_exc())
                sys.stderr.flush()


async def main():
    """主函数"""
    server = MCPServer()
    await server.run()


if __name__ == "__main__":
    asyncio.run(main())


