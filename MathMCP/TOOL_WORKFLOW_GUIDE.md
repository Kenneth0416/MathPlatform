# MCP 數學工具工作流程指南

## 📚 目錄
1. [代數問題工作流程](#代數問題工作流程)
2. [幾何問題工作流程](#幾何問題工作流程)
3. [常見問題類型速查](#常見問題類型速查)
4. [工具組合使用技巧](#工具組合使用技巧)

---

## 代數問題工作流程

### 🎯 問題：解方程

#### 簡單方程（直接解）
```
問題：2x + 3 = 11

工作流程：
1. 直接調用 algebra_solve
   {"eq": "2*x + 3 = 11", "var": "x"}

結果：x = 4 ✓
```

#### 分式方程（需要化簡）
```
問題：(x - 1)/(x + 2) - (2x + 3)/(x - 2) = 1

❌ 錯誤流程（會失敗）：
Step 1: algebra_solve → 失敗（太複雜）

✅ 正確流程：
Step 1: algebra_simplify
  輸入：(x - 1)/(x + 2) - (2x + 3)/(x - 2)
  輸出：2*x*(-x - 5)/(x^2 - 4)
  
Step 2: 將方程改寫為
  2*x*(-x - 5)/(x^2 - 4) = 1
  
Step 3: 手動處理或展開
  分子 = 0 → 2*x*(-x - 5) = 0
  
Step 4: algebra_solve（如果仍然失敗，手動求解）
  或直接手動：x = 0 或 x = -5
  
Step 5: 檢驗分母不為零
  x^2 - 4 ≠ 0 → x ≠ ±2
  兩個解都有效 ✓

最終答案：x = 0 或 x = -5
```

**關鍵點**：
- 📌 先用 `algebra_simplify` 化簡複雜分式
- 📌 化簡後可能仍需手動處理
- 📌 記得檢驗分母條件

#### 含括號的方程（需要展開）
```
問題：(x + 1)(x + 2) = x(x + 3) + 2

✅ 推薦流程：
Step 1: algebra_expand
  展開左邊：(x + 1)(x + 2) → x^2 + 3*x + 2
  
Step 2: algebra_expand  
  展開右邊：x(x + 3) → x^2 + 3*x
  
Step 3: 改寫方程
  x^2 + 3*x + 2 = x^2 + 3*x + 2
  
結論：恆等式（所有x都成立）
```

---

## 幾何問題工作流程

### 🎯 問題：直角三角形

```
問題：已知直角邊 3 和 4，求斜邊

工作流程：
Step 1: 識別問題類型 → 勾股定理
Step 2: 調用 geometry_pythagoras
  {"known": "legs", "a": 3, "b": 4}
  
結果：c = 5 ✓
```

### 🎯 問題：相似三角形

```
問題：△ABC 与 △A'B'C' 對應，若 AC=8，A'C'=12，AB=6，求 A'B'

工作流程：
Step 1: 識別問題類型 → 相似三角形（關鍵詞：對應）
Step 2: 整理已知信息
  - 對應邊1：AC = 8, A'C' = 12
  - 已知邊：AB = 6
  - 求：A'B'
  
Step 3: 調用 geometry_similar_triangles
  {
    "side1_name": "AC",
    "side1_length": 8,
    "side2_name": "A'C'",
    "side2_length": 12,
    "known_side_name": "AB",
    "known_side_length": 6,
    "query_side_name": "A'B'"
  }
  
結果：A'B' = 9 ✓
```

### 🎯 問題：圓心角與圓周角

```
問題：同弧所對的圓心角為 80°，對應的圓周角為多少度？

工作流程：
Step 1: 識別問題類型 → 圓角度計算
Step 2: 確定已知和未知
  - 已知：圓心角 = 80°
  - 求：圓周角
  
Step 3: 調用 geometry_circle_angles
  {"query": "inscribed", "center_angle": 80}
  
結果：40° ✓
```

---

## 常見問題類型速查

### 問題類型決策樹

```
看到問題，按順序判斷：

1. 包含 "△相似/對應"？
   → geometry_similar_triangles
   
2. 包含 "直角三角形/勾股定理"？
   → geometry_pythagoras
   
3. 包含 "圓心角/圓周角"？
   → geometry_circle_angles
   
4. 包含 "解方程"？
   → 是否為分式方程？
      ├─ 是 → algebra_simplify → 手動處理
      └─ 否 → algebra_solve
   
5. 包含 "展開"？
   → algebra_expand
   
6. 包含 "因式分解"？
   → algebra_factor
   
7. 包含 "化簡"？
   → algebra_simplify
   
8. 包含 "多少種方法/選擇"？
   → combinatorics_ncr 或 combinatorics_npr
```

### 問題類型 vs 工具映射表

| 問題類型 | 優先工具 | 備用方案 |
|---------|---------|---------|
| 一元一次方程 | algebra_solve | - |
| 一元二次方程 | algebra_solve | algebra_factor + 手動 |
| 分式方程 | algebra_simplify → 手動 | algebra_expand → 手動 |
| 含括號表達式 | algebra_expand | algebra_simplify |
| 多項式分解 | algebra_factor | - |
| 直角三角形 | geometry_pythagoras | - |
| 相似三角形 | geometry_similar_triangles | 手動比例計算 |
| 圓角度問題 | geometry_circle_angles | 手動計算 |
| 排列組合 | combinatorics_npr/ncr | - |

---

## 工具組合使用技巧

### 技巧 1：化簡 → 求解

**適用場景**：複雜方程

```
問題：(x^2 - 1)/(x - 1) = 5

流程：
1. algebra_simplify: (x^2 - 1)/(x - 1) → x + 1
2. algebra_solve: x + 1 = 5 → x = 4
3. 檢驗：x ≠ 1（分母不為零）✓
```

### 技巧 2：展開 → 化簡

**適用場景**：多層括號

```
問題：化簡 ((x + 1)(x + 2))^2

流程：
1. algebra_expand: ((x + 1)(x + 2))^2 → x^4 + 6*x^3 + 13*x^2 + 12*x + 4
2. algebra_simplify: 進一步整理（如果需要）
```

### 技巧 3：因式分解 → 求解

**適用場景**：多項式方程

```
問題：x^2 - 5x + 6 = 0

流程：
1. algebra_factor: x^2 - 5x + 6 → (x - 2)(x - 3)
2. 手動求解：x = 2 或 x = 3
```

### 技巧 4：化簡 → 展開 → 化簡

**適用場景**：超級複雜表達式

```
問題：化簡 ((x+1)/(x-1) - (x-1)/(x+1))^2

流程：
1. algebra_simplify 內層：化簡分式部分
2. algebra_expand：展開平方
3. algebra_simplify：最終化簡
```

---

## 🚨 常見錯誤及避免方法

### 錯誤 1：直接解複雜分式方程

```
❌ 錯誤：
algebra_solve: (x-1)/(x+2) - (2x+3)/(x-2) = 1
→ 失敗！

✅ 正確：
1. algebra_simplify: (x-1)/(x+2) - (2x+3)/(x-2)
2. 根據化簡結果手動處理
```

### 錯誤 2：幾何問題用排列組合

```
❌ 錯誤：
問題：△ABC與△A'B'C'對應...
工具：combinatorics_npr

✅ 正確：
問題：△ABC與△A'B'C'對應...
工具：geometry_similar_triangles
```

### 錯誤 3：忘記檢驗分母條件

```
❌ 不完整：
解方程後直接給答案

✅ 完整：
1. 解方程
2. 檢查分母不為零
3. 給出有效解
```

### 錯誤 4：參數格式錯誤

```
❌ 錯誤：
geometry_circle_angles: {known: "center", a: 80}

✅ 正確：
geometry_circle_angles: {query: "inscribed", center_angle: 80}
```

---

## 📋 工作流程檢查清單

### 解方程問題
- [ ] 是否為分式方程？需要先化簡
- [ ] 是否很複雜？嘗試 simplify/expand
- [ ] 工具失敗了？準備手動求解
- [ ] 有分母嗎？記得檢驗分母條件
- [ ] 給出最終答案並檢驗

### 幾何問題
- [ ] 正確識別問題類型（直角/相似/圓）
- [ ] 整理好所有已知條件
- [ ] 選擇正確的工具
- [ ] 參數格式正確
- [ ] 結果合理嗎？

### 一般問題
- [ ] 先嘗試使用工具
- [ ] 工具失敗時不要慌張
- [ ] 使用數學知識手動解題
- [ ] 展示詳細步驟
- [ ] 給出最終答案

---

## 🎓 進階技巧

### 技巧：鏈式處理

對於非常複雜的問題，可以將其分解為多個步驟：

```
超複雜問題：解方程 ((x+1)(x+2))/(x-1) - x = 5

Step 1: algebra_expand左邊分子
  (x+1)(x+2) → x^2 + 3x + 2

Step 2: 重寫方程
  (x^2 + 3x + 2)/(x-1) - x = 5

Step 3: algebra_simplify
  化簡左邊

Step 4: algebra_solve 或手動求解

Step 5: 檢驗x ≠ 1

最終答案
```

### 技巧：並行驗證

當不確定結果時，可以用多種方法驗證：

```
方法1：algebra_solve
方法2：algebra_factor + 手動
方法3：代入驗證

三種方法結果一致 → 答案正確 ✓
```

---

## 📚 相關資源

- `cherry_studio_prompt_enhanced.txt` - 系統提示詞（含工作流程指導）
- `QUICK_REFERENCE.md` - 快速參考卡
- `UNICODE_FIX_AND_PROMPT_UPDATE.md` - 錯誤處理指南
- `mcp_math/mcp_server.py` - 工具詳細描述（已優化）

---

**使用這個指南，讓 AI 的工具調用更加流暢！**


