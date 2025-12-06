"""代数运算：化简、展开、因式分解、解方程"""

from typing import List, Dict, Any, Optional
import sympy as sp
from .parser import parse_expression, parse_equation
from .latex import to_latex, equation_to_latex, solution_to_latex
from .schema import Step, Result, Display, Meta, SuccessResponse


def simplify_expression(
    expr_str: str,
    detail: str = "short",
    exact: bool = True,
    decimals: int = 4,
    language: str = "zh"
) -> SuccessResponse:
    """
    化简表达式
    
    Args:
        expr_str: 表达式字符串
        detail: 详细程度
        exact: 是否返回精确结果
        decimals: 小数位数
        language: 语言
        
    Returns:
        统一响应结构
    """
    expr = parse_expression(expr_str)
    simplified = sp.simplify(expr)
    
    steps = []
    if detail == "full":
        steps.append(Step(
            op="parse",
            input=expr_str,
            out=str(expr),
            note="解析表达式"
        ))
        steps.append(Step(
            op="simplify",
            input=str(expr),
            out=str(simplified),
            note="应用化简规则",
            latex=f"{to_latex(expr)} \\Rightarrow {to_latex(simplified)}"
        ))
    else:
        steps.append(Step(
            op="simplify",
            input=expr_str,
            out=str(simplified),
            note="化简"
        ))
    
    result = Result(
        exact=str(simplified),
        approx=float(simplified.evalf(decimals)) if not exact and simplified.is_number else None
    )
    
    display = Display(
        latex=to_latex(simplified),
        latex_steps=[to_latex(simplified)]
    )
    
    meta = Meta(
        method="simplify",
        strategy_hints=["合并同类项", "化简分数", "约简根式"]
    )
    
    return SuccessResponse(
        task="algebra.simplify",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def expand_expression(
    expr_str: str,
    detail: str = "short",
    exact: bool = True,
    language: str = "zh"
) -> SuccessResponse:
    """
    展开表达式
    
    Args:
        expr_str: 表达式字符串
        detail: 详细程度
        exact: 是否返回精确结果
        language: 语言
        
    Returns:
        统一响应结构
    """
    expr = parse_expression(expr_str)
    expanded = sp.expand(expr)
    
    steps = []
    if detail == "full":
        steps.append(Step(
            op="parse",
            input=expr_str,
            out=str(expr),
            note="解析表达式"
        ))
        steps.append(Step(
            op="expand",
            input=str(expr),
            out=str(expanded),
            note="应用分配律展开",
            latex=f"{to_latex(expr)} \\Rightarrow {to_latex(expanded)}"
        ))
    else:
        steps.append(Step(
            op="expand",
            input=expr_str,
            out=str(expanded),
            note="展开"
        ))
    
    result = Result(exact=str(expanded))
    
    display = Display(
        latex=to_latex(expanded),
        latex_steps=[f"{to_latex(expr)} \\Rightarrow {to_latex(expanded)}"]
    )
    
    meta = Meta(
        method="expand",
        strategy_hints=["应用分配律", "展开多项式"]
    )
    
    return SuccessResponse(
        task="algebra.expand",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def factor_expression(
    expr_str: str,
    detail: str = "short",
    exact: bool = True,
    language: str = "zh"
) -> SuccessResponse:
    """
    因式分解
    
    Args:
        expr_str: 表达式字符串
        detail: 详细程度
        exact: 是否返回精确结果
        language: 语言
        
    Returns:
        统一响应结构
    """
    expr = parse_expression(expr_str)
    factored = sp.factor(expr)
    
    steps = []
    if detail == "full":
        steps.append(Step(
            op="parse",
            input=expr_str,
            out=str(expr),
            note="解析表达式"
        ))
        steps.append(Step(
            op="factor",
            input=str(expr),
            out=str(factored),
            note="提取公因式并分解",
            latex=f"{to_latex(expr)} = {to_latex(factored)}"
        ))
    else:
        steps.append(Step(
            op="factor",
            input=expr_str,
            out=str(factored),
            note="因式分解"
        ))
    
    result = Result(exact=str(factored))
    
    display = Display(
        latex=to_latex(factored),
        latex_steps=[f"{to_latex(expr)} = {to_latex(factored)}"]
    )
    
    meta = Meta(
        method="factor",
        strategy_hints=["提取公因式", "配方法", "十字相乘法"]
    )
    
    return SuccessResponse(
        task="algebra.factor",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def solve_equation(
    eq_str: str,
    var: str = "x",
    method: str = "auto",
    detail: str = "short",
    exact: bool = True,
    decimals: int = 4,
    language: str = "zh"
) -> SuccessResponse:
    """
    解方程
    
    Args:
        eq_str: 方程字符串
        var: 变量名
        method: 求解方法
        detail: 详细程度
        exact: 是否返回精确结果
        decimals: 小数位数
        language: 语言
        
    Returns:
        统一响应结构
    """
    left_expr, right_expr = parse_equation(eq_str, var)
    x = sp.Symbol(var)
    
    # 转换为标准形式 f(x) = 0
    equation = left_expr - right_expr
    
    steps = []
    intermediate = {}
    strategy_hints = []
    
    # 判断方程类型
    degree = sp.degree(equation, x)
    
    if detail == "full":
        steps.append(Step(
            op="parse",
            input=eq_str,
            out=equation_to_latex(left_expr, right_expr),
            note="解析方程"
        ))
    
    if degree == 1:
        # 一次方程
        method_used = "linear_equation"
        strategy_hints = ["移项", "系数化为1", "代回原式检验"]
        
        # 求解
        solutions = sp.solve(equation, x)
        
        if detail == "full":
            # 移项
            steps.append(Step(
                op="move_terms",
                input=equation_to_latex(left_expr, right_expr),
                out=f"{to_latex(equation)} = 0",
                note="移项，化为标准形式"
            ))
        
        steps.append(Step(
            op="solve",
            input=f"{to_latex(equation)} = 0",
            out=f"{var} = {to_latex(solutions[0])}",
            note="求解"
        ))
        
    elif degree == 2:
        # 二次方程
        # 提取系数
        a = equation.coeff(x, 2)
        b = equation.coeff(x, 1)
        c = equation.coeff(x, 0)
        
        # 判别式
        discriminant = b**2 - 4*a*c
        intermediate['discriminant'] = float(discriminant.evalf())
        
        if detail == "full":
            steps.append(Step(
                op="standard_form",
                input=equation_to_latex(left_expr, right_expr),
                out=f"{to_latex(a)}{var}^2 + {to_latex(b)}{var} + {to_latex(c)} = 0",
                note=f"化为标准形式，a={a}, b={b}, c={c}"
            ))
            steps.append(Step(
                op="discriminant",
                input=f"Δ = b² - 4ac",
                out=f"Δ = {to_latex(discriminant)}",
                note=f"计算判别式"
            ))
        
        if method == "factor" or (method == "auto" and discriminant >= 0 and discriminant.is_integer and sp.sqrt(discriminant).is_integer):
            # 尝试因式分解
            method_used = "factor"
            strategy_hints = ["因式分解", "零乘法则"]
            factored = sp.factor(equation)
            solutions = sp.solve(equation, x)
            
            if detail == "full":
                steps.append(Step(
                    op="factor",
                    input=f"{to_latex(equation)} = 0",
                    out=f"{to_latex(factored)} = 0",
                    note="因式分解"
                ))
            
            steps.append(Step(
                op="zero_product",
                input=f"{to_latex(factored)} = 0",
                out=f"{var} = {to_latex(solutions[0])} 或 {var} = {to_latex(solutions[1])}",
                note="根据零乘法则求解"
            ))
        else:
            # 使用求根公式
            method_used = "quadratic_formula"
            strategy_hints = ["使用求根公式", f"判别式Δ={float(discriminant.evalf(4))}"]
            solutions = sp.solve(equation, x)
            
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input=f"x = \\frac{{-b \\pm \\sqrt{{\\Delta}}}}{{2a}}",
                    out=f"x = \\frac{{-({to_latex(b)}) \\pm \\sqrt{{{to_latex(discriminant)}}}}}{{2({to_latex(a)})}}",
                    note="代入求根公式"
                ))
            
            if len(solutions) > 0:
                sol_strs = [f"{var} = {to_latex(sol)}" for sol in solutions]
                steps.append(Step(
                    op="compute",
                    input="应用求根公式",
                    out=" 或 ".join(sol_strs),
                    note="计算结果"
                ))
    else:
        # 其他次数，直接求解
        method_used = "general"
        strategy_hints = ["使用通用求解算法"]
        solutions = sp.solve(equation, x)
        
        steps.append(Step(
            op="solve",
            input=f"{to_latex(equation)} = 0",
            out=f"解: {[to_latex(sol) for sol in solutions]}",
            note="求解"
        ))
    
    # 格式化解
    if not solutions:
        solution_strs = ["无解"]
    else:
        solution_strs = [f"{var} = {to_latex(sol)}" for sol in solutions]
    
    result = Result(
        exact=solution_strs[0] if len(solution_strs) == 1 else solution_strs,
        solutions=solution_strs,
        approx=float(solutions[0].evalf(decimals)) if len(solutions) == 1 and not exact and solutions[0].is_number else None
    )
    
    display = Display(
        latex="\\{" + ", ".join([solution_to_latex(var, sol) for sol in solutions]) + "\\}",
        latex_steps=[step.latex for step in steps if step.latex]
    )
    
    meta = Meta(
        method=method_used,
        strategy_hints=strategy_hints,
        intermediate=intermediate if intermediate else None
    )
    
    return SuccessResponse(
        task="algebra.solve",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )



