"""FastAPI 主应用 - MCP 风格数学服务 HTTP 接口"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import Dict, Any

from .core.schema import (
    SimplifyRequest, ExpandRequest, FactorRequest, SolveRequest,
    FractionRequest, PercentRequest,
    PythagorasRequest, SimilarRequest, CircleAnglesRequest,
    CombinatoricsRequest, EvalRequest,
    ErrorCode, create_error_response
)
from .core.algebra import (
    simplify_expression, expand_expression, factor_expression, solve_equation
)
from .core.arithmetic import fraction_operation, percent_calculation
from .core.geometry import pythagoras_theorem, similar_triangles, circle_angles
from .core.combinatorics import combination, permutation
from .core.parser import parse_expression

# 创建 FastAPI 应用
app = FastAPI(
    title="MCP Math Service",
    description="本地可运行的 MCP 风格数学问题求解服务",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置 CORS（便于前端联调）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局异常处理
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """处理值错误"""
    error_resp = create_error_response(
        code=ErrorCode.PARSE_ERROR,
        message=str(exc),
        hint="请检查输入参数是否正确"
    )
    return JSONResponse(
        status_code=400,
        content=error_resp.model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理通用异常"""
    error_resp = create_error_response(
        code=ErrorCode.UNSUPPORTED,
        message=f"服务器错误: {str(exc)}",
        hint="请联系管理员"
    )
    return JSONResponse(
        status_code=500,
        content=error_resp.model_dump()
    )


# 健康检查
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """健康检查端点"""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "MCP Math Service"
    }


# 代数运算端点
@app.post("/algebra/simplify")
async def algebra_simplify(req: SimplifyRequest) -> Dict[str, Any]:
    """
    化简表达式
    
    示例: {"expr": "2*x + 3*x"}
    """
    try:
        result = simplify_expression(
            req.expr,
            detail=req.detail,
            exact=req.exact,
            decimals=req.decimals,
            language=req.language
        )
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/algebra/expand")
async def algebra_expand(req: ExpandRequest) -> Dict[str, Any]:
    """
    展开表达式
    
    示例: {"expr": "(x+1)*(x+2)"}
    """
    try:
        result = expand_expression(
            req.expr,
            detail=req.detail,
            exact=req.exact,
            language=req.language
        )
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/algebra/factor")
async def algebra_factor(req: FactorRequest) -> Dict[str, Any]:
    """
    因式分解
    
    示例: {"expr": "x**2 - 1"}
    """
    try:
        result = factor_expression(
            req.expr,
            detail=req.detail,
            exact=req.exact,
            language=req.language
        )
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/algebra/solve")
async def algebra_solve(req: SolveRequest) -> Dict[str, Any]:
    """
    解方程
    
    示例: {"eq": "2*x + 3 = 11", "var": "x"}
    """
    try:
        result = solve_equation(
            req.eq,
            var=req.var,
            method=req.method,
            detail=req.detail,
            exact=req.exact,
            decimals=req.decimals,
            language=req.language
        )
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 算术运算端点
@app.post("/arithmetic/fraction")
async def arithmetic_fraction(req: FractionRequest) -> Dict[str, Any]:
    """
    分数运算

    示例: {"a": "3/4", "b": "5/6", "op": "+"}
    """
    print(f"🔧 MCP Server [arithmetic_fraction] Request: {req.model_dump()}")

    try:
        result = fraction_operation(
            req.a,
            req.b,
            req.op,
            detail=req.detail,
            exact=req.exact
        )
        print(f"✅ MCP Server [arithmetic_fraction] Success: {result.model_dump(by_alias=True)}")
        return result.model_dump(by_alias=True)
    except ValueError as e:
        error_detail = f"Validation error: {str(e)}"
        print(f"❌ MCP Server [arithmetic_fraction] ValueError: {error_detail}")
        raise HTTPException(status_code=400, detail=error_detail)
    except Exception as e:
        error_detail = f"Internal error: {str(e)}"
        print(f"❌ MCP Server [arithmetic_fraction] Exception: {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)


@app.post("/arithmetic/percent")
async def arithmetic_percent(req: PercentRequest) -> Dict[str, Any]:
    """
    百分比计算
    
    示例: {"base": 100, "rate": 20, "mode": "increase"}
    """
    try:
        result = percent_calculation(
            req.base,
            req.rate,
            req.mode,
            decimals=req.decimals
        )
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 几何计算端点
@app.post("/geometry/pythagoras")
async def geometry_pythagoras(req: PythagorasRequest) -> Dict[str, Any]:
    """
    勾股定理计算

    示例: {"known": "legs", "a": 3, "b": 4}
    """
    import json
    print(f"🔧 MCP Server [geometry_pythagoras] Request: {req.model_dump()}")

    try:
        result = pythagoras_theorem(
            req.known,
            a=req.a,
            b=req.b,
            c=req.c,
            detail=req.detail
        )
        print(f"✅ MCP Server [geometry_pythagoras] Success: {result.model_dump(by_alias=True)}")
        return result.model_dump(by_alias=True)
    except ValueError as e:
        error_detail = f"Validation error: {str(e)}"
        print(f"❌ MCP Server [geometry_pythagoras] ValueError: {error_detail}")
        raise HTTPException(status_code=400, detail=error_detail)
    except Exception as e:
        error_detail = f"Internal error: {str(e)}"
        print(f"❌ MCP Server [geometry_pythagoras] Exception: {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)


@app.post("/geometry/similar")
async def geometry_similar(req: SimilarRequest) -> Dict[str, Any]:
    """
    相似三角形计算
    
    示例: {
        "tri1": {"AB": 3, "BC": 4, "CA": 5},
        "tri2": {"DE": 6, "EF": null, "FD": 10},
        "mapping": {"A": "D", "B": "E", "C": "F"},
        "query": "EF"
    }
    """
    try:
        result = similar_triangles(
            req.tri1,
            req.tri2,
            req.mapping,
            req.query,
            detail=req.detail
        )
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/geometry/circle_angles")
async def geometry_circle_angles(req: CircleAnglesRequest) -> Dict[str, Any]:
    """
    圆心角与圆周角计算
    
    示例: {"center_angle": 60, "query": "inscribed"}
    """
    try:
        result = circle_angles(
            center_angle=req.center_angle,
            inscribed_angle=req.inscribed_angle,
            mode=req.mode,
            query=req.query
        )
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 组合数学端点
@app.post("/combinatorics/ncr")
async def combinatorics_ncr(req: CombinatoricsRequest) -> Dict[str, Any]:
    """
    组合数 C(n,r)
    
    示例: {"n": 5, "r": 2}
    """
    try:
        result = combination(req.n, req.r)
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/combinatorics/npr")
async def combinatorics_npr(req: CombinatoricsRequest) -> Dict[str, Any]:
    """
    排列数 P(n,r)
    
    示例: {"n": 5, "r": 2}
    """
    try:
        result = permutation(req.n, req.r)
        return result.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 数值计算端点
@app.post("/eval/numeric")
async def eval_numeric(req: EvalRequest) -> Dict[str, Any]:
    """
    数值计算（安全求值）
    
    示例: {"expr": "sqrt(2) + pi"}
    """
    try:
        expr = parse_expression(req.expr)
        result_val = float(expr.evalf(req.precision))
        
        from .core.schema import Step, Result, Display, Meta, SuccessResponse
        from .core.latex import to_latex
        
        response = SuccessResponse(
            task="eval.numeric",
            result=Result(
                exact=str(expr),
                approx=result_val
            ),
            steps=[Step(
                op="eval",
                input=req.expr,
                out=str(result_val),
                note="数值计算"
            )],
            display=Display(
                latex=to_latex(expr),
                latex_steps=[f"{to_latex(expr)} \\approx {result_val}"]
            ),
            meta=Meta(
                method="numeric_eval",
                strategy_hints=["安全表达式解析", "数值求值"]
            )
        )
        return response.model_dump(by_alias=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# TODO: MCP Host 适配点
# 当迁移到正式 MCP Host 时：
# 1. 将 HTTP 端点转换为 MCP 工具定义
# 2. 保持 schema 结构不变
# 3. 使用 MCP 的 transport 层替代 FastAPI
# 4. 添加 MCP 的 capability negotiation
# 5. 实现 MCP 的工具发现机制


def main():
    """启动服务"""
    uvicorn.run(
        "mcp_math.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()



