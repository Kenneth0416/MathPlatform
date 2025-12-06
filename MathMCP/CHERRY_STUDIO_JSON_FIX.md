# Cherry Studio MCP JSON 配置问题解决方案

## ✅ 验证结果

您的 `mcp-servers.json` 文件格式正确！JSON 解析没有问题。

---

## 🔍 Cherry Studio 中常见的 MCP 配置问题

### 问题 1: Cherry Studio 找不到配置文件

**症状**: Cherry Studio 没有显示 MCP 服务器

**解决方案**:

#### Step 1: 确认配置文件位置

Cherry Studio 的配置文件应该放在：

**macOS**:
```bash
~/.config/cherry-studio/mcp-servers.json
```

**检查是否存在**:
```bash
ls -la ~/.config/cherry-studio/mcp-servers.json
```

**如果不存在，创建目录并复制**:
```bash
# 创建目录
mkdir -p ~/.config/cherry-studio

# 复制配置文件
cp /Users/kenneth/Documents/MCP/MathMCP/mcp-servers.json \
   ~/.config/cherry-studio/mcp-servers.json
```

---

### 问题 2: Cherry Studio 显示"未连接"或错误

**可能原因**:
1. Python 路径不正确
2. 项目路径不正确
3. 权限问题
4. Cherry Studio 版本问题

**解决方案**:

#### 方案 A: 使用绝对路径的 Python

编辑 `~/.config/cherry-studio/mcp-servers.json`：

```json
{
  "mcpServers": {
    "math-service": {
      "command": "/Library/Developer/CommandLineTools/usr/bin/python3",
      "args": ["-m", "mcp_math.mcp_server"],
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP",
      "env": {
        "PYTHONPATH": "/Users/kenneth/Documents/MCP/MathMCP",
        "PYTHONUNBUFFERED": "1",
        "LANG": "zh_CN.UTF-8"
      },
      "disabled": false
    }
  }
}
```

**如何找到 Python 的绝对路径**:
```bash
which python3
# 输出：/Library/Developer/CommandLineTools/usr/bin/python3
```

#### 方案 B: 创建包装脚本

创建 `/Users/kenneth/Documents/MCP/MathMCP/run_mcp.sh`：

```bash
#!/bin/bash
cd /Users/kenneth/Documents/MCP/MathMCP
export PYTHONPATH=/Users/kenneth/Documents/MCP/MathMCP
export PYTHONUNBUFFERED=1
exec python3 -m mcp_math.mcp_server "$@"
```

添加执行权限：
```bash
chmod +x /Users/kenneth/Documents/MCP/MathMCP/run_mcp.sh
```

然后在 Cherry Studio 配置中使用：
```json
{
  "mcpServers": {
    "math-service": {
      "command": "/Users/kenneth/Documents/MCP/MathMCP/run_mcp.sh",
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP",
      "disabled": false
    }
  }
}
```

---

### 问题 3: Cherry Studio 版本不兼容

**症状**: 配置正确但仍然无法连接

**检查 Cherry Studio 版本**:
- 确保使用的是支持 MCP 的版本
- 查看 Cherry Studio 的 MCP 文档

**临时解决方案**: 使用 HTTP 模式

1. 启动 HTTP 服务：
```bash
cd /Users/kenneth/Documents/MCP/MathMCP
./start.sh
```

2. 在 Cherry Studio 中添加 HTTP 工具：
   - 导入 `manifests/tool_manifest.json`
   - 或使用 OpenAPI URL: `http://localhost:8000/openapi.json`

---

### 问题 4: 权限被拒绝

**症状**: Permission denied 错误

**解决方案**:

```bash
# 确保所有文件有正确权限
chmod +x /Users/kenneth/Documents/MCP/MathMCP/start.sh
chmod +x /Users/kenneth/Documents/MCP/MathMCP/run_mcp.sh
chmod -R u+r /Users/kenneth/Documents/MCP/MathMCP
```

---

### 问题 5: 中文字符显示问题

**症状**: 中文乱码或编码错误

**解决方案**:

在配置中添加编码设置：

```json
{
  "env": {
    "PYTHONPATH": "/Users/kenneth/Documents/MCP/MathMCP",
    "PYTHONUNBUFFERED": "1",
    "PYTHONIOENCODING": "utf-8",
    "LANG": "zh_CN.UTF-8",
    "LC_ALL": "zh_CN.UTF-8"
  }
}
```

---

## 🧪 测试配置是否正确

### 测试 1: 手动运行 MCP 服务器

```bash
cd /Users/kenneth/Documents/MCP/MathMCP
python3 -m mcp_math.mcp_server
```

**预期结果**: 程序等待输入（不报错）

**测试输入**（手动输入或复制粘贴）:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
```

按回车后应该看到 JSON 响应。

按 `Ctrl+C` 退出。

### 测试 2: 使用测试客户端

```bash
cd /Users/kenneth/Documents/MCP/MathMCP
python3 test_mcp_client.py
```

**预期结果**: 
```
✅ 所有测试通过！
```

### 测试 3: 验证环境

```bash
cd /Users/kenneth/Documents/MCP/MathMCP
python3 diagnose.py
```

确保所有检查项都显示 ✓

---

## 📝 完整的 Cherry Studio 配置步骤

### Step 1: 准备配置文件

```bash
# 创建 Cherry Studio 配置目录
mkdir -p ~/.config/cherry-studio

# 编辑配置文件
nano ~/.config/cherry-studio/mcp-servers.json
```

### Step 2: 粘贴以下内容

```json
{
  "mcpServers": {
    "math-service": {
      "command": "/Library/Developer/CommandLineTools/usr/bin/python3",
      "args": [
        "-m",
        "mcp_math.mcp_server"
      ],
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP",
      "env": {
        "PYTHONPATH": "/Users/kenneth/Documents/MCP/MathMCP",
        "PYTHONUNBUFFERED": "1",
        "PYTHONIOENCODING": "utf-8"
      },
      "disabled": false
    }
  }
}
```

**重要**: 
- 使用 `which python3` 确认 Python 路径
- 确保 `cwd` 和 `PYTHONPATH` 是您的实际项目路径

### Step 3: 保存并重启 Cherry Studio

### Step 4: 验证连接

在 Cherry Studio 中：
1. 打开 **设置** → **MCP 服务器**
2. 查看 `math-service` 的状态
3. 状态应为 **已连接** ✓

### Step 5: 测试工具

在对话框输入：
```
解方程 2x + 3 = 11
```

预期：AI 调用工具并返回 x = 4

---

## 🐛 Cherry Studio 日志查看

如果仍然有问题，查看 Cherry Studio 的日志：

**macOS**:
```bash
# Cherry Studio 日志通常在
~/Library/Logs/cherry-studio/

# 或
cat ~/Library/Application\ Support/cherry-studio/logs/main.log
```

查找错误信息，特别是与 MCP 或 Python 相关的。

---

## 🔄 备用方案：使用不同的配置格式

有些版本的 Cherry Studio 可能使用不同的配置格式：

### 格式 1: 简化版

```json
{
  "mcpServers": {
    "math-service": {
      "command": "python3",
      "args": ["-m", "mcp_math.mcp_server"],
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP"
    }
  }
}
```

### 格式 2: 使用脚本

```json
{
  "mcpServers": {
    "math-service": {
      "command": "/Users/kenneth/Documents/MCP/MathMCP/run_mcp.sh"
    }
  }
}
```

### 格式 3: 包含更多元数据

```json
{
  "mcpServers": {
    "math-service": {
      "command": "python3",
      "args": ["-m", "mcp_math.mcp_server"],
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP",
      "env": {
        "PYTHONPATH": "/Users/kenneth/Documents/MCP/MathMCP"
      },
      "disabled": false,
      "alwaysAllow": ["*"],
      "name": "MCP Math Service",
      "description": "数学问题求解服务"
    }
  }
}
```

---

## 📊 常见错误代码

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `ENOENT` | 找不到命令/文件 | 使用绝对路径 |
| `Permission denied` | 权限不足 | `chmod +x` |
| `Module not found` | PYTHONPATH 错误 | 检查路径设置 |
| `Connection refused` | 服务未启动 | 检查命令是否正确 |
| `JSON parse error` | 配置格式错误 | 验证 JSON 格式 |
| `Timeout` | 启动超时 | 增加超时时间或优化启动 |

---

## ✅ 验证清单

配置前：
- [ ] Python 3.9+ 已安装
- [ ] 依赖包已安装（`pip3 install -r requirements.txt`）
- [ ] 项目路径正确
- [ ] `python3 diagnose.py` 全部通过

配置 Cherry Studio：
- [ ] 配置文件在正确位置（`~/.config/cherry-studio/`）
- [ ] JSON 格式正确（无语法错误）
- [ ] Python 路径正确（绝对路径）
- [ ] 项目路径正确（绝对路径）
- [ ] PYTHONPATH 已设置

测试：
- [ ] 手动运行 MCP 服务器无错误
- [ ] `python3 test_mcp_client.py` 通过
- [ ] Cherry Studio 显示"已连接"
- [ ] 测试查询正常工作

---

## 💡 推荐配置（最稳定）

```json
{
  "mcpServers": {
    "math-service": {
      "command": "/Library/Developer/CommandLineTools/usr/bin/python3",
      "args": ["-m", "mcp_math.mcp_server"],
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

**为什么这个配置最稳定**：
1. 使用 Python 的绝对路径（避免 PATH 问题）
2. PYTHONPATH 明确设置
3. PYTHONUNBUFFERED 确保实时输出
4. 最少的配置项（减少出错可能）

---

## 📞 仍然无法解决？

请提供以下信息：

1. **Cherry Studio 版本**
2. **完整的错误信息**（截图或文本）
3. **配置文件内容**
4. **诊断脚本输出**：
   ```bash
   python3 diagnose.py > diagnostic.txt
   cat diagnostic.txt
   ```
5. **手动运行测试结果**：
   ```bash
   python3 test_mcp_client.py 2>&1 | tee test_output.txt
   ```

---

## 🎯 临时解决方案：使用 HTTP 模式

如果 MCP stdio 配置遇到困难，可以先使用 HTTP 模式（功能完全相同）：

```bash
# 1. 启动 HTTP 服务
cd /Users/kenneth/Documents/MCP/MathMCP
./start.sh

# 2. 在 Cherry Studio 中添加 HTTP 工具
# 导入：manifests/tool_manifest.json
# 或使用 OpenAPI: http://localhost:8000/openapi.json
```

详细步骤见：`CHERRY_STUDIO_GUIDE.md`

---

**总结**: 您的 JSON 文件格式正确！问题可能出在 Cherry Studio 配置路径或 Python 环境上。按照上面的步骤逐一检查即可解决。



