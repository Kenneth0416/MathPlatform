# Cherry Studio MCP 配置检查指南

## 🔍 问题：某些模型不调用 MCP 工具

### 症状
- ✅ Claude Sonnet 4.5 调用 MCP
- ❌ GPT-4/GPT-4o 不调用 MCP
- ❌ Qwen3 8B 不调用 MCP

---

## 📋 检查清单

### 检查 1：确认 MCP 服务器已启动

```bash
# 检查 MCP 服务器进程
ps aux | grep mcp

# 或重新启动
cd /Users/kenneth/Documents/MCP/MathMCP
./run_mcp.sh
```

### 检查 2：Cherry Studio 全局 MCP 配置

1. 打开 Cherry Studio
2. 设置 → MCP 服务器
3. 确认 `math-service` 已配置且**启用**
4. 检查路径是否正确

**配置应该类似**：
```json
{
  "mcpServers": {
    "math-service": {
      "command": "python3",
      "args": ["-m", "mcp_math.mcp_server"],
      "cwd": "/Users/kenneth/Documents/MCP/MathMCP",
      "env": {}
    }
  }
}
```

### 检查 3：模型特定配置（关键！）

**问题所在**：Cherry Studio 可能需要**为每个模型单独启用 MCP**

#### 步骤：
1. Cherry Studio → 模型管理
2. 找到 GPT-4 的配置
3. 检查是否有「启用 MCP」或「启用工具」的选项
4. **确保勾选/启用**
5. 对 Qwen3 8B 重复相同操作

#### 常见设置位置：
- 模型设置 → 工具 → 启用 MCP
- 模型设置 → 高级 → MCP 服务器
- 对话设置 → 工具调用 → 启用

### 检查 4：系统提示词位置

确认系统提示词设置在：
- ✅ **全局系统提示词**（所有模型共享）
- 或
- ✅ **每个模型的专属提示词**

如果设置在「对话级别」，可能不生效。

---

## 🎯 针对不同模型的优化建议

### Claude Sonnet 4.5 ✅（已正常工作）

**状态**：工具调用能力最强
**建议**：使用完整版提示词（`cherry_studio_prompt_final.txt`）

### GPT-4 / GPT-4o ⚠️

**可能原因**：
1. Cherry Studio 未为 GPT-4 启用 MCP
2. 提示词太复杂，GPT-4 没有理解工具优先

**解决方案**：
1. **检查模型配置**（最重要）
2. 使用简化版提示词（`cherry_studio_prompt_simple.txt`）
3. 在提示词开头加粗强调：

```
**重要：你必须优先使用 MCP 工具解决数学问题！**

看到数学问题 → 立即调用相应的 MCP 工具
工具失败 → 尝试其他工具
所有工具都失败 → 才手动解题
```

### Qwen3 8B ❌（小模型）

**问题**：
1. 模型太小，工具调用能力弱
2. 可能不支持 MCP 协议
3. 即使支持，理解复杂指令的能力有限

**解决方案**：
1. **优先检查 Cherry Studio 是否支持 Qwen3 调用 MCP**
2. 使用**超简化版**提示词（`cherry_studio_prompt_simple.txt`）
3. 提示词中使用**非常直接的命令**：

```
规则1：看到数学问题，必须先用工具
规则2：工具名称和参数见下表
规则3：工具失败才手动

[简单的工具表格]
```

4. 如果仍然不调用，**可能该模型不支持 MCP**

---

## 🔧 实践测试

### 测试方法

使用同一个简单问题测试所有模型：

```
测试问题：2x + 3 = 11
```

#### 预期行为（正确）：
```
步骤1：调用 algebra_solve
参数：{"eq": "2*x+3=11", "var": "x"}
结果：x = 4
```

#### 错误行为（需要修复）：
```
直接手动计算：
2x = 11 - 3 = 8
x = 4
```

### 测试结果记录

| 模型 | 使用提示词 | 是否调用工具 | 备注 |
|------|-----------|------------|------|
| Claude Sonnet 4.5 | Final | ✅ | 完美工作 |
| GPT-4 | Simple | ? | 待测试 |
| Qwen3 8B | Simple | ? | 待测试 |

---

## 💡 推荐配置

### 配置 A：不同模型使用不同提示词

```
Claude Sonnet 4.5 → cherry_studio_prompt_final.txt（完整版）
GPT-4 → cherry_studio_prompt_simple.txt（简化版）
Qwen3 8B → cherry_studio_prompt_simple.txt（简化版）
```

### 配置 B：使用统一的简化版

```
所有模型 → cherry_studio_prompt_simple.txt
```

**优点**：
- 简单直接
- 小模型也能理解
- 降低 token 消耗

**缺点**：
- 缺少详细指导
- 可能遗漏一些边缘情况

---

## 🛠️ 逐步排查流程

### 步骤 1：验证 MCP 服务器
```bash
# 重启 MCP 服务器
cd /Users/kenneth/Documents/MCP/MathMCP
./run_mcp.sh

# 确认运行正常
echo "服务器应该在等待输入..."
```

### 步骤 2：检查 Cherry Studio 日志

1. Cherry Studio → 设置 → 开发者工具 / 日志
2. 查找错误信息
3. 搜索 "mcp" 或 "tool"

### 步骤 3：测试单个模型

1. 创建新对话
2. 选择 GPT-4
3. 粘贴简化版提示词
4. 发送测试问题：`2x + 3 = 11`
5. 观察是否调用工具

### 步骤 4：对比测试

使用**相同的提示词和问题**测试：
- Claude Sonnet 4.5（已知有效）
- GPT-4
- Qwen3 8B

对比行为差异。

### 步骤 5：检查模型配置

Cherry Studio → 模型设置 → [选择模型] → 检查：
- [ ] MCP 已启用
- [ ] 工具调用已启用
- [ ] 没有禁用函数调用

---

## 🎓 模型工具调用能力对比

| 模型 | 工具调用能力 | MCP 支持 | 建议提示词 |
|------|------------|---------|-----------|
| Claude Sonnet 4.5 | ⭐⭐⭐⭐⭐ | ✅ 优秀 | 完整版 |
| GPT-4 Turbo | ⭐⭐⭐⭐⭐ | ✅ 优秀 | 完整版/简化版 |
| GPT-4 | ⭐⭐⭐⭐ | ✅ 良好 | 简化版 |
| GPT-3.5 Turbo | ⭐⭐⭐ | ⚠️ 一般 | 简化版 |
| Qwen3 8B | ⭐⭐ | ⚠️ 可能不支持 | 简化版 |
| Qwen3 0.6B | ⭐ | ❌ 不支持 | 不推荐 |

### 关键发现

1. **Claude 和 GPT-4 Turbo**：工具调用能力最强，理解复杂提示词
2. **GPT-4**：很好，但建议用简化版提示词
3. **小于 7B 的模型**：工具调用能力弱，可能根本不支持 MCP

---

## 🚀 快速修复方案

### 立即尝试（5分钟）

1. **使用简化版提示词**
   ```bash
   cat /Users/kenneth/Documents/MCP/MathMCP/cherry_studio_prompt_simple.txt
   ```

2. **复制到所有模型**
   - Cherry Studio → 设置 → 系统提示词
   - 或为每个模型单独设置

3. **测试 GPT-4**
   ```
   问题：2x + 3 = 11
   预期：调用 algebra_solve
   ```

4. **如果 GPT-4 仍不调用**
   - 检查模型配置是否启用 MCP
   - 查看 Cherry Studio 日志
   - 可能该版本/配置不支持 MCP

5. **Qwen3 8B**
   - 如果用简化版仍不调用，**可能不支持 MCP**
   - 考虑换用 Claude 或 GPT-4

---

## 📞 进一步诊断

### 如果 GPT-4 确认已启用 MCP 但仍不调用

可能需要：

1. **更明确的指令**：在提示词最开头加：
   ```
   【强制规则】看到数学问题，必须先调用 MCP 工具，不要直接手动计算！
   ```

2. **检查 Cherry Studio 版本**：确保使用支持 MCP 的版本

3. **联系 Cherry Studio 支持**：确认 GPT-4 的 MCP 集成是否正常

4. **尝试其他客户端**：如果可能，用其他支持 MCP 的客户端测试

---

## 📋 结论

### 最可能的原因

1. **Cherry Studio 配置问题**（80%）
   - 未为 GPT-4/Qwen3 启用 MCP
   - 需要在模型设置中单独启用

2. **提示词太复杂**（15%）
   - 小模型理解不了
   - 解决：使用简化版

3. **模型不支持**（5%）
   - Qwen3 8B 可能不支持 MCP
   - 解决：换用 Claude 或 GPT-4

### 建议行动

1. ✅ 立即使用简化版提示词
2. ✅ 检查每个模型的 MCP 启用状态
3. ✅ 用简单问题测试
4. ✅ 如果仍不工作，查看日志或换用 Claude

---

**关键：不是提示词的问题，很可能是 Cherry Studio 的配置问题！**


