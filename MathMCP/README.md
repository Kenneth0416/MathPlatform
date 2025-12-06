# MCP Math Service

**本地可运行的 MCP 风格数学问题求解服务**

一个基于 FastAPI + SymPy 的数学服务，提供 HTTP/JSON 接口，覆盖初中数学常见题型。设计上遵循 MCP (Model Context Protocol) 风格，便于后续接入 Cherrystudio 等 MCP Host。

## 特性

✨ **题型覆盖全面**
- 代数：化简、展开、因式分解、解方程（一次/二次）
- 算术：分数运算、百分比/增长率计算
- 几何：勾股定理、相似三角形、圆心角/圆周角
- 组合：排列数 nPr、组合数 nCr

🔒 **安全可靠**
- 禁止任意 `eval`，使用 SymPy 安全解析
- 白名单过滤，仅允许数学函数和符号
- 统一的错误处理和响应格式

📊 **详细步骤**
- 支持 `detail="short"` 和 `detail="full"` 两档
- 每个计算返回完整的步骤说明
- 提供 LaTeX 格式渲染

🎯 **精确与近似**
- 默认返回精确结果（分数/根式）
- 可选提供近似小数值
- 自定义小数位数

🔌 **易于集成**
- 提供 `manifests/tool_manifest.json` 工具清单
- 统一的 JSON 响应结构（包含 result、steps、display、meta）
- CORS 支持，便于前端集成

## 项目结构

```
mcp_math/
├── app.py                      # FastAPI 主应用
├── core/                       # 核心模块
│   ├── schema.py              # 数据结构与响应模型
│   ├── parser.py              # 安全表达式解析
│   ├── latex.py               # LaTeX 渲染
│   ├── algebra.py             # 代数运算
│   ├── arithmetic.py          # 算术运算
│   ├── geometry.py            # 几何计算
│   └── combinatorics.py       # 组合数学
manifests/
└── tool_manifest.json         # MCP 工具清单
examples/
├── demo_client.py             # 演示客户端
└── runtime_system_prompt.txt  # 运行时提示词
tests/                         # 单元测试
requirements.txt               # 依赖包
README.md                      # 本文档
```

## 快速开始

### 安装

```bash
# 克隆项目
cd MathMCP

# 安装依赖（建议使用虚拟环境）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 启动服务

```bash
# 方法 1：使用 uvicorn（推荐，支持热重载）
uvicorn mcp_math.app:app --reload --host 0.0.0.0 --port 8000

# 方法 2：直接运行
python -m mcp_math.app
```

服务启动后访问：
- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

### 快速测试

#### 使用 curl

```bash
# 解方程
curl -X POST http://localhost:8000/algebra/solve \
  -H "Content-Type: application/json" \
  -d '{"eq": "2*x + 3 = 11", "var": "x", "detail": "full"}'

# 分数相加
curl -X POST http://localhost:8000/arithmetic/fraction \
  -H "Content-Type: application/json" \
  -d '{"a": "3/4", "b": "5/6", "op": "+", "detail": "full"}'

# 勾股定理
curl -X POST http://localhost:8000/geometry/pythagoras \
  -H "Content-Type: application/json" \
  -d '{"known": "legs", "a": 3, "b": 4, "detail": "full"}'

# 组合数
curl -X POST http://localhost:8000/combinatorics/ncr \
  -H "Content-Type: application/json" \
  -d '{"n": 5, "r": 2}'
```

#### 使用演示客户端

```bash
# 运行演示客户端（包含自然语言路由）
python examples/demo_client.py
```

演示客户端会自动运行多个示例查询，展示如何从自然语言问题路由到相应的工具端点。

## API 端点

### 代数运算

| 端点 | 描述 | 示例 |
|------|------|------|
| `POST /algebra/simplify` | 化简表达式 | `{"expr": "2*x + 3*x"}` |
| `POST /algebra/expand` | 展开表达式 | `{"expr": "(x+1)*(x+2)"}` |
| `POST /algebra/factor` | 因式分解 | `{"expr": "x**2 - 1"}` |
| `POST /algebra/solve` | 解方程 | `{"eq": "2*x+3=11", "var": "x"}` |

### 算术运算

| 端点 | 描述 | 示例 |
|------|------|------|
| `POST /arithmetic/fraction` | 分数运算 | `{"a": "3/4", "b": "5/6", "op": "+"}` |
| `POST /arithmetic/percent` | 百分比计算 | `{"base": 100, "rate": 20, "mode": "increase"}` |

### 几何计算

| 端点 | 描述 | 示例 |
|------|------|------|
| `POST /geometry/pythagoras` | 勾股定理 | `{"known": "legs", "a": 3, "b": 4}` |
| `POST /geometry/similar` | 相似三角形 | 见下方详细说明 |
| `POST /geometry/circle_angles` | 圆心角/圆周角 | `{"center_angle": 60, "query": "inscribed"}` |

### 组合数学

| 端点 | 描述 | 示例 |
|------|------|------|
| `POST /combinatorics/ncr` | 组合数 C(n,r) | `{"n": 5, "r": 2}` |
| `POST /combinatorics/npr` | 排列数 P(n,r) | `{"n": 5, "r": 2}` |

### 数值计算

| 端点 | 描述 | 示例 |
|------|------|------|
| `POST /eval/numeric` | 安全数值求值 | `{"expr": "sqrt(2) + pi"}` |

## 响应格式

### 成功响应

```json
{
  "ok": true,
  "task": "algebra.solve",
  "result": {
    "exact": "x = 4",
    "approx": 4.0,
    "solutions": ["x = 4"]
  },
  "steps": [
    {
      "op": "move_terms",
      "in": "2*x + 3 = 11",
      "out": "2*x = 8",
      "note": "移项"
    },
    {
      "op": "solve",
      "in": "2*x = 8",
      "out": "x = 4",
      "note": "系数化为1"
    }
  ],
  "display": {
    "latex": "\\{x = 4\\}",
    "latex_steps": ["2x+3=11 \\Rightarrow 2x=8", "x=4"]
  },
  "meta": {
    "method": "linear_equation",
    "strategy_hints": ["移项", "系数化为1", "代回原式检验"],
    "angle_mode": "deg",
    "units": null,
    "trace_id": "uuid-here",
    "version": "0.1.0",
    "warnings": [],
    "intermediate": null
  }
}
```

### 错误响应

```json
{
  "ok": false,
  "error": {
    "code": "PARSE_ERROR",
    "message": "表达式解析失败: ...",
    "hint": "请检查输入参数是否正确"
  },
  "trace_id": "uuid-here"
}
```

## 详细示例

### 解二次方程（含判别式）

```bash
curl -X POST http://localhost:8000/algebra/solve \
  -H "Content-Type: application/json" \
  -d '{
    "eq": "x^2 - 5*x + 6 = 0",
    "var": "x",
    "method": "auto",
    "detail": "full"
  }'
```

返回的 `meta.intermediate.discriminant` 包含判别式值。

### 相似三角形

```bash
curl -X POST http://localhost:8000/geometry/similar \
  -H "Content-Type: application/json" \
  -d '{
    "tri1": {"AB": 3, "BC": 4, "CA": 5},
    "tri2": {"DE": 6, "EF": null, "FD": 10},
    "mapping": {"A": "D", "B": "E", "C": "F"},
    "query": "EF",
    "detail": "full"
  }'
```

返回的 `meta.scale_k` 包含相似比。

## 运行测试

```bash
# 运行所有测试
pytest

# 运行特定模块测试
pytest tests/test_algebra.py

# 显示详细输出
pytest -v

# 显示覆盖率
pytest --cov=mcp_math tests/
```

## 接入 Cherry Studio

### 方式一：MCP stdio 协议（推荐）✨

**标准 MCP 服务器模式，原生集成**

1. **配置 MCP 服务器**：
   ```bash
   # 复制配置文件
   cp mcp-servers.json ~/.config/cherry-studio/mcp-servers.json
   
   # 编辑配置，修改路径为您的实际路径
   ```

2. **重启 Cherry Studio**：
   - Cherry Studio 自动启动 MCP 服务器
   - 自动发现 11 个数学工具
   - 查看状态：设置 → MCP 服务器 → math-service

3. **直接使用**：
   ```
   解方程 2x + 3 = 11
   ```

**详细说明**：查看 `CHERRY_STUDIO_MCP_SETUP.md`

### 方式二：HTTP 工具模式

**适合开发和调试**

1. **启动 HTTP 服务**：
   ```bash
   ./start.sh
   ```

2. **导入工具清单**：
   - 在 Cherry Studio 中添加 HTTP 工具
   - 导入 `manifests/tool_manifest.json`
   - 或使用 OpenAPI URL: `http://localhost:8000/openapi.json`

3. **配置系统提示词**：
   - 复制 `examples/runtime_system_prompt.txt` 内容
   - 粘贴到 Cherry Studio 的系统提示词配置

**详细说明**：查看 `CHERRY_STUDIO_GUIDE.md`

## 表达式语法

- **幂次**：使用 `**` 或 `^`（如 `x**2` 或 `x^2` 表示 x²）
- **乘法**：可以省略或使用 `*`（如 `2*x` 或 `2x`）
- **分数**：使用斜杠（如 `3/4`）
- **根号**：使用 `sqrt()`（如 `sqrt(2)`）
- **三角函数**：`sin()`, `cos()`, `tan()` 等
- **常数**：`pi`, `e`

## 参数说明

### 通用参数

- `detail`: `"short"` | `"full"` - 步骤详细程度（默认 `"short"`）
- `exact`: `true` | `false` - 是否返回精确结果（默认 `true`）
- `decimals`: 整数 - 小数位数（默认 `4`）
- `language`: 语言代码（默认 `"zh"`）

### 方程求解

- `method`: `"auto"` | `"quadratic_formula"` | `"factor"`
  - `auto`: 自动选择最优方法
  - `quadratic_formula`: 强制使用求根公式
  - `factor`: 强制尝试因式分解

### 几何计算

- `angle_mode`: `"deg"` | `"rad"` - 角度模式（默认 `"deg"`）

## 安全性

本服务采取以下安全措施：

1. **禁止任意代码执行**：不使用 `eval()` 或 `exec()`
2. **白名单过滤**：仅允许预定义的数学函数和符号
3. **输入清理**：自动检测和拒绝危险关键字
4. **SymPy 安全解析**：使用 SymPy 的受限解析模式
5. **异常处理**：所有异常都被捕获并返回标准错误格式

## 下一步开发

### 短期计划

- [ ] 添加更多题型：三角恒等变换、不等式求解
- [ ] 支持多变量方程组
- [ ] 增强步骤生成的一致性
- [ ] 添加步骤校验机制

### 长期计划

- [ ] 迁移到正式 MCP Host
  - 保持 schema 结构不变
  - 使用 MCP transport 层替代 FastAPI
  - 实现 MCP capability negotiation
  - 添加工具发现机制
- [ ] 支持图形渲染（几何图形、函数图像）
- [ ] 添加交互式求解器
- [ ] 多语言支持（英语、日语等）

## MCP Host 适配说明

代码中已标注 `TODO: MCP Host 适配点`，关键迁移步骤：

1. **Schema 保持不变**：`core/schema.py` 的数据结构可直接用于 MCP
2. **工具定义**：将 FastAPI 端点转换为 MCP 工具定义（参考 `tool_manifest.json`）
3. **Transport 层**：用 MCP 的 stdio/HTTP transport 替换 FastAPI
4. **能力协商**：实现 MCP 的 capability negotiation
5. **工具发现**：实现 MCP 的 `list_tools` 方法

## 常见问题

**Q: 为什么有些表达式解析失败？**
A: 请确保使用正确的语法（如 `**` 表示幂次，`*` 表示乘法）。避免使用空格或特殊符号。

**Q: 如何获得更详细的步骤？**
A: 设置 `"detail": "full"` 参数。

**Q: 支持复数吗？**
A: 当前版本主要面向初中数学，暂不支持复数。未来版本会添加。

**Q: 可以修改端口吗？**
A: 可以，启动时指定：`uvicorn mcp_math.app:app --port 8080`

**Q: 如何贡献代码？**
A: 欢迎提交 Pull Request！请确保代码通过测试并遵循现有的代码风格。

## 技术栈

- **Web 框架**：FastAPI 0.104+
- **数学引擎**：SymPy 1.12
- **数据验证**：Pydantic 2.5+
- **HTTP 服务器**：Uvicorn
- **测试框架**：pytest 7.4+

## 许可证

MIT License

## 致谢

- [SymPy](https://www.sympy.org/) - 强大的 Python 符号计算库
- [FastAPI](https://fastapi.tiangolo.com/) - 现代、高性能的 Web 框架
- [Model Context Protocol](https://modelcontextprotocol.io/) - AI 工具集成协议

---

**问题反馈**：请在项目中提交 Issue

**开发者**：MCP Math Team

**版本**：0.1.0

