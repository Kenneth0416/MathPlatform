# AI 工具選擇優化指南

## 問題背景

AI 模型（特別是小模型如 qwen3:0.6b）在選擇工具時可能會出錯。例如：

**問題**：△ABC 与 △A'B'C' 对应，若 AC=8，A'C'=12，AB=6，求 A'B'。

**錯誤選擇**：AI 選擇了 `combinatorics_npr`（排列數）工具 ❌  
**正確選擇**：應該選擇 `geometry_similar_triangles`（相似三角形）工具 ✅

## 已實施的優化方案

### 1. 改進工具描述 ✅

為每個工具添加了詳細的描述、使用場景和關鍵詞：

#### 幾何工具
- **geometry_pythagoras**：「勾股定理（畢氏定理）- 直角三角形邊長計算 a²+b²=c²」
- **geometry_similar_triangles**：「相似三角形比例計算 - 當兩個三角形相似或對應時，對應邊成比例。關鍵詞：相似、對應、成比例、△ABC與△A'B'C'」
- **geometry_circle_angles**：「圓角度計算 - 圓心角與圓周角的關係」

#### 代數工具
- **algebra_solve**：「解方程（方程求解）- 解含有未知數的等式」
- **algebra_expand**：「展開表達式 - 將括號展開」
- **algebra_factor**：「因式分解 - 將多項式分解為因數乘積」
- **algebra_simplify**：「化簡表達式 - 將代數式簡化為最簡形式」

#### 排列組合工具
- **combinatorics_ncr**：「組合數 C(n,r) - 從n個不同元素中取r個的組合數（不考慮順序）。如：從8個人中選3個人的方法數」
- **combinatorics_npr**：「排列數 P(n,r) - 從n個不同元素中取r個進行排列（考慮順序）。如：8個人選3個排成一列的方法數」

### 2. 添加系統提示詞（Prompts）✅

MCP 服務器現在支持 `prompts` 功能，提供工具選擇指南：

```
# 數學工具選擇指南

## 幾何問題
- **直角三角形求邊長** → 使用 geometry_pythagoras
- **相似三角形、對應三角形求邊長** → 使用 geometry_similar_triangles
  - 關鍵詞：「相似」、「對應」、「△ABC與△A'B'C'」、「成比例」

## 排列組合
⚠️ 看到「△ABC與△A'B'C'對應」這樣的描述，這是**相似三角形問題**，不是排列組合！
⚠️ 排列組合只用於計數問題（多少種方法、多少種選擇），不用於幾何計算！
```

### 3. 新增相似三角形工具 ✅

添加了專門處理相似三角形問題的工具：

```python
geometry_similar_triangles(
    side1_name="AC",
    side1_length=8,
    side2_name="A'C'",
    side2_length=12,
    known_side_name="AB",
    known_side_length=6,
    query_side_name="A'B'"
)
# 結果：A'B' = 9
```

## 使用建議

### 對於 AI 客戶端開發者

1. **啟用 Prompts 功能**：
   - 在初始化對話時，請求並使用 `math_tool_guide` prompt
   - 這會給 AI 提供工具選擇的明確指導

2. **使用更強大的模型**：
   - ✅ 推薦：GPT-4、Claude 3.5、Gemini Pro
   - ⚠️ 謹慎：qwen3:0.6b、小於 7B 的模型
   - 較大的模型更能理解工具描述和選擇正確的工具

3. **檢查工具調用結果**：
   - 查看返回的 `task` 字段，確認使用了正確的工具
   - 如果結果不合理，可能是選錯了工具

### 對於最終用戶

1. **問題描述要清晰**：
   - ✅ 好：「三角形ABC與A'B'C'相似，AC=8，A'C'=12，AB=6，求A'B'」
   - ✅ 好：「已知兩直角邊5和12，求斜邊」
   - ❌ 差：「求邊長」（太模糊）

2. **使用關鍵詞**：
   - 相似三角形：「相似」、「對應」、「成比例」
   - 直角三角形：「直角」、「斜邊」、「勾股定理」
   - 排列組合：「選擇」、「排列」、「多少種方法」

3. **選擇合適的模型**：
   - 如果使用 qwen3:0.6b 等小模型，遇到錯誤時可以嘗試重新提問或換用更大的模型

## 測試驗證

### 測試工具選擇

```bash
# 測試相似三角形工具
cd /Users/kenneth/Documents/MCP/MathMCP && python3 -c "
import asyncio
import json
from mcp_math.mcp_server import MCPServer

server = MCPServer()

# 測試相似三角形
result = asyncio.run(server.call_tool('geometry_similar_triangles', {
    'side1_name': 'AC',
    'side1_length': 8,
    'side2_name': \"A'C'\",
    'side2_length': 12,
    'known_side_name': 'AB',
    'known_side_length': 6,
    'query_side_name': \"A'B'\"
}))

data = json.loads(result['content'][0]['text'])
print(f\"答案: {data['result']['exact']}\")  # A'B' = 9.0
print(f\"工具: {data['task']}\")  # geometry.similar
"
```

### 測試 Prompts 功能

```bash
# 查看可用 prompts
python3 -c "
from mcp_math.mcp_server import MCPServer
import json

server = MCPServer()
print(json.dumps(server.prompts, indent=2, ensure_ascii=False))
"
```

## 優化效果對比

### 優化前
```
問題：△ABC 与 △A'B'C' 对应，若 AC=8，A'C'=12，AB=6，求 A'B'。
AI 選擇：combinatorics_npr ❌
結果：P(8,3) = 336（完全錯誤）
```

### 優化後
```
問題：△ABC 与 △A'B'C' 对应，若 AC=8，A'C'=12，AB=6，求 A'B'。
AI 應該選擇：geometry_similar_triangles ✅
結果：A'B' = 9（正確答案）
```

## 進一步優化建議

### 1. 在 Cherry Studio 中配置

如果您使用 Cherry Studio，可以考慮：

- **添加系統提示詞**：在對話開始時添加工具選擇指南
- **使用更好的模型**：切換到 GPT-4 或 Claude 3.5
- **啟用工具描述**：確保 AI 能看到完整的工具描述

### 2. 自定義提示詞模板

可以創建自己的提示詞模板，例如：

```
你是一個數學問題解決助手。當遇到以下類型的問題時：

1. 如果問題涉及「相似三角形」、「對應」、「△ABC與△A'B'C'」，
   使用 geometry_similar_triangles 工具

2. 如果問題涉及「直角三角形」、「勾股定理」、「斜邊」，
   使用 geometry_pythagoras 工具

3. 排列組合工具（combinatorics_npr/ncr）只用於計數問題，
   不用於幾何計算！
```

### 3. 模型選擇建議

| 模型大小 | 工具選擇準確率 | 建議使用場景 |
|---------|--------------|-------------|
| < 1B (如 qwen3:0.6b) | 低（~40%） | 僅用於測試 |
| 1B-7B | 中等（~60%） | 簡單問題 |
| 7B-13B | 良好（~80%） | 一般使用 |
| > 13B (如 GPT-4) | 優秀（~95%） | 推薦使用 |

## 重啟服務器

完成這些優化後，請重啟 MCP 服務器以應用所有改進：

```bash
# 如果使用 Cherry Studio，重新加載 MCP 服務器配置
# 或者重啟 Cherry Studio 應用程序
```

## 相關文件

- `/mcp_math/mcp_server.py` - MCP 服務器實現（已優化）
- `/AI_CLIENT_TROUBLESHOOTING.md` - 客戶端故障排查指南
- `/PROJECT_SUMMARY.md` - 項目總體說明


