# Cherry Studio MCP 接入指南

本指南详细说明如何在 Cherry Studio 中接入 MCP Math Service。

---

## 📋 接入方式概述

由于当前版本是 **HTTP/JSON** 接口，Cherry Studio 可以通过以下两种方式接入：

### 方式一：HTTP 工具接入（推荐，立即可用）✅
通过配置 HTTP 工具清单，让 Cherry Studio 调用本服务的 REST API。

### 方式二：MCP stdio 协议（未来版本）⏳
迁移到正式的 MCP stdio 协议后，可以作为标准 MCP 服务器接入。

---

## 🚀 方式一：HTTP 工具接入（当前推荐）

### Step 1: 启动 MCP Math Service

```bash
cd /Users/kenneth/Documents/MCP/MathMCP

# 启动服务
./start.sh

# 或使用
uvicorn mcp_math.app:app --host 0.0.0.0 --port 8000

# 确认服务运行
curl http://localhost:8000/health
```

确认看到：
```json
{"status":"healthy","version":"0.1.0","service":"MCP Math Service"}
```

---

### Step 2: 在 Cherry Studio 中配置 HTTP 工具

#### 2.1 导入工具清单

Cherry Studio 支持导入 OpenAPI/工具清单。有两种方式：

**选项 A：使用工具清单文件**

1. 打开 Cherry Studio
2. 进入 **设置** → **工具/插件** → **添加工具**
3. 选择 **导入工具清单**
4. 导入文件：`/Users/kenneth/Documents/MCP/MathMCP/manifests/tool_manifest.json`

**选项 B：使用 OpenAPI 自动发现**

1. 打开 Cherry Studio
2. 进入 **设置** → **工具/插件** → **添加 HTTP 工具**
3. 输入 OpenAPI URL：`http://localhost:8000/openapi.json`
4. Cherry Studio 会自动解析所有端点

---

### Step 3: 配置系统提示词

为了让 AI 知道如何使用这些工具，需要配置系统提示词：

#### 3.1 复制提示词内容

打开文件：`/Users/kenneth/Documents/MCP/MathMCP/examples/runtime_system_prompt.txt`

#### 3.2 在 Cherry Studio 中配置

1. 进入 **助手设置** 或 **Agent 配置**
2. 找到 **系统提示词** 或 **System Prompt** 区域
3. 粘贴 `runtime_system_prompt.txt` 的内容
4. 保存配置

#### 3.3 提示词核心内容

```
你是一个数学辅导助手，可以使用 MCP Math Service 提供的数学工具来解决初中数学问题。

可用工具包括：
- algebra.solve: 解方程
- algebra.simplify: 化简表达式
- algebra.expand: 展开表达式
- algebra.factor: 因式分解
- arithmetic.fraction: 分数运算
- arithmetic.percent: 百分比计算
- geometry.pythagoras: 勾股定理
- geometry.similar: 相似三角形
- geometry.circle_angles: 圆心角/圆周角
- combinatorics.ncr: 组合数
- combinatorics.npr: 排列数
- eval.numeric: 数值计算

使用策略：
1. 优先使用工具求解
2. 选择合适的 detail 参数（学习场景用 "full"）
3. 解释结果和步骤
4. 引导用户理解解题思路
```

---

### Step 4: 手动配置工具（如果自动导入不可用）

如果 Cherry Studio 需要手动配置每个工具，使用以下模板：

#### 工具配置模板

**工具名称**: `algebra.solve`  
**描述**: 解一元一次或二次方程  
**方法**: POST  
**URL**: `http://localhost:8000/algebra/solve`  
**请求体格式**: JSON

**参数定义**:
```json
{
  "type": "object",
  "properties": {
    "eq": {
      "type": "string",
      "description": "方程表达式，如 '2*x+3=11'"
    },
    "var": {
      "type": "string",
      "description": "变量名",
      "default": "x"
    },
    "detail": {
      "type": "string",
      "enum": ["short", "full"],
      "description": "详细程度",
      "default": "short"
    }
  },
  "required": ["eq"]
}
```

---

### Step 5: 测试接入

#### 5.1 在 Cherry Studio 中测试

在 Cherry Studio 对话框中输入：

```
解方程：2x + 3 = 11
```

预期行为：
1. AI 识别需要使用 `algebra.solve` 工具
2. 构造请求：`{"eq": "2*x+3=11", "var": "x", "detail": "full"}`
3. 调用 `http://localhost:8000/algebra/solve`
4. 获得结果并解释给用户

#### 5.2 其他测试用例

```
1. 计算 3/4 + 5/6
2. 展开 (x+1)(x+2)
3. 因式分解 x²-1
4. 直角三角形两直角边为 3 和 4，求斜边
5. 圆心角 60 度，求圆周角
6. 求组合数 C(5,2)
```

---

## 📝 完整工具清单配置

如果需要逐个配置，这里是所有 12 个工具的基本信息：

### 代数工具

| 工具名 | 端点 | 必需参数 |
|--------|------|----------|
| algebra.solve | /algebra/solve | eq |
| algebra.simplify | /algebra/simplify | expr |
| algebra.expand | /algebra/expand | expr |
| algebra.factor | /algebra/factor | expr |

### 算术工具

| 工具名 | 端点 | 必需参数 |
|--------|------|----------|
| arithmetic.fraction | /arithmetic/fraction | a, b, op |
| arithmetic.percent | /arithmetic/percent | base, rate, mode |

### 几何工具

| 工具名 | 端点 | 必需参数 |
|--------|------|----------|
| geometry.pythagoras | /geometry/pythagoras | known |
| geometry.similar | /geometry/similar | tri1, tri2, mapping, query |
| geometry.circle_angles | /geometry/circle_angles | query |

### 组合工具

| 工具名 | 端点 | 必需参数 |
|--------|------|----------|
| combinatorics.ncr | /combinatorics/ncr | n, r |
| combinatorics.npr | /combinatorics/npr | n, r |

### 其他工具

| 工具名 | 端点 | 必需参数 |
|--------|------|----------|
| eval.numeric | /eval/numeric | expr |

所有端点的基础 URL：`http://localhost:8000`

---

## 🎯 方式二：MCP stdio 协议（未来版本）

当服务升级到支持 MCP stdio 协议后，可以按以下方式接入：

### Step 1: 创建 MCP 配置文件

创建文件 `~/.cherry-studio/mcp-config.json`：

```json
{
  "mcpServers": {
    "math-service": {
      "command": "python",
      "args": ["-m", "mcp_math.mcp_server"],
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP",
      "env": {
        "PYTHONPATH": "/Users/kenneth/Documents/MCP/MathMCP"
      }
    }
  }
}
```

### Step 2: Cherry Studio 自动发现

重启 Cherry Studio，它会：
1. 读取 MCP 配置
2. 启动 MCP 服务器进程
3. 通过 stdio 通信
4. 自动发现所有工具

### Step 3: 使用

配置完成后，直接对话即可，Cherry Studio 会自动调用工具。

---

## 🔧 高级配置

### 配置 1：工具选择策略

在系统提示词中添加：

```
工具选择规则：
1. 方程问题 → algebra.solve
2. 表达式化简 → algebra.simplify
3. 表达式展开 → algebra.expand
4. 因式分解 → algebra.factor
5. 分数计算 → arithmetic.fraction
6. 增长率问题 → arithmetic.percent
7. 直角三角形 → geometry.pythagoras
8. 相似三角形 → geometry.similar
9. 圆的角度 → geometry.circle_angles
10. 组合排列 → combinatorics.ncr/npr
```

### 配置 2：detail 参数策略

```
detail 参数使用：
- 学生学习场景：使用 "full"（显示完整步骤）
- 快速计算场景：使用 "short"（仅显示关键步骤）
- 默认：根据用户需求判断
```

### 配置 3：错误处理

```
错误处理策略：
1. 如果工具返回错误，向用户解释错误原因
2. 提供修正建议（如表达式格式问题）
3. 必要时引导用户提供更多信息
```

---

## 📊 验证接入成功

### 检查清单

- [ ] MCP Math Service 正在运行（`http://localhost:8000/health` 返回正常）
- [ ] Cherry Studio 能看到数学工具列表
- [ ] 系统提示词已配置
- [ ] 测试对话能成功调用工具
- [ ] 工具返回结果正确显示

### 测试对话示例

**用户**: 解方程 2x + 3 = 11

**预期 AI 行为**:
1. 识别这是方程求解问题
2. 调用 `algebra.solve` 工具
3. 参数：`{"eq": "2*x+3=11", "var": "x", "detail": "full"}`
4. 获得结果：x = 4
5. 向用户解释：
   - 移项：2x = 11 - 3 = 8
   - 系数化1：x = 8 ÷ 2 = 4
   - 检验：2×4 + 3 = 11 ✓

---

## 🐛 故障排除

### 问题 1: Cherry Studio 找不到工具

**解决方案**:
1. 确认服务正在运行：`curl http://localhost:8000/health`
2. 检查 OpenAPI 端点：`curl http://localhost:8000/openapi.json`
3. 重新导入工具清单
4. 重启 Cherry Studio

### 问题 2: 工具调用失败

**检查项**:
1. 查看 Cherry Studio 的工具调用日志
2. 查看 MCP Math Service 的终端输出
3. 确认参数格式正确
4. 测试 curl 命令是否能正常调用

### 问题 3: AI 不使用工具

**解决方案**:
1. 检查系统提示词是否正确配置
2. 确认工具在 Cherry Studio 中已启用
3. 尝试更明确的问题描述
4. 检查 AI 模型是否支持工具调用

### 问题 4: 返回结果格式错误

**解决方案**:
1. 确认 MCP Math Service 版本为 0.1.0
2. 检查服务日志是否有错误
3. 测试相同请求的 curl 命令
4. 查看 `PROJECT_STATUS.md` 确认已知问题

---

## 📚 参考资料

### 服务端点文档
访问：http://localhost:8000/docs

### 工具清单文件
位置：`manifests/tool_manifest.json`

### 系统提示词模板
位置：`examples/runtime_system_prompt.txt`

### API 测试脚本
```bash
# curl 示例
./examples/curl_examples.sh

# Python 客户端
python examples/demo_client.py
```

---

## 💡 使用技巧

### 技巧 1: 自然语言提问

Cherry Studio 配置好后，可以用自然语言提问：

```
❌ 不好：调用 algebra.solve {"eq": "2*x+3=11"}
✅ 好的：解方程 2x + 3 = 11
```

AI 会自动识别并调用正确的工具。

### 技巧 2: 请求详细步骤

```
请详细解释解题步骤：解方程 x² - 5x + 6 = 0
```

AI 会自动设置 `detail="full"` 参数。

### 技巧 3: 连续问题

```
1. 解方程 2x + 3 = 11
2. 把结果代入 3x - 5，求值
```

AI 可以使用第一个工具的结果进行后续计算。

### 技巧 4: 混合使用工具

```
展开 (x+2)(x+3)，然后因式分解 x² + 5x + 6
```

AI 会依次调用 `algebra.expand` 和 `algebra.factor`。

---

## 🎓 教学场景示例

### 场景 1: 方程教学

**学生**: 我不会解方程 3x - 7 = 11

**配置**: 确保 AI 使用 `detail="full"`

**AI 行为**:
1. 调用工具获取详细步骤
2. 逐步解释：
   - 第一步：移项
   - 第二步：系数化1
   - 第三步：检验
3. 询问学生是否理解

### 场景 2: 几何计算

**学生**: 直角三角形的两条直角边是 6 和 8，斜边是多少？

**AI 行为**:
1. 识别为勾股定理问题
2. 调用 `geometry.pythagoras`
3. 解释计算过程
4. 提供勾股定理公式

### 场景 3: 综合问题

**学生**: 一个正方形边长是 x+2，面积是 25，求 x

**AI 行为**:
1. 先展开 (x+2)²
2. 建立方程 (x+2)² = 25
3. 解方程得到 x
4. 检验答案

---

## 📞 支持

### 快速帮助
- 查看 [README.md](README.md) 了解服务详情
- 查看 [QUICKSTART.md](QUICKSTART.md) 快速参考
- 运行 `python examples/demo_client.py` 查看示例

### 测试服务
```bash
# 健康检查
curl http://localhost:8000/health

# 测试一个端点
curl -X POST http://localhost:8000/algebra/solve \
  -H "Content-Type: application/json" \
  -d '{"eq": "2*x+3=11"}'
```

### 日志查看
MCP Math Service 的日志会输出到启动服务的终端。

---

## ✅ 配置完成检查表

在 Cherry Studio 中完成以下检查：

- [ ] MCP Math Service 已启动
- [ ] 工具清单已导入（12个工具）
- [ ] 系统提示词已配置
- [ ] 测试对话成功（至少 3 个不同类型）
- [ ] 工具返回的步骤正确显示
- [ ] LaTeX 公式正确渲染（如支持）
- [ ] 错误情况能正常处理

---

**配置完成后，您就可以在 Cherry Studio 中使用 MCP Math Service 进行数学辅导了！** 🎉

如有问题，请参考故障排除部分或查看详细文档。



