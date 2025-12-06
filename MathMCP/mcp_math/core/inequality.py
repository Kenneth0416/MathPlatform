"""不等式求解：一元不等式、分式不等式"""

from typing import Optional, List, Union
import sympy as sp
from .latex import to_latex
from .schema import Step, Result, Display, Meta, SuccessResponse
from .parser import parse_expression


def solve_inequality(
    ineq_str: str,
    var: str = "x",
    detail: str = "full"
) -> SuccessResponse:
    """
    求解不等式
    
    Args:
        ineq_str: 不等式字符串，如 "2*x+3 >= 5" 或 "(x-1)/(x+2) > 0"
        var: 变量名
        detail: 详细程度
        
    Returns:
        统一响应结构
    """
    steps = []
    warnings = []
    
    # 解析不等式
    try:
        # 支持的不等号
        for op in ['>=', '<=', '>', '<']:
            if op in ineq_str:
                left_str, right_str = ineq_str.split(op, 1)
                inequality_op = op
                break
        else:
            raise ValueError("未找到不等号（>=, <=, >, <）")
        
        # 解析左右两边
        x_sym = sp.Symbol(var)
        left_expr = parse_expression(left_str.strip(), local_dict={var: x_sym})
        right_expr = parse_expression(right_str.strip(), local_dict={var: x_sym})
        
        steps.append(Step(
            op="parse",
            input=ineq_str,
            out=f"{to_latex(left_expr)} {inequality_op} {to_latex(right_expr)}",
            note="解析不等式"
        ))
        
    except Exception as e:
        raise ValueError(f"不等式解析失败: {str(e)}")
    
    # 移项，转换为 expr op 0 的形式
    expr = left_expr - right_expr
    
    if detail == "full":
        steps.append(Step(
            op="rearrange",
            input=f"{to_latex(left_expr)} {inequality_op} {to_latex(right_expr)}",
            out=f"{to_latex(expr)} {inequality_op} 0",
            note="移项整理"
        ))
    
    # 化简表达式
    expr_simplified = sp.simplify(expr)
    
    if detail == "full" and expr != expr_simplified:
        steps.append(Step(
            op="simplify",
            input=f"{to_latex(expr)} {inequality_op} 0",
            out=f"{to_latex(expr_simplified)} {inequality_op} 0",
            note="化简"
        ))
    
    # 尝试求解不等式
    try:
        # 将不等号转换为 sympy 的关系运算符
        if inequality_op == '>=':
            relation = sp.GreaterThan(expr_simplified, 0)
        elif inequality_op == '<=':
            relation = sp.LessThan(expr_simplified, 0)
        elif inequality_op == '>':
            relation = sp.StrictGreaterThan(expr_simplified, 0)
        else:  # '<'
            relation = sp.StrictLessThan(expr_simplified, 0)
        
        # 求解不等式
        solution = sp.solve_univariate_inequality(relation, x_sym, relational=False)
        
        steps.append(Step(
            op="solve",
            input=f"{to_latex(expr_simplified)} {inequality_op} 0",
            out=f"{var} ∈ {solution}",
            note="求解不等式"
        ))
        
        # 格式化解集
        solution_str = str(solution)
        if hasattr(solution, 'as_relational'):
            solution_latex = to_latex(solution.as_relational(x_sym))
        else:
            solution_latex = str(solution)
        
        result = Result(
            exact=f"{var} ∈ {solution}",
            approx=None,
            solutions=[solution_str]
        )
        
    except Exception as e:
        # 如果自动求解失败，提供分析提示
        warnings.append(f"自动求解失败: {str(e)}")
        warnings.append("建议：手动分析表达式的符号")
        
        # 尝试因式分解
        try:
            factored = sp.factor(expr_simplified)
            steps.append(Step(
                op="factor",
                input=f"{to_latex(expr_simplified)}",
                out=f"{to_latex(factored)}",
                note="因式分解（用于分析符号）"
            ))
            
            # 找关键点（零点和不连续点）
            zeros = sp.solve(expr_simplified, x_sym)
            discontinuities = sp.solve(sp.denom(expr_simplified), x_sym) if expr_simplified.is_rational_function() else []
            
            critical_points = sorted(set(zeros + discontinuities), key=lambda x: float(x.evalf()) if x.is_real else 0)
            
            if critical_points:
                steps.append(Step(
                    op="critical_points",
                    input="找关键点",
                    out=f"零点: {zeros}, 间断点: {discontinuities}",
                    note="确定分段区间"
                ))
            
            result = Result(
                exact=f"需要分段讨论: 关键点为 {critical_points}",
                approx=None,
                solutions=[f"建议在区间 {critical_points} 两侧分别讨论符号"]
            )
            
            solution_latex = f"需要分段讨论（关键点: {', '.join(map(str, critical_points))}）"
            
        except Exception as e2:
            warnings.append(f"因式分解也失败: {str(e2)}")
            
            result = Result(
                exact=f"{to_latex(expr_simplified)} {inequality_op} 0",
                approx=None,
                solutions=["建议手动分析或提供参数的具体范围"]
            )
            
            solution_latex = "需要手动分析"
    
    display = Display(
        latex=solution_latex if 'solution_latex' in locals() else str(result.exact),
        latex_steps=[step.out for step in steps]
    )
    
    meta = Meta(
        method="inequality",
        strategy_hints=[
            "移项整理为标准形式",
            "求零点和间断点",
            "分区间讨论符号",
            "确定解集"
        ],
        warnings=warnings
    )
    
    return SuccessResponse(
        task="algebra.inequality",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


