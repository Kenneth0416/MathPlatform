# 三角學工具擴充指南 📐

## 📋 概述

本文檔提供三角學工具的後續擴充建議，幫助開發者進一步完善 MCP 數學服務的三角學功能，以更好地支援 DSE 數學大綱。

## 🎯 當前實現

### 已完成的工具
- **`trigonometry_sine`**：正弦函數計算與角度求解
  - sin 模式：已知對邊和斜邊，計算正弦值
  - arcsin 模式：已知正弦值，求角度
  - 支援度數/弧度轉換

## 🚀 建議擴充工具

### 1. 餘弦函數工具

#### 1.1 `trigonometry_cosine`
```json
{
  "name": "trigonometry_cosine",
  "description": "餘弦函數計算與角度求解",
  "parameters": {
    "mode": {"type": "string", "enum": ["cos", "arccos"]},
    "adjacent": {"type": "number", "description": "鄰邊長度（cos 模式必填）"},
    "hypotenuse": {"type": "number", "description": "斜邊長度（cos 模式必填）"},
    "value": {"type": "number", "description": "餘弦值（arccos 模式必填，-1 到 1）"},
    "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees"},
    "detail": {"type": "string", "enum": ["short", "full"], "default": "full"}
  }
}
```

**使用場景**：
- cos 模式：已知鄰邊和斜邊，計算餘弦值
- arccos 模式：已知餘弦值，求角度

**DSE 應用**：
- 直角三角形：cos θ = 鄰邊/斜邊
- 特殊角度：cos(60°) = 0.5
- 向量計算：兩向量夾角的餘弦值

### 2. 正切函數工具

#### 2.1 `trigonometry_tangent`
```json
{
  "name": "trigonometry_tangent",
  "description": "正切函數計算與角度求解",
  "parameters": {
    "mode": {"type": "string", "enum": ["tan", "arctan"]},
    "opposite": {"type": "number", "description": "對邊長度（tan 模式必填）"},
    "adjacent": {"type": "number", "description": "鄰邊長度（tan 模式必填）"},
    "value": {"type": "number", "description": "正切值（arctan 模式必填）"},
    "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees"},
    "detail": {"type": "string", "enum": ["short", "full"], "default": "full"}
  }
}
```

**使用場景**：
- tan 模式：已知對邊和鄰邊，計算正切值
- arctan 模式：已知正切值，求角度

**DSE 應用**：
- 直角三角形：tan θ = 對邊/鄰邊
- 特殊角度：tan(45°) = 1
- 斜率計算：直線斜率 = tan(傾斜角)

### 3. 正弦定理工具

#### 3.1 `trigonometry_law_of_sines`
```json
{
  "name": "trigonometry_law_of_sines",
  "description": "正弦定理計算 - a/sin(A) = b/sin(B) = c/sin(C)",
  "parameters": {
    "mode": {"type": "string", "enum": ["find_angle", "find_side", "solve_triangle"]},
    "side_a": {"type": "number", "description": "邊 a 的長度"},
    "side_b": {"type": "number", "description": "邊 b 的長度"},
    "side_c": {"type": "number", "description": "邊 c 的長度"},
    "angle_A": {"type": "number", "description": "角 A 的度數"},
    "angle_B": {"type": "number", "description": "角 B 的度數"},
    "angle_C": {"type": "number", "description": "角 C 的度數"},
    "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees"},
    "detail": {"type": "string", "enum": ["short", "full"], "default": "full"}
  }
}
```

**使用場景**：
- 已知兩邊一角，求另一角
- 已知兩角一邊，求另一邊
- 解三角形（已知部分信息，求其他信息）

**DSE 應用**：
- 非直角三角形求解
- 三角測量問題
- 向量問題

### 4. 餘弦定理工具

#### 4.1 `trigonometry_law_of_cosines`
```json
{
  "name": "trigonometry_law_of_cosines",
  "description": "餘弦定理計算 - c² = a² + b² - 2ab cos(C)",
  "parameters": {
    "mode": {"type": "string", "enum": ["find_side", "find_angle"]},
    "side_a": {"type": "number", "description": "邊 a 的長度"},
    "side_b": {"type": "number", "description": "邊 b 的長度"},
    "side_c": {"type": "number", "description": "邊 c 的長度"},
    "angle_C": {"type": "number", "description": "角 C 的度數"},
    "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees"},
    "detail": {"type": "string", "enum": ["short", "full"], "default": "full"}
  }
}
```

**使用場景**：
- 已知兩邊夾角，求第三邊
- 已知三邊，求夾角

**DSE 應用**：
- 非直角三角形求解
- 向量夾角計算
- 距離計算

### 5. 三角恆等式工具

#### 5.1 `trigonometry_identities`
```json
{
  "name": "trigonometry_identities",
  "description": "三角恆等式化簡與驗證",
  "parameters": {
    "mode": {"type": "string", "enum": ["simplify", "verify", "expand"]},
    "expression": {"type": "string", "description": "三角表達式"},
    "target": {"type": "string", "description": "目標形式（verify 模式）"},
    "detail": {"type": "string", "enum": ["short", "full"], "default": "full"}
  }
}
```

**支援的恆等式**：
- 基本恆等式：sin²θ + cos²θ = 1
- 和角公式：sin(A±B), cos(A±B), tan(A±B)
- 倍角公式：sin(2θ), cos(2θ), tan(2θ)
- 半角公式：sin(θ/2), cos(θ/2), tan(θ/2)

### 6. 三角方程求解工具

#### 6.1 `trigonometry_solve_equation`
```json
{
  "name": "trigonometry_solve_equation",
  "description": "三角方程求解",
  "parameters": {
    "equation": {"type": "string", "description": "三角方程，如 'sin(x) = 0.5'"},
    "variable": {"type": "string", "default": "x", "description": "變量名"},
    "domain": {"type": "string", "default": "[0, 2π]", "description": "求解域"},
    "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees"},
    "detail": {"type": "string", "enum": ["short", "full"], "default": "full"}
  }
}
```

**支援的方程類型**：
- 基本三角方程：sin(x) = a, cos(x) = a, tan(x) = a
- 複合三角方程：sin(2x) = cos(x)
- 三角恆等式方程：sin²(x) + cos(x) = 1

## 🎯 實現優先級

### 高優先級（DSE 核心內容）
1. **`trigonometry_cosine`** - 餘弦函數
2. **`trigonometry_tangent`** - 正切函數
3. **`trigonometry_law_of_sines`** - 正弦定理

### 中優先級（DSE 重要內容）
4. **`trigonometry_law_of_cosines`** - 餘弦定理
5. **`trigonometry_identities`** - 三角恆等式

### 低優先級（進階內容）
6. **`trigonometry_solve_equation`** - 三角方程求解

## 🔧 實現建議

### 1. 代碼結構
```python
# 建議的文件結構
mcp_math/core/
├── trigonometry.py          # 當前實現
├── trigonometry_extended.py # 擴充工具
└── trigonometry_utils.py    # 共用工具函數
```

### 2. 共用工具函數
```python
def validate_angle_range(angle, unit="degrees"):
    """驗證角度範圍"""
    if unit == "degrees":
        return -360 <= angle <= 360
    else:  # radians
        return -2 * math.pi <= angle <= 2 * math.pi

def convert_angle(angle, from_unit, to_unit):
    """角度單位轉換"""
    if from_unit == to_unit:
        return angle
    elif from_unit == "degrees" and to_unit == "radians":
        return math.radians(angle)
    elif from_unit == "radians" and to_unit == "degrees":
        return math.degrees(angle)

def format_angle_result(angle, unit):
    """格式化角度結果"""
    if unit == "degrees":
        return f"{angle:.2f}°"
    else:
        return f"{angle:.6f} 弧度"
```

### 3. 錯誤處理標準化
```python
class TrigonometryError(Exception):
    """三角學計算錯誤"""
    pass

class InvalidAngleError(TrigonometryError):
    """無效角度錯誤"""
    pass

class InvalidSideError(TrigonometryError):
    """無效邊長錯誤"""
    pass
```

### 4. 測試策略
```python
# 測試案例結構
test_cases = {
    "basic_functions": [
        # 基本三角函數測試
    ],
    "special_angles": [
        # 特殊角度測試 (30°, 45°, 60°, 90°)
    ],
    "dse_problems": [
        # DSE 風格問題測試
    ],
    "edge_cases": [
        # 邊界情況測試
    ],
    "error_handling": [
        # 錯誤處理測試
    ]
}
```

## 📚 DSE 數學大綱對應

### 必修部分
- **基本三角比**：sin, cos, tan 的定義和計算
- **特殊角度**：30°, 45°, 60°, 90° 的三角比值
- **正弦定理**：解三角形
- **餘弦定理**：解三角形
- **三角恆等式**：基本恆等式和和角公式

### 選修部分
- **三角方程**：基本三角方程求解
- **三角函數圖像**：週期性和對稱性
- **複合角公式**：和角、差角、倍角公式

## 🎯 整合建議

### 1. 工具命名規範
- 保持 `trigonometry_` 前綴
- 使用描述性名稱：`trigonometry_cosine`, `trigonometry_law_of_sines`
- 避免縮寫，確保可讀性

### 2. 參數標準化
- 統一使用 `unit` 參數（degrees/radians）
- 統一使用 `detail` 參數（short/full）
- 角度參數命名：`angle_A`, `angle_B`, `angle_C`
- 邊長參數命名：`side_a`, `side_b`, `side_c`

### 3. 響應格式統一
- 使用相同的 `SuccessResponse` 結構
- 統一的錯誤處理格式
- 一致的 LaTeX 輸出格式

### 4. 文檔更新
- 更新 `DEVELOPER_GUIDE.md`
- 更新工具選擇決策樹
- 添加 DSE 風格示例
- 更新提示詞模板

## 🧪 測試重點

### 1. 特殊角度測試
```python
special_angles = {
    0: {"sin": 0, "cos": 1, "tan": 0},
    30: {"sin": 0.5, "cos": 0.866, "tan": 0.577},
    45: {"sin": 0.707, "cos": 0.707, "tan": 1},
    60: {"sin": 0.866, "cos": 0.5, "tan": 1.732},
    90: {"sin": 1, "cos": 0, "tan": "undefined"}
}
```

### 2. DSE 風格問題
```python
dse_problems = [
    "在直角三角形ABC中，∠C=90°，AC=3，BC=4，求sin A",
    "若sin θ = 0.6，求θ的值",
    "在△ABC中，a=5，b=7，∠C=60°，求c的長度",
    "證明：sin²θ + cos²θ = 1"
]
```

### 3. 錯誤處理測試
```python
error_cases = [
    {"input": {"mode": "sin", "opposite": -3, "hypotenuse": 5}, "expected": "ValueError"},
    {"input": {"mode": "arcsin", "value": 1.5}, "expected": "ValueError"},
    {"input": {"mode": "sin", "opposite": 6, "hypotenuse": 5}, "expected": "ValueError"}
]
```

## 📝 總結

通過系統性地擴充三角學工具，可以：

1. **完善 DSE 覆蓋**：支援完整的三角學內容
2. **提升用戶體驗**：提供專業的三角學計算工具
3. **增強系統能力**：從基本三角比到複雜的三角方程求解
4. **保持一致性**：統一的接口設計和錯誤處理

建議按照優先級逐步實現，先完成核心功能，再擴充進階功能。每個工具都應該包含完整的測試案例和文檔說明。

