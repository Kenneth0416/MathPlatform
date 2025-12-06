# MCP 數學工具快速參考卡 🚀

## 📌 一分鐘設置

### 1. 複製系統提示詞
打開 `cherry_studio_prompt.txt`，全選複製

### 2. 貼到 Cherry Studio
設置 → 系統提示詞 → 貼上 → 保存

### 3. 選擇合適的模型
- ✅ 推薦：GPT-4、Claude 3.5、Gemini Pro
- ⚠️ 可用：GPT-3.5、Qwen 7B+
- ❌ 避免：qwen3:0.6b（準確率太低）

---

## 🎯 工具選擇速查表

| 問題關鍵詞 | 使用工具 | 示例 |
|-----------|---------|------|
| △相似、對應、成比例 | `geometry_similar_triangles` | △ABC與△A'B'C'對應 |
| 直角三角形、斜邊、勾股定理 | `geometry_pythagoras` | 已知直角邊3和4，求斜邊 |
| 圓心角、圓周角、同弧 | `geometry_circle_angles` | 圓心角80°，求圓周角 |
| 解方程、求x | `algebra_solve` | 解 2x+3=11 |
| 展開 | `algebra_expand` | 展開 (x+1)(x+2) |
| 因式分解 | `algebra_factor` | 分解 x²-5x+6 |
| 化簡 | `algebra_simplify` | 化簡 (x+1)²-(x-1)² |
| 多少種方法、選擇（不排序）| `combinatorics_ncr` | 8人選3人 |
| 多少種方法、排列（排序）| `combinatorics_npr` | 8人選3人排成一列 |
| 分數計算 | `arithmetic_fraction` | 1/2 + 1/3 |
| 百分比增減 | `arithmetic_percent` | 100增加20% |

---

## ⚠️ 三大常見錯誤

### 錯誤 1：幾何問題用排列組合 ❌
```
問題：△ABC與△A'B'C'對應，求邊長
錯誤：使用 combinatorics_npr
正確：使用 geometry_similar_triangles
```
**記住**：看到三角形符號（△）= 幾何問題！

### 錯誤 2：參數結構混淆 ❌
```
錯誤：geometry_circle_angles 用 {known: "...", a: 80}
正確：geometry_circle_angles 用 {query: "inscribed", center_angle: 80}
```
**記住**：每個工具有專屬參數！

### 錯誤 3：參數類型錯誤 ❌
```
錯誤：{"n": "5"}  （字符串）
正確：{"n": 5}    （數字）
```

---

## 🔥 決策樹（5秒判斷）

```
問題包含...
  ├─ △相似/對應? → geometry_similar_triangles
  ├─ 直角三角形? → geometry_pythagoras
  ├─ 圓心角/圓周角? → geometry_circle_angles
  ├─ 解方程? → algebra_solve
  ├─ 多少種方法? → combinatorics_ncr/npr
  └─ 其他代數? → algebra_expand/factor/simplify
```

---

## 📝 參數格式速查

### geometry_pythagoras
```json
{"known": "legs", "a": 3, "b": 4}
```

### geometry_circle_angles
```json
{"query": "inscribed", "center_angle": 80}
```

### geometry_similar_triangles
```json
{
  "side1_name": "AC", "side1_length": 8,
  "side2_name": "A'C'", "side2_length": 12,
  "known_side_name": "AB", "known_side_length": 6,
  "query_side_name": "A'B'"
}
```

### algebra_solve
```json
{"eq": "2*x+3=11", "var": "x"}
```

### combinatorics_ncr
```json
{"n": 8, "r": 3}
```

---

## ✅ 測試清單

使用這些問題測試你的設置：

- [ ] △ABC與△A'B'C'對應，AC=8，A'C'=12，AB=6，求A'B' → 應該得 9
- [ ] 直角邊3和4，求斜邊 → 應該得 5
- [ ] 圓心角80°，求圓周角 → 應該得 40°
- [ ] 解方程 2x+3=11 → 應該得 x=4
- [ ] 8人選3人的組合數 → 應該得 56

**如果全部正確** ✅ → 配置成功！

**如果有錯誤** ❌ → 檢查：
1. 系統提示詞是否正確設置？
2. 模型是否足夠強大？
3. temperature 是否設為 0.1？

---

## 🆘 緊急救援

### AI 選錯工具？
→ 在問題前加：「這是一個[相似三角形/直角三角形/...]問題」

### 參數錯誤？
→ 查看錯誤信息，服務器會提示正確格式

### 模型太慢？
→ GPT-4 → Claude 3.5 → Gemini Pro → GPT-3.5

### Token 不夠？
→ 使用精簡版提示詞（CHERRY_STUDIO_SYSTEM_PROMPT.md 中的「精簡版」）

---

## 📚 完整文檔

- `cherry_studio_prompt.txt` - 系統提示詞（直接複製）
- `CHERRY_STUDIO_SETUP_GUIDE.md` - 詳細設置指南
- `CHERRY_STUDIO_SYSTEM_PROMPT.md` - 提示詞文檔（含多個版本）
- `AI_TOOL_SELECTION_OPTIMIZATION.md` - 優化指南

---

**打印此頁**，放在手邊隨時查閱！📄


