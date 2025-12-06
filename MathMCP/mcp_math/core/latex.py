"""LaTeX 渲染辅助函数"""

from typing import Union, List
import sympy as sp
from sympy import latex as sp_latex


def to_latex(expr: Union[sp.Expr, str, float, int]) -> str:
    """
    将表达式转换为 LaTeX 格式
    
    Args:
        expr: SymPy 表达式或字符串
        
    Returns:
        LaTeX 字符串
    """
    if isinstance(expr, str):
        # 如果已经是字符串，尝试解析
        try:
            from .parser import parse_expression
            expr = parse_expression(expr)
        except:
            # 解析失败，直接返回
            return expr
    
    if isinstance(expr, (int, float)):
        expr = sp.sympify(expr)
    
    try:
        return sp_latex(expr)
    except:
        return str(expr)


def equation_to_latex(left: sp.Expr, right: sp.Expr) -> str:
    """
    将方程转换为 LaTeX 格式
    
    Args:
        left: 左边表达式
        right: 右边表达式
        
    Returns:
        LaTeX 字符串
    """
    return f"{to_latex(left)} = {to_latex(right)}"


def steps_to_latex(steps: List[dict]) -> List[str]:
    """
    将步骤列表转换为 LaTeX 格式
    
    Args:
        steps: 步骤列表
        
    Returns:
        LaTeX 字符串列表
    """
    latex_steps = []
    for step in steps:
        if 'latex' in step and step['latex']:
            latex_steps.append(step['latex'])
        else:
            # 尝试从 in 和 out 生成
            in_part = step.get('in', '')
            out_part = step.get('out', '')
            if in_part and out_part:
                latex_steps.append(f"{to_latex(in_part)} \\Rightarrow {to_latex(out_part)}")
            elif out_part:
                latex_steps.append(to_latex(out_part))
    return latex_steps


def fraction_to_latex(numerator: int, denominator: int) -> str:
    """
    将分数转换为 LaTeX 格式
    
    Args:
        numerator: 分子
        denominator: 分母
        
    Returns:
        LaTeX 字符串
    """
    if denominator == 1:
        return str(numerator)
    return f"\\frac{{{numerator}}}{{{denominator}}}"


def solution_to_latex(var: str, value: Union[sp.Expr, str]) -> str:
    """
    将解转换为 LaTeX 格式
    
    Args:
        var: 变量名
        value: 值
        
    Returns:
        LaTeX 字符串
    """
    return f"{var} = {to_latex(value)}"


def format_result_latex(result: str) -> str:
    """
    格式化结果为 LaTeX（添加大括号等）
    
    Args:
        result: 结果字符串
        
    Returns:
        格式化的 LaTeX 字符串
    """
    # 如果结果包含集合符号，添加大括号
    if '=' in result and not result.startswith('{'):
        return f"\\{{{result}\\}}"
    return result



