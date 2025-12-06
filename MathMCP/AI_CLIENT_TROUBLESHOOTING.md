# AI 客戶端常見問題排查

## 問題：一個工具調用成功，一個失敗

### 症狀

使用同一個工具（如 `algebra_solve`）時，有時成功有時失敗。錯誤訊息類似：
```
AttributeError: 'dict' object has no attribute 'strip'
AttributeError: 'str' object has no attribute 'items'
```

### 原因分析

AI 模型（特別是較小的模型如 qwen3:0.6b）有時會混淆「工具定義」和「工具調用」，有以下幾種錯誤模式：

#### 錯誤模式 1：參數值是 schema 對象
```json
{
  "params": {
    "eq": {
      "type": "string",
      "description": "方程"
    }
  }
}
```

#### 錯誤模式 2：整個 params 是 JSON 字符串（包含 schema）
```json
{
  "params": "{\"type\":\"object\",\"properties\":{\"eq\":{\"type\":\"string\"}},\"required\":[\"eq\"]}"
}
```

#### 正確的調用示例
```json
{
  "params": {
    "eq": "2*x+3=11"
  }
}
```

**根本原因：**
小模型容易將「工具定義的 inputSchema」當作「實際參數」發送給服務器。

### 解決方案

#### 服務器端改進（已完成）

1. **參數類型轉換**：將所有數值參數從字符串轉換為相應的數字類型
   - geometry_pythagoras: `a`, `b`, `c` → float
   - arithmetic_fraction: `a`, `b` → float
   - arithmetic_percent: `base`, `rate` → float
   - combinatorics: `n`, `r` → int

2. **參數驗證與規範化**：添加 `_validate_arguments()` 方法，處理多種錯誤情況
   ```python
   def _validate_arguments(self, arguments: Any) -> Dict[str, Any]:
       # 處理 JSON 字符串參數
       if isinstance(arguments, str):
           parsed = json.loads(arguments)
           if isinstance(parsed, dict) and parsed.get("type") == "object":
               raise ValueError("收到的是工具定義的 inputSchema，而非實際參數")
           arguments = parsed
       
       # 檢查每個參數值是否是 schema 對象
       for key, value in arguments.items():
           if isinstance(value, dict) and ("type" in value or "description" in value):
               raise ValueError(f"參數 '{key}' 收到了 schema 而非實際值")
       
       return arguments
   ```

#### 客戶端建議

1. **使用更強大的模型**：
   - 較大的模型（如 GPT-4、Claude）通常能正確理解工具調用
   - 小模型（如 qwen3:0.6b）更容易出現此類錯誤

2. **檢查工具調用參數**：
   - ✓ 正確：`{"eq": "2*x+3=11"}`
   - ✗ 錯誤：`{"eq": {"type": "string", "description": "方程"}}`

3. **查看錯誤訊息**：
   - 如果收到參數驗證錯誤，說明 AI 模型發送了錯誤的參數格式
   - 可以重試或使用不同的模型

### 測試驗證

```bash
# 測試參數驗證（包含多種錯誤模式）
python3 -c "
import asyncio
import json
from mcp_math.mcp_server import MCPServer

server = MCPServer()

# 測試1：正確的字典參數
result = asyncio.run(server.call_tool('algebra_solve', {
    'eq': '2*x+3=11', 'var': 'x'
}))
print('✓ 測試1：正常字典參數')

# 測試2：JSON 字符串參數（正確的值）
result = asyncio.run(server.call_tool('algebra_solve', 
    json.dumps({'eq': '2*x+3=11', 'var': 'x'})
))
print('✓ 測試2：JSON 字符串參數（自動解析）')

# 測試3：JSON 字符串（包含 schema）
schema_str = '{\"type\":\"object\",\"properties\":{\"eq\":{\"type\":\"string\"}}}'
result = asyncio.run(server.call_tool('algebra_solve', schema_str))
if result.get('isError'):
    print('✓ 測試3：正確拒絕 schema 字符串')

# 測試4：字典參數包含 schema 對象
result = asyncio.run(server.call_tool('algebra_solve', {
    'eq': {'type': 'string', 'description': '方程'}
}))
if result.get('isError'):
    print('✓ 測試4：正確拒絕 schema 對象')
"
```

## 其他常見錯誤

### 1. 字符串參數用於數學運算

**錯誤：**
```
TypeError: unsupported operand type(s) for ** or pow(): 'str' and 'int'
```

**原因：** MCP 協議傳遞的參數都是字符串，需要轉換為數字

**解決：** 已在服務器端添加自動類型轉換

### 2. 參數缺失

**錯誤：**
```
ValueError: 需要提供兩條直角邊的長度
```

**原因：** 必需的參數沒有提供

**解決：** 檢查工具定義中的 `required` 字段，確保提供所有必需參數

## 相關文件

- `/mcp_math/mcp_server.py` - MCP 服務器實現
- `/mcp_math/core/geometry.py` - 幾何計算函數
- `/mcp_math/core/algebra.py` - 代數計算函數

