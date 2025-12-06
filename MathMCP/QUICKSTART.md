# MCP Math Service 快速开始

## 一分钟启动

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动服务（三种方式任选其一）
./start.sh                                    # 推荐：使用启动脚本
uvicorn mcp_math.app:app --reload            # 使用 uvicorn
python -m mcp_math.app                        # 直接运行

# 3. 测试服务
curl http://localhost:8000/health
```

访问 **http://localhost:8000/docs** 查看交互式 API 文档

## 快速测试示例

### 命令行测试

```bash
# 使用预置脚本（推荐）
./examples/curl_examples.sh

# 或手动测试
curl -X POST http://localhost:8000/algebra/solve \
  -H "Content-Type: application/json" \
  -d '{"eq": "2*x + 3 = 11", "var": "x"}'
```

### Python 客户端

```bash
# 运行演示客户端
python examples/demo_client.py
```

## 核心 API 速查

| 功能 | 端点 | 示例请求 |
|------|------|----------|
| 解方程 | `/algebra/solve` | `{"eq": "2*x+3=11", "var": "x"}` |
| 化简 | `/algebra/simplify` | `{"expr": "2*x+3*x"}` |
| 展开 | `/algebra/expand` | `{"expr": "(x+1)*(x+2)"}` |
| 因式分解 | `/algebra/factor` | `{"expr": "x**2-1"}` |
| 分数运算 | `/arithmetic/fraction` | `{"a": "3/4", "b": "5/6", "op": "+"}` |
| 百分比 | `/arithmetic/percent` | `{"base": 100, "rate": 20, "mode": "increase"}` |
| 勾股定理 | `/geometry/pythagoras` | `{"known": "legs", "a": 3, "b": 4}` |
| 组合数 | `/combinatorics/ncr` | `{"n": 5, "r": 2}` |

## 常用参数

- `detail`: `"short"` 或 `"full"` - 控制步骤详细程度
- `exact`: `true` 或 `false` - 是否返回精确值（分数/根式）
- `decimals`: 整数 - 近似值的小数位数

## 响应结构

```json
{
  "ok": true,
  "result": {"exact": "...", "approx": 4.0},
  "steps": [{"op": "...", "note": "..."}],
  "display": {"latex": "..."},
  "meta": {"method": "...", "trace_id": "..."}
}
```

## 运行测试

```bash
# 所有测试
pytest

# 详细输出
pytest -v

# 特定模块
pytest tests/test_algebra.py
```

## 接入 Cherrystudio

1. 启动服务：`./start.sh`
2. 在 Cherrystudio 导入：`manifests/tool_manifest.json`
3. 配置系统提示词：复制 `examples/runtime_system_prompt.txt`
4. 开始提问！

## 故障排除

**问题：端口 8000 被占用**
```bash
uvicorn mcp_math.app:app --port 8080
```

**问题：模块导入失败**
```bash
pip install -r requirements.txt --upgrade
```

**问题：表达式解析错误**
- 使用 `**` 表示幂次（如 `x**2`）
- 使用 `*` 表示乘法（如 `2*x`）
- 分数用 `/`（如 `3/4`）

## 更多信息

详细文档请参阅 [README.md](README.md)



