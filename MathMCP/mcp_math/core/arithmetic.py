"""算术运算：分数、百分比、增长率"""

from typing import List
import sympy as sp
from .parser import parse_fraction
from .latex import fraction_to_latex, to_latex
from .schema import Step, Result, Display, Meta, SuccessResponse


def fraction_operation(
    a_str: str,
    b_str: str,
    op: str,
    detail: str = "short",
    exact: bool = True
) -> SuccessResponse:
    """
    分数运算
    
    Args:
        a_str: 第一个数
        b_str: 第二个数
        op: 运算符 (+, -, *, /)
        detail: 详细程度
        exact: 是否返回精确结果
        
    Returns:
        统一响应结构
    """
    a = parse_fraction(a_str)
    b = parse_fraction(b_str)
    
    steps = []
    intermediate_steps = []
    
    # 执行运算
    if op == '+':
        op_name = "加法"
        if detail == "full":
            # 通分
            lcm = sp.lcm(a.q, b.q)
            a_scaled = sp.Rational(a.p * (lcm // a.q), lcm)
            b_scaled = sp.Rational(b.p * (lcm // b.q), lcm)
            
            steps.append(Step(
                op="find_lcm",
                input=[str(a), str(b)],
                out=f"最小公倍数 = {lcm}",
                note="求最小公倍数"
            ))
            steps.append(Step(
                op="scale",
                input=[str(a), str(b)],
                out=f"{to_latex(a_scaled)} + {to_latex(b_scaled)}",
                note="通分"
            ))
            result_val = a_scaled + b_scaled
            steps.append(Step(
                op="add",
                input=f"{to_latex(a_scaled)} + {to_latex(b_scaled)}",
                out=to_latex(result_val),
                note="分子相加"
            ))
        else:
            result_val = a + b
            steps.append(Step(
                op="add",
                input=f"{to_latex(a)} + {to_latex(b)}",
                out=to_latex(result_val),
                note="通分后相加"
            ))
            
    elif op == '-':
        op_name = "减法"
        if detail == "full":
            lcm = sp.lcm(a.q, b.q)
            a_scaled = sp.Rational(a.p * (lcm // a.q), lcm)
            b_scaled = sp.Rational(b.p * (lcm // b.q), lcm)
            
            steps.append(Step(
                op="find_lcm",
                input=[str(a), str(b)],
                out=f"最小公倍数 = {lcm}",
                note="求最小公倍数"
            ))
            steps.append(Step(
                op="scale",
                input=[str(a), str(b)],
                out=f"{to_latex(a_scaled)} - {to_latex(b_scaled)}",
                note="通分"
            ))
            result_val = a_scaled - b_scaled
            steps.append(Step(
                op="subtract",
                input=f"{to_latex(a_scaled)} - {to_latex(b_scaled)}",
                out=to_latex(result_val),
                note="分子相减"
            ))
        else:
            result_val = a - b
            steps.append(Step(
                op="subtract",
                input=f"{to_latex(a)} - {to_latex(b)}",
                out=to_latex(result_val),
                note="通分后相减"
            ))
            
    elif op == '*':
        op_name = "乘法"
        result_val = a * b
        if detail == "full":
            steps.append(Step(
                op="multiply",
                input=f"({to_latex(a)}) × ({to_latex(b)})",
                out=f"\\frac{{{a.p} \\times {b.p}}}{{{a.q} \\times {b.q}}} = \\frac{{{a.p * b.p}}}{{{a.q * b.q}}}",
                note="分子相乘，分母相乘"
            ))
            if result_val != sp.Rational(a.p * b.p, a.q * b.q):
                steps.append(Step(
                    op="simplify",
                    input=f"\\frac{{{a.p * b.p}}}{{{a.q * b.q}}}",
                    out=to_latex(result_val),
                    note="约分"
                ))
        else:
            steps.append(Step(
                op="multiply",
                input=f"{to_latex(a)} × {to_latex(b)}",
                out=to_latex(result_val),
                note="相乘并约分"
            ))
            
    elif op == '/':
        op_name = "除法"
        if b == 0:
            raise ValueError("除数不能为零")
        result_val = a / b
        if detail == "full":
            b_reciprocal = sp.Rational(b.q, b.p)
            steps.append(Step(
                op="reciprocal",
                input=f"{to_latex(a)} ÷ {to_latex(b)}",
                out=f"{to_latex(a)} × {to_latex(b_reciprocal)}",
                note="转换为乘以倒数"
            ))
            steps.append(Step(
                op="multiply",
                input=f"{to_latex(a)} × {to_latex(b_reciprocal)}",
                out=to_latex(result_val),
                note="执行乘法并约分"
            ))
        else:
            steps.append(Step(
                op="divide",
                input=f"{to_latex(a)} ÷ {to_latex(b)}",
                out=to_latex(result_val),
                note="转换为乘倒数"
            ))
    else:
        raise ValueError(f"不支持的运算符: {op}")
    
    # 化简
    simplified = result_val
    
    result = Result(
        exact=str(simplified),
        approx=float(simplified.evalf()) if not exact else None
    )
    
    display = Display(
        latex=to_latex(simplified),
        latex_steps=[step.latex if step.latex else step.out for step in steps]
    )
    
    meta = Meta(
        method=f"fraction_{op_name}",
        strategy_hints=["通分" if op in ['+', '-'] else "分子分母分别运算", "约分"]
    )
    
    return SuccessResponse(
        task="arithmetic.fraction",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def percent_calculation(
    base: float,
    rate: float,
    mode: str,
    decimals: int = 4
) -> SuccessResponse:
    """
    百分比计算（增长率）
    
    Args:
        base: 基数
        rate: 比率（百分数）
        mode: 模式 (increase/decrease)
        decimals: 小数位数
        
    Returns:
        统一响应结构
    """
    steps = []
    
    # 计算变化量
    change = base * (rate / 100)
    
    steps.append(Step(
        op="calculate_change",
        input=f"{base} × {rate}%",
        out=f"{change:.{decimals}f}",
        note=f"计算{rate}%对应的变化量"
    ))
    
    # 计算最终值
    if mode == "increase":
        result_val = base + change
        op_str = "+"
        note = "基数加上增长量"
    elif mode == "decrease":
        result_val = base - change
        op_str = "-"
        note = "基数减去减少量"
    else:
        raise ValueError(f"不支持的模式: {mode}")
    
    steps.append(Step(
        op=mode,
        input=f"{base} {op_str} {change:.{decimals}f}",
        out=f"{result_val:.{decimals}f}",
        note=note
    ))
    
    result = Result(
        exact=round(result_val, decimals),
        approx=result_val
    )
    
    display = Display(
        latex=f"{result_val:.{decimals}f}",
        latex_steps=[
            f"{base} \\times \\frac{{{rate}}}{{100}} = {change:.{decimals}f}",
            f"{base} {op_str} {change:.{decimals}f} = {result_val:.{decimals}f}"
        ]
    )
    
    meta = Meta(
        method=f"percent_{mode}",
        strategy_hints=[f"先算变化量：基数 × 比率", f"再{'增加' if mode == 'increase' else '减少'}变化量"]
    )
    
    return SuccessResponse(
        task="arithmetic.percent",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )



