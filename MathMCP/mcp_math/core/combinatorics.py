"""组合数学：排列与组合"""

import math
from .schema import Step, Result, Display, Meta, SuccessResponse


def combination(n: int, r: int) -> SuccessResponse:
    """
    组合数 C(n,r)
    
    Args:
        n: 总数
        r: 选择数
        
    Returns:
        统一响应结构
    """
    if r > n:
        raise ValueError("r 不能大于 n")
    if r < 0 or n < 0:
        raise ValueError("n 和 r 必须为非负整数")
    
    result_val = math.comb(n, r)
    
    steps = [
        Step(
            op="formula",
            input=f"C({n},{r})",
            out=f"C({n},{r}) = {n}! / ({r}! × ({n}-{r})!)",
            note="组合数公式"
        ),
        Step(
            op="simplify",
            input=f"{n}! / ({r}! × {n-r}!)",
            out=f"{result_val}",
            note="计算阶乘并约简"
        )
    ]
    
    result = Result(exact=result_val)
    
    display = Display(
        latex=f"C_{{{n}}}^{{{r}}} = {result_val}",
        latex_steps=[
            f"C_{{{n}}}^{{{r}}} = \\frac{{{n}!}}{{{r}! \\times {n-r}!}}",
            f"C_{{{n}}}^{{{r}}} = {result_val}"
        ]
    )
    
    meta = Meta(
        method="combination",
        strategy_hints=["使用组合数公式 C(n,r) = n!/(r!(n-r)!)"]
    )
    
    return SuccessResponse(
        task="combinatorics.ncr",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def permutation(n: int, r: int) -> SuccessResponse:
    """
    排列数 P(n,r)
    
    Args:
        n: 总数
        r: 选择数
        
    Returns:
        统一响应结构
    """
    if r > n:
        raise ValueError("r 不能大于 n")
    if r < 0 or n < 0:
        raise ValueError("n 和 r 必须为非负整数")
    
    result_val = math.perm(n, r)
    
    steps = [
        Step(
            op="formula",
            input=f"P({n},{r})",
            out=f"P({n},{r}) = {n}! / ({n}-{r})!",
            note="排列数公式"
        ),
        Step(
            op="simplify",
            input=f"{n}! / {n-r}!",
            out=f"{result_val}",
            note="计算阶乘并约简"
        )
    ]
    
    result = Result(exact=result_val)
    
    display = Display(
        latex=f"P_{{{n}}}^{{{r}}} = {result_val}",
        latex_steps=[
            f"P_{{{n}}}^{{{r}}} = \\frac{{{n}!}}{{({n}-{r})!}}",
            f"P_{{{n}}}^{{{r}}} = {result_val}"
        ]
    )
    
    meta = Meta(
        method="permutation",
        strategy_hints=["使用排列数公式 P(n,r) = n!/(n-r)!"]
    )
    
    return SuccessResponse(
        task="combinatorics.npr",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )



