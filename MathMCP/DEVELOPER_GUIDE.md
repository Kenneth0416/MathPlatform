# MCP數學服務開發者指南 🚀

## 📋 概述

本指南專為開發者設計，展示如何充分利用MCP數學服務的17個專業工具，以及如何設計有效的提示詞來提升AI模型的數學問題解決能力。

## 🎯 核心價值

- **17個專業數學工具**：覆蓋代數、幾何、算術、組合數學、三角學
- **智能工具選擇**：通過提示詞引導AI選擇正確的工具
- **詳細步驟生成**：每個計算都提供完整的解題步驟
- **Unicode支持**：自動處理各種數學符號
- **安全解析**：白名單過濾，防止代碼注入

---

## 🛠️ 工具功能詳解

### 1. 代數工具 (6個)

#### 1.1 `algebra_solve` - 方程求解 ⭐
```json
{
  "name": "algebra_solve",
  "description": "解方程（一元方程求解）",
  "parameters": {
    "eq": {"type": "string", "description": "方程字符串，如 '2*x+3=11'"},
    "var": {"type": "string", "description": "變量名，默認 'x'"},
    "method": {"type": "string", "enum": ["auto", "quadratic_formula", "factor"]},
    "detail": {"type": "string", "enum": ["short", "full"]}
  }
}
```

**支持的方程類型**：
- 一元一次方程：`2*x + 3 = 11`
- 一元二次方程：`x^2 - 5*x + 6 = 0`
- 高次多項式方程：`x^3 - 8 = 0`

**提示詞設計要點**：
```
⚠️ 重要：分式方程需要先使用 algebra_simplify 化簡！
- 複雜分式方程：(x-1)/(x+2) = 1 → 先用 simplify，再 solve
- 簡單方程：直接使用 solve
```

#### 1.2 `algebra_inequality` - 不等式求解 ⭐⭐
```json
{
  "name": "algebra_inequality",
  "description": "求解不等式",
  "parameters": {
    "ineq": {"type": "string", "description": "不等式字符串，如 '2*x+3 >= 5'"},
    "var": {"type": "string", "description": "變量名，默認 'x'"}
  }
}
```

**支持的不等式類型**：
- 線性不等式：`2*x + 3 >= 5`
- 二次不等式：`x^2 - 4 > 0`
- 分式不等式：`(x-1)/(x+2) > 0`

#### 1.3 `algebra_simplify` - 表達式化簡
```json
{
  "name": "algebra_simplify",
  "description": "化簡數學表達式",
  "parameters": {
    "expr": {"type": "string", "description": "表達式字符串"}
  }
}
```

**提示詞設計要點**：
```
適用場景：
- 分式方程前置處理：(x-1)/(x+2) - (2x+3)/(x-2) → 先simplify
- 複雜表達式化簡：2*x + 3*x → 5*x
- 根式化簡：√(x²) → |x|
```

#### 1.4 `algebra_expand` - 表達式展開
```json
{
  "name": "algebra_expand",
  "description": "展開表達式",
  "parameters": {
    "expr": {"type": "string", "description": "表達式字符串"}
  }
}
```

#### 1.5 `algebra_factor` - 因式分解
```json
{
  "name": "algebra_factor",
  "description": "因式分解",
  "parameters": {
    "expr": {"type": "string", "description": "表達式字符串"}
  }
}
```

#### 1.6 `eval_numeric` - 數值計算
```json
{
  "name": "eval_numeric",
  "description": "安全數值計算",
  "parameters": {
    "expr": {"type": "string", "description": "數值表達式"}
  }
}
```

### 2. 幾何工具 (3個)

#### 2.1 `geometry_pythagoras` - 勾股定理 ⭐
```json
{
  "name": "geometry_pythagoras",
  "description": "勾股定理計算",
  "parameters": {
    "known": {"type": "string", "enum": ["legs", "hypotenuse"]},
    "a": {"type": "number", "description": "直角邊a"},
    "b": {"type": "number", "description": "直角邊b"},
    "c": {"type": "number", "description": "斜邊c"}
  }
}
```

**提示詞設計要點**：
```
決策邏輯：
- 已知兩直角邊求斜邊 → known: "legs", 提供 a, b
- 已知斜邊和一直角邊 → known: "hypotenuse", 提供 c 和 a 或 b
```

#### 2.2 `geometry_similar_triangles` - 相似三角形 ⭐⭐
```json
{
  "name": "geometry_similar_triangles",
  "description": "相似三角形比例計算",
  "parameters": {
    "side1_name": {"type": "string", "description": "第一個邊名"},
    "side1_length": {"type": "number", "description": "第一個邊長"},
    "side2_name": {"type": "string", "description": "第二個邊名"},
    "side2_length": {"type": "number", "description": "第二個邊長"},
    "known_side_name": {"type": "string", "description": "已知邊名"},
    "known_side_length": {"type": "number", "description": "已知邊長"},
    "query_side_name": {"type": "string", "description": "要求解的邊名"}
  }
}
```

**提示詞設計要點**：
```
⚠️ 重要：不要與排列組合工具混淆！
- 看到三角形符號 △ → 使用相似三角形工具
- 看到「對應」、「成比例」→ 相似三角形
- 不要使用 combinatorics_npr/ncr
```

#### 2.3 `geometry_circle_angles` - 圓角度計算
```json
{
  "name": "geometry_circle_angles",
  "description": "圓心角與圓周角計算",
  "parameters": {
    "query": {"type": "string", "enum": ["inscribed", "center"]},
    "center_angle": {"type": "number", "description": "圓心角度數"},
    "inscribed_angle": {"type": "number", "description": "圓周角度數"}
  }
}
```

### 2.4 三角學工具 (4個) ⭐⭐

#### 2.4.1 `trigonometry_sine` - 正弦函數計算
```json
{
  "name": "trigonometry_sine",
  "description": "三角函數正弦計算與角度求解",
  "parameters": {
    "mode": {"type": "string", "enum": ["sin", "arcsin"]},
    "opposite": {"type": "number", "description": "對邊長度（sin 模式必填）"},
    "hypotenuse": {"type": "number", "description": "斜邊長度（sin 模式必填）"},
    "value": {"type": "number", "description": "正弦值（arcsin 模式必填，-1 到 1）"},
    "unit": {"type": "string", "enum": ["degrees", "radians"], "default": "degrees"},
    "detail": {"type": "string", "enum": ["short", "full"], "default": "full"}
  }
}
```

**支持的計算類型**：
- **sin 模式**：已知對邊和斜邊，計算正弦值
  - 例如：直角三角形對邊=3，斜邊=5，求 sin θ = 0.6
- **arcsin 模式**：已知正弦值，求角度
  - 例如：sin θ = 0.6，求 θ = 36.87°

**提示詞設計要點**：
```
決策邏輯：
- 看到「sin θ」、「對邊」、「斜邊」→ mode: "sin"
- 看到「arcsin」、「反正弦」、「已知正弦值求角度」→ mode: "arcsin"
- 單位選擇：DSE 考試通常使用度數（degrees）

DSE 常見題型：
- 直角三角形求正弦值：對邊3，斜邊5 → sin θ = 0.6
- 特殊角度：sin θ = 0.5 → θ = 30°
- 弧度轉換：sin θ = 0.5，unit: "radians" → θ = π/6
```

#### 2.4.2 `trigonometry_cosine` - 餘弦函數計算
```json
{
  "name": "trigonometry_cosine",
  "description": "三角函數餘弦計算與角度求解",
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

**支持的計算類型**：
- **cos 模式**：已知鄰邊和斜邊，計算餘弦值
  - 例如：直角三角形鄰邊=4，斜邊=5，求 cos θ = 0.8
- **arccos 模式**：已知餘弦值，求角度
  - 例如：cos θ = 0.8，求 θ = 36.87°

#### 2.4.3 `trigonometry_tangent` - 正切函數計算
```json
{
  "name": "trigonometry_tangent",
  "description": "三角函數正切計算與角度求解",
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

**支持的計算類型**：
- **tan 模式**：已知對邊和鄰邊，計算正切值
  - 例如：直角三角形對邊=3，鄰邊=4，求 tan θ = 0.75
- **arctan 模式**：已知正切值，求角度
  - 例如：tan θ = 0.75，求 θ = 36.87°

#### 2.4.4 `trigonometry_law_of_sines` - 正弦定理計算
```json
{
  "name": "trigonometry_law_of_sines",
  "description": "正弦定理計算 - 解非直角三角形問題",
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

**支持的計算類型**：
- **find_angle 模式**：已知兩邊一角，求另一角
  - 例如：a=5, b=8.66, A=30°，求角B
- **find_side 模式**：已知兩角一邊，求另一邊
  - 例如：A=30°, B=60°, a=5，求邊b
- **solve_triangle 模式**：已知兩角一邊，求其他所有信息
  - 例如：A=30°, B=60°, a=5，求C、b、c

### 3. 組合數學工具 (2個)

#### 3.1 `combinatorics_ncr` - 組合數
```json
{
  "name": "combinatorics_ncr",
  "description": "組合數計算 C(n,r)",
  "parameters": {
    "n": {"type": "number", "description": "總數"},
    "r": {"type": "number", "description": "選擇數"}
  }
}
```

#### 3.2 `combinatorics_npr` - 排列數
```json
{
  "name": "combinatorics_npr",
  "description": "排列數計算 P(n,r)",
  "parameters": {
    "n": {"type": "number", "description": "總數"},
    "r": {"type": "number", "description": "選擇數"}
  }
}
```

**提示詞設計要點**：
```
選擇邏輯：
- 組合（不排序）：8人選3人委員會 → combinatorics_ncr
- 排列（排序）：8人選3人排成一列 → combinatorics_npr
- 看到「多少種方法」→ 判斷是否需要排序
```

### 4. 算術工具 (2個)

#### 4.1 `arithmetic_fraction` - 分數運算
```json
{
  "name": "arithmetic_fraction",
  "description": "分數四則運算",
  "parameters": {
    "a": {"type": "string", "description": "第一個分數"},
    "b": {"type": "string", "description": "第二個分數"},
    "op": {"type": "string", "enum": ["+", "-", "*", "/"]}
  }
}
```

#### 4.2 `arithmetic_percent` - 百分比計算
```json
{
  "name": "arithmetic_percent",
  "description": "百分比增減計算",
  "parameters": {
    "base": {"type": "number", "description": "基數"},
    "rate": {"type": "number", "description": "百分比率"},
    "mode": {"type": "string", "enum": ["increase", "decrease"]}
  }
}
```

---

## 🎯 提示詞設計策略

### 1. 工具選擇決策樹

```
問題分析流程：
├─ 包含不等號 (≥,≤,>,<)? → algebra_inequality
├─ 包含三角形符號 △? → geometry_similar_triangles
├─ 直角三角形相關? → geometry_pythagoras
├─ 圓心角/圓周角? → geometry_circle_angles
├─ 三角函數相關? → 三角學工具
│  ├─ 正弦函數(sin/arcsin) → trigonometry_sine
│  ├─ 餘弦函數(cos/arccos) → trigonometry_cosine
│  ├─ 正切函數(tan/arctan) → trigonometry_tangent
│  └─ 正弦定理 → trigonometry_law_of_sines
├─ 分式方程? → algebra_simplify → algebra_solve
├─ 簡單方程? → algebra_solve
├─ 多少種方法（不排序）? → combinatorics_ncr
├─ 多少種方法（排序）? → combinatorics_npr
├─ 分數運算? → arithmetic_fraction
├─ 百分比? → arithmetic_percent
└─ 其他代數? → algebra_expand/factor/simplify
```

### 2. 關鍵陷阱識別

#### 陷阱1：相似三角形 ≠ 排列組合
```
❌ 錯誤：△ABC與△A'B'C'對應 → combinatorics_npr
✅ 正確：△ABC與△A'B'C'對應 → geometry_similar_triangles
```

#### 陷阱2：分式方程處理
```
❌ 錯誤：(x-1)/(x+2) = 1 → 直接 algebra_solve
✅ 正確：(x-1)/(x+2) = 1 → algebra_simplify → 手動處理
```

#### 陷阱3：不等式 vs 方程
```
❌ 錯誤：2x + 3 >= 5 → algebra_solve
✅ 正確：2x + 3 >= 5 → algebra_inequality
```

### 3. 工作流程指導

#### 分式方程處理流程
```
1. 識別分式方程 → 使用 algebra_simplify
2. 化簡得到多項式 → 檢查是否可進一步求解
3. 如需要 → 使用 algebra_solve 或手動處理
4. 檢驗分母條件 → 排除無效解
```

#### 幾何問題處理流程
```
1. 識別圖形類型 → 三角形、圓形、其他
2. 確定問題類型 → 邊長、角度、比例
3. 選擇對應工具 → 勾股、相似、圓角度
4. 檢查參數完整性 → 確保所有必要參數
```

---

## 📝 提示詞模板

### 基礎版本（適用所有模型）
```markdown
你是一個數學助手，可以使用以下17個專業數學工具：

代數工具：
- algebra_solve: 解方程
- algebra_inequality: 解不等式  
- algebra_simplify: 化簡表達式
- algebra_expand: 展開表達式
- algebra_factor: 因式分解
- eval_numeric: 數值計算

幾何工具：
- geometry_pythagoras: 勾股定理
- geometry_similar_triangles: 相似三角形
- geometry_circle_angles: 圓角度計算

三角學工具：
- trigonometry_sine: 正弦函數計算與角度求解
- trigonometry_cosine: 餘弦函數計算與角度求解
- trigonometry_tangent: 正切函數計算與角度求解
- trigonometry_law_of_sines: 正弦定理計算

組合數學：
- combinatorics_ncr: 組合數
- combinatorics_npr: 排列數

算術：
- arithmetic_fraction: 分數運算
- arithmetic_percent: 百分比計算

重要提醒：
1. 分式方程先用 algebra_simplify 化簡
2. 看到△符號使用幾何工具，不是排列組合
3. 不等式用 algebra_inequality，不是 algebra_solve
4. 三角函數問題使用對應的專用工具（sin/cos/tan/正弦定理）
```

### 進階版本（適用強模型）
```markdown
# 數學工具使用指南

## 核心原則
1. **工具優先**：優先使用專業工具，而非手動計算
2. **流程正確**：分式方程 → simplify → solve，不要跳步
3. **參數準確**：確保參數格式正確，數值類型匹配

## 決策樹
```
問題包含...
├─ 不等式符號(≥,≤,>,<) → algebra_inequality
├─ △相似/對應 → geometry_similar_triangles  
├─ 直角三角形 → geometry_pythagoras
├─ 圓心角/圓周角 → geometry_circle_angles
├─ 正弦函數(sin/arcsin) → trigonometry_sine
├─ 餘弦函數(cos/arccos) → trigonometry_cosine
├─ 正切函數(tan/arctan) → trigonometry_tangent
├─ 正弦定理 → trigonometry_law_of_sines
├─ 分式方程 → algebra_simplify → 繼續處理
├─ 簡單方程 → algebra_solve
├─ 多少種方法(不排序) → combinatorics_ncr
├─ 多少種方法(排序) → combinatorics_npr
└─ 其他 → 選擇合適的代數工具
```

## 常見錯誤避免
❌ 相似三角形問題用排列組合工具
❌ 分式方程直接求解（會失敗）
❌ 不等式用方程求解工具
❌ 三角函數問題手動計算（應該用對應的專用工具）
❌ 參數類型錯誤（字符串vs數字）

## 工作流程
1. 識別問題類型
2. 選擇正確工具
3. 準備正確參數
4. 執行工具調用
5. 如失敗，嘗試替代方案
```

---

## 🔧 開發者最佳實踐

### 1. 參數驗證
```python
# 確保數值參數正確
def validate_numeric_params(params):
    for key, value in params.items():
        if key in ['a', 'b', 'c', 'n', 'r', 'base', 'rate']:
            if isinstance(value, str):
                params[key] = float(value)  # 自動轉換
```

### 2. 錯誤處理
```python
# 友好的錯誤提示
try:
    result = tool_function(params)
except ValueError as e:
    return {
        "error": f"參數錯誤：{str(e)}",
        "suggestion": "請檢查參數格式，例如：{'eq': '2*x+3=11'}"
    }
```

### 3. 工具組合使用
```python
# 分式方程處理流程
def solve_fractional_equation(eq):
    # 步驟1：化簡
    simplified = algebra_simplify(eq)
    
    # 步驟2：檢查是否可進一步求解
    if is_solvable(simplified):
        return algebra_solve(simplified)
    else:
        return manual_solve(simplified)
```

### 4. Unicode處理
```python
# 自動轉換Unicode符號
unicode_map = {
    '−': '-', '×': '*', '÷': '/', '√': 'sqrt',
    '²': '**2', '³': '**3', '≥': '>=', '≤': '<='
}
```

---

## 📊 性能優化建議

### 1. 工具選擇優化
- 優先使用專用工具而非通用計算
- 避免不必要的工具調用
- 合理使用 detail 參數（short vs full）

### 2. 參數優化
- 使用正確的數據類型
- 避免重複的參數驗證
- 預處理複雜表達式

### 3. 錯誤恢復
- 實現工具調用失敗的替代方案
- 提供清晰的錯誤信息
- 記錄失敗模式以便改進

---

## 🧪 測試策略

### 1. 工具功能測試
```python
test_cases = [
    {"tool": "algebra_solve", "input": {"eq": "2*x+3=11"}, "expected": "x=4"},
    {"tool": "geometry_pythagoras", "input": {"known": "legs", "a": 3, "b": 4}, "expected": "c=5"},
    {"tool": "trigonometry_sine", "input": {"mode": "sin", "opposite": 3, "hypotenuse": 5}, "expected": "sin θ = 0.6"},
    {"tool": "trigonometry_sine", "input": {"mode": "arcsin", "value": 0.5, "unit": "degrees"}, "expected": "θ = 30°"},
    {"tool": "trigonometry_cosine", "input": {"mode": "cos", "adjacent": 4, "hypotenuse": 5}, "expected": "cos θ = 0.8"},
    {"tool": "trigonometry_tangent", "input": {"mode": "tan", "opposite": 3, "adjacent": 4}, "expected": "tan θ = 0.75"},
    {"tool": "trigonometry_law_of_sines", "input": {"mode": "find_side", "angle_A": 30, "angle_B": 60, "side_a": 5}, "expected": "b = 8.66"},
    # ... 更多測試用例
]
```

### 2. 邊界情況測試
- 極值參數
- 無效輸入
- 特殊符號
- Unicode字符

### 3. 集成測試
- 工具組合使用
- 工作流程完整性
- 錯誤恢復能力

---

## 📚 參考資源

### 文檔
- `README.md` - 完整功能說明
- `QUICK_REFERENCE.md` - 快速參考
- `TOOL_WORKFLOW_GUIDE.md` - 工作流程指南

### 示例
- `examples/demo_client.py` - 使用示例
- `examples/curl_examples.sh` - API測試
- `tests/` - 測試套件

### 配置
- `manifests/tool_manifest.json` - 工具清單
- `cherry_studio_prompt_final.txt` - 推薦提示詞

---

## 🎯 總結

MCP數學服務提供了17個專業工具，覆蓋初中到高中的主要數學內容，包括完整的三角學功能。通過合理的提示詞設計和工具選擇策略，可以顯著提升AI模型的數學問題解決能力。

**關鍵成功因素**：
1. 正確的工具選擇
2. 準確的參數準備
3. 合理的工作流程
4. 有效的錯誤處理

**開發建議**：
- 從簡單問題開始測試
- 逐步增加複雜度
- 記錄失敗模式
- 持續優化提示詞

---

*最後更新：2024年10月*
*版本：1.0*
