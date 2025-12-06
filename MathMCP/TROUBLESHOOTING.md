# 故障排查指南

## 问题：导入 JSON 时报错

### 可能的情况和解决方案

---

## 情况 1: 在 Cherry Studio 中配置 MCP 服务器时报错

### 症状
- Cherry Studio 显示"未连接"或错误状态
- 日志中提到 JSON 或导入相关错误

### 解决方案

**Step 1: 检查 Python 路径**

编辑 `~/.config/cherry-studio/mcp-servers.json`：

```json
{
  "mcpServers": {
    "math-service": {
      "command": "python3",  // 或使用完整路径
      "args": ["-m", "mcp_math.mcp_server"],
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP",
      "env": {
        "PYTHONPATH": "/Users/kenneth/Documents/MCP/MathMCP"
      }
    }
  }
}
```

**Step 2: 使用完整的 Python 路径**

查找 Python 路径：
```bash
which python3
# 输出：/Library/Developer/CommandLineTools/usr/bin/python3
```

在配置中使用完整路径：
```json
{
  "command": "/Library/Developer/CommandLineTools/usr/bin/python3"
}
```

**Step 3: 测试命令是否能运行**

```bash
cd /Users/kenneth/Documents/MCP/MathMCP
/Library/Developer/CommandLineTools/usr/bin/python3 -m mcp_math.mcp_server
```

如果报错，说明环境有问题。

---

## 情况 2: 在虚拟环境中运行

### 症状
- 使用虚拟环境时出现导入错误
- 依赖包找不到

### 解决方案

**激活虚拟环境后再配置**：

```bash
cd /Users/kenneth/Documents/MCP/MathMCP
source venv/bin/activate
pip install -r requirements.txt
```

然后在 Cherry Studio 配置中使用虚拟环境的 Python：

```json
{
  "command": "/Users/kenneth/Documents/MCP/MathMCP/venv/bin/python",
  "cwd": "/Users/kenneth/Documents/MCP/MathMCP"
}
```

---

## 情况 3: PYTHONPATH 未设置

### 症状
- `ModuleNotFoundError: No module named 'mcp_math'`
- 找不到项目模块

### 解决方案

**方法 A: 在配置中设置 PYTHONPATH**

```json
{
  "env": {
    "PYTHONPATH": "/Users/kenneth/Documents/MCP/MathMCP"
  }
}
```

**方法 B: 在命令行设置**

```bash
export PYTHONPATH=/Users/kenneth/Documents/MCP/MathMCP
python3 -m mcp_math.mcp_server
```

**方法 C: 创建启动脚本**

创建 `start_mcp.sh`：

```bash
#!/bin/bash
cd /Users/kenneth/Documents/MCP/MathMCP
export PYTHONPATH=/Users/kenneth/Documents/MCP/MathMCP
python3 -m mcp_math.mcp_server
```

然后在 Cherry Studio 中使用：

```json
{
  "command": "/Users/kenneth/Documents/MCP/MathMCP/start_mcp.sh"
}
```

---

## 情况 4: Pydantic 版本冲突

### 症状
- 启动时出现 Pydantic 相关警告或错误
- JSON 序列化失败

### 解决方案

**检查 Pydantic 版本**：

```bash
python3 -c "import pydantic; print(pydantic.__version__)"
```

**升级 Pydantic**：

```bash
pip3 install --upgrade pydantic
```

**或安装兼容版本**：

```bash
pip3 install "pydantic>=2.5.0"
```

---

## 情况 5: JSON 编码问题（中文字符）

### 症状
- 处理中文字符时出错
- UnicodeEncodeError

### 解决方案

**设置环境变量**：

```json
{
  "env": {
    "PYTHONIOENCODING": "utf-8",
    "LANG": "zh_CN.UTF-8"
  }
}
```

---

## 情况 6: 权限问题

### 症状
- Permission denied
- 无法执行

### 解决方案

**检查文件权限**：

```bash
ls -l /Users/kenneth/Documents/MCP/MathMCP/mcp_math/mcp_server.py
```

**确保有执行权限**：

```bash
chmod +x /Users/kenneth/Documents/MCP/MathMCP/mcp_math/mcp_server.py
```

---

## 完整的诊断流程

### 1. 运行诊断脚本

```bash
cd /Users/kenneth/Documents/MCP/MathMCP
python3 diagnose.py
```

查看输出，确认所有 ✓ 标记。

### 2. 手动测试 MCP 服务器

```bash
cd /Users/kenneth/Documents/MCP/MathMCP
python3 -m mcp_math.mcp_server
```

如果卡住不动（等待输入），说明启动成功。按 Ctrl+C 退出。

### 3. 运行 MCP 客户端测试

```bash
python3 test_mcp_client.py
```

应该看到：
```
✅ 所有测试通过！
```

### 4. 检查 Cherry Studio 日志

查看 Cherry Studio 的日志文件：
- macOS: `~/Library/Logs/cherry-studio/`
- 查找错误信息

---

## 常见错误信息及解决方案

### 错误 1: `ModuleNotFoundError: No module named 'json'`

**原因**: Python 安装不完整（极少见）

**解决方案**:
```bash
# 重新安装 Python 或使用系统 Python
brew install python3  # macOS with Homebrew
```

### 错误 2: `ModuleNotFoundError: No module named 'mcp_math'`

**原因**: PYTHONPATH 未设置

**解决方案**: 参见"情况 3"

### 错误 3: `JSONDecodeError`

**原因**: JSON 格式错误

**解决方案**:
- 检查配置文件格式
- 使用 JSON 验证器验证

```bash
# 验证 JSON 格式
python3 -c "import json; json.load(open('mcp-servers.json'))"
```

### 错误 4: `ImportError: cannot import name 'X' from 'pydantic'`

**原因**: Pydantic 版本不兼容

**解决方案**:
```bash
pip3 install --upgrade pydantic
```

---

## 快速修复命令

```bash
# 1. 进入项目目录
cd /Users/kenneth/Documents/MCP/MathMCP

# 2. 设置环境变量
export PYTHONPATH=/Users/kenneth/Documents/MCP/MathMCP

# 3. 重新安装依赖
pip3 install -r requirements.txt --upgrade

# 4. 运行诊断
python3 diagnose.py

# 5. 测试 MCP 服务器
python3 test_mcp_client.py
```

---

## 仍然有问题？

### 提供以下信息以便进一步诊断：

1. **完整的错误信息**
   ```bash
   # 复制完整的错误输出
   ```

2. **Python 版本**
   ```bash
   python3 --version
   ```

3. **诊断脚本输出**
   ```bash
   python3 diagnose.py > diagnostic_output.txt
   ```

4. **Cherry Studio 配置**
   ```bash
   cat ~/.config/cherry-studio/mcp-servers.json
   ```

5. **运行环境**
   - 操作系统版本
   - 是否使用虚拟环境
   - Cherry Studio 版本

---

## 临时解决方案：使用 HTTP 模式

如果 MCP stdio 模式遇到问题，可以暂时使用 HTTP 模式：

```bash
# 启动 HTTP 服务
./start.sh

# 在 Cherry Studio 中配置 HTTP 工具
# 导入：manifests/tool_manifest.json
```

详见：`CHERRY_STUDIO_GUIDE.md`

---

## 参考文档

- **MCP 配置指南**: `CHERRY_STUDIO_MCP_SETUP.md`
- **完整文档**: `README.md`
- **HTTP 模式**: `CHERRY_STUDIO_GUIDE.md`



