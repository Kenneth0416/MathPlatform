# Cherry Studio MCP 模式配置指南

## 🎯 标准 MCP stdio 协议接入

现在 MCP Math Service 已完全支持标准 MCP stdio 协议！可以作为原生 MCP 服务器接入 Cherry Studio。

---

## ✅ 测试验证

MCP 服务器已通过完整测试：

```
✓ 初始化握手成功
✓ 工具列表获取成功（11个工具）
✓ 解方程功能正常
✓ 分数运算功能正常
✓ 勾股定理计算正常
✓ 组合数计算正常
```

---

## 🚀 在 Cherry Studio 中配置（3分钟）

### Step 1: 找到 Cherry Studio 配置目录

Cherry Studio 的 MCP 配置文件位置：

**macOS**:
```bash
~/.config/cherry-studio/mcp-servers.json
```

**Windows**:
```
%APPDATA%\cherry-studio\mcp-servers.json
```

**Linux**:
```bash
~/.config/cherry-studio/mcp-servers.json
```

---

### Step 2: 创建或编辑配置文件

如果文件不存在，创建它：

```bash
# macOS/Linux
mkdir -p ~/.config/cherry-studio
touch ~/.config/cherry-studio/mcp-servers.json
```

---

### Step 3: 添加 MCP Math Service 配置

**方法 A: 复制项目提供的配置文件**

```bash
# 复制预配置文件到 Cherry Studio 配置目录
cp /Users/kenneth/Documents/MCP/MathMCP/mcp-servers.json ~/.config/cherry-studio/mcp-servers.json
```

**方法 B: 手动编辑配置**

打开 `~/.config/cherry-studio/mcp-servers.json`，添加以下内容：

```json
{
  "mcpServers": {
    "math-service": {
      "command": "python3",
      "args": [
        "-m",
        "mcp_math.mcp_server"
      ],
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP",
      "env": {
        "PYTHONPATH": "/Users/kenneth/Documents/MCP/MathMCP",
        "PYTHONUNBUFFERED": "1"
      },
      "disabled": false
    }
  }
}
```

**重要**: 请将 `cwd` 和 `PYTHONPATH` 中的路径替换为您的实际项目路径！

---

### Step 4: 重启 Cherry Studio

配置完成后，重启 Cherry Studio，它会自动：

1. ✅ 读取 MCP 配置
2. ✅ 启动 MCP Math Service 进程
3. ✅ 通过 stdio 建立通信
4. ✅ 自动发现 11 个数学工具

---

### Step 5: 验证连接

在 Cherry Studio 中：

1. 打开 **设置** → **MCP 服务器** 或 **插件/工具**
2. 查看 `math-service` 的状态
   - ✅ **已连接** = 配置成功
   - ❌ **未连接** = 需要排查（见下方故障排除）
3. 查看工具列表，应该显示 11 个工具：
   - algebra_solve
   - algebra_simplify
   - algebra_expand
   - algebra_factor
   - arithmetic_fraction
   - arithmetic_percent
   - geometry_pythagoras
   - geometry_circle_angles
   - combinatorics_ncr
   - combinatorics_npr
   - eval_numeric

---

### Step 6: 测试使用

在 Cherry Studio 对话框中输入：

```
解方程 2x + 3 = 11
```

**预期结果**：
- AI 自动识别需要使用数学工具
- 调用 `algebra_solve` 工具
- 返回：x = 4
- 显示详细解题步骤

---

## 📊 可用工具一览

| 工具名 | 功能 | 示例问题 |
|--------|------|----------|
| algebra_solve | 解方程 | 解方程 2x+3=11 |
| algebra_simplify | 化简 | 化简 2*x+3*x |
| algebra_expand | 展开 | 展开 (x+1)*(x+2) |
| algebra_factor | 因式分解 | 因式分解 x²-1 |
| arithmetic_fraction | 分数运算 | 计算 3/4 + 5/6 |
| arithmetic_percent | 百分比 | 100 增长 20% |
| geometry_pythagoras | 勾股定理 | 直角边3和4，求斜边 |
| geometry_circle_angles | 圆角度 | 圆心角60°，求圆周角 |
| combinatorics_ncr | 组合数 | 求 C(5,2) |
| combinatorics_npr | 排列数 | 求 P(5,2) |
| eval_numeric | 数值计算 | 计算 sqrt(2)+pi |

---

## 🔧 配置说明

### 关键配置项

```json
{
  "command": "python3",           // Python 解释器（必需）
  "args": ["-m", "mcp_math.mcp_server"],  // 启动命令（必需）
  "cwd": "项目路径",               // 工作目录（必需，绝对路径）
  "env": {
    "PYTHONPATH": "项目路径",     // Python 模块搜索路径（必需）
    "PYTHONUNBUFFERED": "1"       // 禁用缓冲（推荐）
  },
  "disabled": false               // 是否禁用（false=启用）
}
```

### 路径配置示例

**示例 1: 使用系统 Python**
```json
{
  "command": "python3",
  "cwd": "/Users/kenneth/Documents/MCP/MathMCP"
}
```

**示例 2: 使用虚拟环境**
```json
{
  "command": "/Users/kenneth/Documents/MCP/MathMCP/venv/bin/python",
  "cwd": "/Users/kenneth/Documents/MCP/MathMCP"
}
```

**示例 3: Windows 路径**
```json
{
  "command": "python",
  "cwd": "C:\\Users\\username\\Documents\\MCP\\MathMCP",
  "env": {
    "PYTHONPATH": "C:\\Users\\username\\Documents\\MCP\\MathMCP"
  }
}
```

---

## 🐛 故障排除

### 问题 1: Cherry Studio 中显示"未连接"

**检查项**：
1. 确认配置文件路径正确
2. 确认项目路径是绝对路径
3. 确认 Python 路径正确

**测试命令**：
```bash
# 测试能否手动启动
cd /Users/kenneth/Documents/MCP/MathMCP
python3 -m mcp_math.mcp_server

# 如果报错 "No module named 'mcp_math'"
export PYTHONPATH=/Users/kenneth/Documents/MCP/MathMCP
python3 -m mcp_math.mcp_server
```

**解决方案**：
- 检查 `cwd` 路径是否正确
- 检查 `PYTHONPATH` 是否设置
- 查看 Cherry Studio 的日志文件

---

### 问题 2: 找不到 Python 命令

**错误信息**: `command not found: python3`

**解决方案**：
```bash
# 查找 Python 路径
which python3

# 使用完整路径
{
  "command": "/usr/bin/python3",  # 或实际路径
  ...
}
```

---

### 问题 3: 依赖包未安装

**错误信息**: `No module named 'fastapi'` 或类似

**解决方案**：
```bash
cd /Users/kenneth/Documents/MCP/MathMCP
pip3 install -r requirements.txt

# 或使用虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 然后在配置中使用虚拟环境的 Python
{
  "command": "/Users/kenneth/Documents/MCP/MathMCP/venv/bin/python"
}
```

---

### 问题 4: 工具调用失败

**检查项**：
1. 查看 Cherry Studio 的工具调用日志
2. 运行测试脚本验证功能

**测试方法**：
```bash
cd /Users/kenneth/Documents/MCP/MathMCP
python3 test_mcp_client.py

# 预期输出: ✅ 所有测试通过！
```

---

### 问题 5: Cherry Studio 看不到工具列表

**解决方案**：
1. 确认 MCP 服务器状态为"已连接"
2. 重启 Cherry Studio
3. 尝试手动刷新工具列表
4. 检查是否有多个 MCP 服务器配置冲突

---

## 💡 使用技巧

### 技巧 1: 自然语言提问

配置好后，直接用中文提问：

```
✅ 解方程 2x + 3 = 11
✅ 帮我计算 3/4 加 5/6
✅ 直角三角形两直角边分别是 3 和 4，斜边是多少
✅ 圆心角是 60 度，圆周角是多少
✅ 求 C(5,2) 的值
```

AI 会自动识别并调用相应的工具。

---

### 技巧 2: 请求详细步骤

```
请详细解释步骤：解方程 x² - 5x + 6 = 0
```

AI 会自动设置 `detail="full"` 参数，返回完整的解题步骤。

---

### 技巧 3: 连续问题

```
1. 解方程 2x + 3 = 11
2. 把结果代入 3x - 5，求值
```

AI 可以使用第一个结果进行后续计算。

---

### 技巧 4: 混合使用

```
展开 (x+2)(x+3)，然后对结果进行因式分解
```

AI 会依次调用 `algebra_expand` 和 `algebra_factor`。

---

## 🎓 教学场景示例

### 场景 1: 学生学习

**学生**: 老师，我不会解方程 3x - 7 = 11

**AI 行为**:
1. 调用 `algebra_solve`，设置 `detail="full"`
2. 获取详细步骤
3. 逐步解释给学生：
   - 移项：3x = 11 + 7 = 18
   - 系数化1：x = 18 ÷ 3 = 6
   - 检验：3×6 - 7 = 11 ✓
4. 询问学生是否理解

---

### 场景 2: 作业辅导

**学生**: 这道题怎么做：已知直角三角形两直角边是 5 和 12，求斜边

**AI 行为**:
1. 识别为勾股定理问题
2. 调用 `geometry_pythagoras`
3. 返回：c = 13
4. 解释勾股定理：a² + b² = c²
5. 验证：5² + 12² = 25 + 144 = 169 = 13²

---

## 📈 对比：HTTP vs MCP stdio

| 特性 | HTTP 模式 | MCP stdio 模式 |
|------|-----------|----------------|
| **协议** | HTTP REST | JSON-RPC stdio |
| **启动** | 手动启动服务 | 自动启动 |
| **端口** | 需要 8000 | 无需端口 |
| **测试** | curl/浏览器 | MCP Host |
| **集成** | HTTP 工具 | 原生 MCP |
| **推荐场景** | 开发调试 | Cherry Studio |

---

## ✅ 配置完成检查清单

配置前：
- [ ] 确认 Python 3.9+ 已安装
- [ ] 确认项目依赖已安装（`pip install -r requirements.txt`）
- [ ] 确认项目路径（绝对路径）

配置 MCP：
- [ ] 创建/编辑 `mcp-servers.json`
- [ ] 配置正确的路径（`cwd`, `PYTHONPATH`）
- [ ] 使用正确的 Python 命令（`python3` 或虚拟环境）
- [ ] 保存配置文件

验证：
- [ ] 重启 Cherry Studio
- [ ] 检查 MCP 服务器状态（应为"已连接"）
- [ ] 查看工具列表（应显示 11 个工具）
- [ ] 测试基本功能（解方程）

测试：
- [ ] 运行 `python3 test_mcp_client.py` 验证服务器
- [ ] 在 Cherry Studio 中测试各类问题
- [ ] 验证错误处理

---

## 📚 相关文档

- **完整迁移指南**: [MCP_MIGRATION_GUIDE.md](MCP_MIGRATION_GUIDE.md)
- **HTTP 接入指南**: [CHERRY_STUDIO_GUIDE.md](CHERRY_STUDIO_GUIDE.md)
- **项目文档**: [README.md](README.md)
- **MCP 协议**: https://modelcontextprotocol.io/

---

## 🎉 成功！

如果一切正常，您现在可以：

✅ 在 Cherry Studio 中使用自然语言提问  
✅ AI 自动调用 MCP Math Service 的工具  
✅ 获得详细的解题步骤和答案  
✅ 进行数学辅导和作业辅助  

**享受原生 MCP 集成带来的便利！** 🎊

有任何问题，请参考故障排除部分或查看详细文档。



