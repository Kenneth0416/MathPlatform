"""几何计算：勾股定理、相似三角形、圆角度"""

from typing import Dict, Optional
import sympy as sp
from .latex import to_latex
from .schema import Step, Result, Display, Meta, SuccessResponse


def pythagoras_theorem(
    known: str,
    a: Optional[float] = None,
    b: Optional[float] = None,
    c: Optional[float] = None,
    detail: str = "short"
) -> SuccessResponse:
    """
    勾股定理计算
    
    Args:
        known: 已知条件 ("legs" 或 "hypotenuse")
        a: 直角边a
        b: 直角边b
        c: 斜边c
        detail: 详细程度
        
    Returns:
        统一响应结构
    """
    steps = []
    
    if known == "legs":
        # 已知两直角边，求斜边
        if a is None or b is None:
            raise ValueError("需要提供两条直角边的长度")
        
        if detail == "full":
            steps.append(Step(
                op="formula",
                input="c² = a² + b²",
                out=f"c² = {a}² + {b}²",
                note="勾股定理公式"
            ))
            steps.append(Step(
                op="square",
                input=f"c² = {a}² + {b}²",
                out=f"c² = {a**2} + {b**2}",
                note="计算平方"
            ))
            c_squared = a**2 + b**2
            steps.append(Step(
                op="add",
                input=f"c² = {a**2} + {b**2}",
                out=f"c² = {c_squared}",
                note="求和"
            ))
        else:
            c_squared = a**2 + b**2
            steps.append(Step(
                op="sum_of_squares",
                input=f"a={a}, b={b}",
                out=f"c² = {c_squared}",
                note="计算 a² + b²"
            ))
        
        # 开方
        c_exact = sp.sqrt(c_squared)
        c_approx = float(c_exact.evalf())
        
        steps.append(Step(
            op="sqrt",
            input=f"c² = {c_squared}",
            out=f"c = {to_latex(c_exact)}",
            note="开平方求c"
        ))
        
        result = Result(
            exact=f"c = {to_latex(c_exact)}",
            approx=c_approx
        )
        
        query_desc = "求斜边"
        
    elif known == "hypotenuse":
        # 已知斜边和一直角边，求另一直角边
        if c is None:
            raise ValueError("需要提供斜边长度")
        if a is None and b is None:
            raise ValueError("需要提供一条直角边长度")
        
        if a is not None:
            # 求b
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="b² = c² - a²",
                    out=f"b² = {c}² - {a}²",
                    note="勾股定理变形"
                ))
                steps.append(Step(
                    op="square",
                    input=f"b² = {c}² - {a}²",
                    out=f"b² = {c**2} - {a**2}",
                    note="计算平方"
                ))
                b_squared = c**2 - a**2
                steps.append(Step(
                    op="subtract",
                    input=f"b² = {c**2} - {a**2}",
                    out=f"b² = {b_squared}",
                    note="求差"
                ))
            else:
                b_squared = c**2 - a**2
                steps.append(Step(
                    op="difference_of_squares",
                    input=f"c={c}, a={a}",
                    out=f"b² = {b_squared}",
                    note="计算 c² - a²"
                ))
            
            b_exact = sp.sqrt(b_squared)
            b_approx = float(b_exact.evalf())
            
            steps.append(Step(
                op="sqrt",
                input=f"b² = {b_squared}",
                out=f"b = {to_latex(b_exact)}",
                note="开平方求b"
            ))
            
            result = Result(
                exact=f"b = {to_latex(b_exact)}",
                approx=b_approx
            )
            query_desc = "求直角边b"
            
        else:
            # 求a
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="a² = c² - b²",
                    out=f"a² = {c}² - {b}²",
                    note="勾股定理变形"
                ))
                steps.append(Step(
                    op="square",
                    input=f"a² = {c}² - {b}²",
                    out=f"a² = {c**2} - {b**2}",
                    note="计算平方"
                ))
                a_squared = c**2 - b**2
                steps.append(Step(
                    op="subtract",
                    input=f"a² = {c**2} - {b**2}",
                    out=f"a² = {a_squared}",
                    note="求差"
                ))
            else:
                a_squared = c**2 - b**2
                steps.append(Step(
                    op="difference_of_squares",
                    input=f"c={c}, b={b}",
                    out=f"a² = {a_squared}",
                    note="计算 c² - b²"
                ))
            
            a_exact = sp.sqrt(a_squared)
            a_approx = float(a_exact.evalf())
            
            steps.append(Step(
                op="sqrt",
                input=f"a² = {a_squared}",
                out=f"a = {to_latex(a_exact)}",
                note="开平方求a"
            ))
            
            result = Result(
                exact=f"a = {to_latex(a_exact)}",
                approx=a_approx
            )
            query_desc = "求直角边a"
    else:
        raise ValueError(f"不支持的模式: {known}")
    
    display = Display(
        latex=result.exact,
        latex_steps=[step.out for step in steps]
    )
    
    meta = Meta(
        method="pythagoras",
        strategy_hints=["应用勾股定理 a²+b²=c²", "开平方求边长"]
    )
    
    return SuccessResponse(
        task="geometry.pythagoras",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def similar_triangles(
    tri1: Dict[str, float],
    tri2: Dict[str, float],
    mapping: Dict[str, str],
    query: str,
    detail: str = "short"
) -> SuccessResponse:
    """
    相似三角形比例计算
    
    Args:
        tri1: 三角形1的边 {"AB": 3, "BC": 4, "CA": 5}
        tri2: 三角形2的边 {"DE": 6, "EF": ?, "FD": 10}
        mapping: 顶点对应 {"A": "D", "B": "E", "C": "F"}
        query: 要求的边 "EF"
        detail: 详细程度
        
    Returns:
        统一响应结构
    """
    steps = []
    
    # 找到对应边并计算比例
    scale_k = None
    known_pairs = []
    
    for edge1, length1 in tri1.items():
        # 找到对应的edge2
        v1_start, v1_end = edge1[0], edge1[1]
        if v1_start in mapping and v1_end in mapping:
            v2_start = mapping[v1_start]
            v2_end = mapping[v1_end]
            edge2 = f"{v2_start}{v2_end}"
            edge2_alt = f"{v2_end}{v2_start}"
            
            if edge2 in tri2 and tri2[edge2] is not None:
                length2 = tri2[edge2]
                known_pairs.append((edge1, length1, edge2, length2))
                if scale_k is None:
                    scale_k = length2 / length1
            elif edge2_alt in tri2 and tri2[edge2_alt] is not None:
                length2 = tri2[edge2_alt]
                known_pairs.append((edge1, length1, edge2_alt, length2))
                if scale_k is None:
                    scale_k = length2 / length1
    
    if scale_k is None:
        raise ValueError("无法确定相似比，需要至少一对已知对应边")
    
    if detail == "full" and known_pairs:
        edge1, len1, edge2, len2 = known_pairs[0]
        steps.append(Step(
            op="find_ratio",
            input=f"{edge1}={len1}, {edge2}={len2}",
            out=f"k = {edge2}/{edge1} = {len2}/{len1} = {scale_k}",
            note="根据对应边求相似比"
        ))
    else:
        steps.append(Step(
            op="ratio",
            input=f"已知对应边",
            out=f"相似比 k = {scale_k}",
            note="计算相似比"
        ))
    
    # 查找要求的边
    if query in tri2 and tri2[query] is None:
        # 找到tri1中的对应边
        v2_start, v2_end = query[0], query[1]
        
        # 反向映射
        reverse_mapping = {v: k for k, v in mapping.items()}
        if v2_start in reverse_mapping and v2_end in reverse_mapping:
            v1_start = reverse_mapping[v2_start]
            v1_end = reverse_mapping[v2_end]
            edge1 = f"{v1_start}{v1_end}"
            edge1_alt = f"{v1_end}{v1_start}"
            
            if edge1 in tri1:
                length1 = tri1[edge1]
            elif edge1_alt in tri1:
                length1 = tri1[edge1_alt]
            else:
                raise ValueError(f"找不到对应边: {edge1}")
            
            # 计算
            result_length = length1 * scale_k
            
            if detail == "full":
                steps.append(Step(
                    op="apply_ratio",
                    input=f"{query} = {edge1} × k",
                    out=f"{query} = {length1} × {scale_k}",
                    note="应用相似比"
                ))
                steps.append(Step(
                    op="multiply",
                    input=f"{length1} × {scale_k}",
                    out=f"{result_length}",
                    note="计算结果"
                ))
            else:
                steps.append(Step(
                    op="calculate",
                    input=f"{query} = {length1} × {scale_k}",
                    out=f"{result_length}",
                    note="应用相似比计算"
                ))
            
            result = Result(
                exact=f"{query} = {result_length}",
                approx=result_length
            )
        else:
            raise ValueError(f"无法找到 {query} 的对应边")
    else:
        raise ValueError(f"查询边 {query} 不存在或已知")
    
    display = Display(
        latex=f"{query} = {result_length}",
        latex_steps=[step.out for step in steps]
    )
    
    meta = Meta(
        method="similar_triangles",
        strategy_hints=["确定对应边", "计算相似比", "应用比例求未知边"],
        scale_k=scale_k
    )
    
    return SuccessResponse(
        task="geometry.similar",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def circle_angles(
    center_angle: Optional[float] = None,
    inscribed_angle: Optional[float] = None,
    mode: str = "deg",
    query: str = "inscribed"
) -> SuccessResponse:
    """
    圆心角与圆周角计算
    
    Args:
        center_angle: 圆心角
        inscribed_angle: 圆周角
        mode: 角度模式
        query: 查询类型 ("center" 或 "inscribed")
        
    Returns:
        统一响应结构
    """
    steps = []
    
    if query == "inscribed":
        # 求圆周角
        if center_angle is None:
            raise ValueError("需要提供圆心角")
        
        inscribed_result = center_angle / 2
        
        steps.append(Step(
            op="theorem",
            input="圆周角 = 圆心角 ÷ 2",
            out=f"圆周角 = {center_angle}° ÷ 2",
            note="圆周角定理"
        ))
        steps.append(Step(
            op="divide",
            input=f"{center_angle}° ÷ 2",
            out=f"{inscribed_result}°",
            note="计算"
        ))
        
        result = Result(
            exact=f"{inscribed_result}°",
            approx=inscribed_result
        )
        
    elif query == "center":
        # 求圆心角
        if inscribed_angle is None:
            raise ValueError("需要提供圆周角")
        
        center_result = inscribed_angle * 2
        
        steps.append(Step(
            op="theorem",
            input="圆心角 = 圆周角 × 2",
            out=f"圆心角 = {inscribed_angle}° × 2",
            note="圆周角定理"
        ))
        steps.append(Step(
            op="multiply",
            input=f"{inscribed_angle}° × 2",
            out=f"{center_result}°",
            note="计算"
        ))
        
        result = Result(
            exact=f"{center_result}°",
            approx=center_result
        )
    else:
        raise ValueError(f"不支持的查询类型: {query}")
    
    display = Display(
        latex=result.exact,
        latex_steps=[step.out for step in steps]
    )
    
    meta = Meta(
        method="circle_angles",
        strategy_hints=["同弧所对圆周角=圆心角÷2"],
        angle_mode=mode
    )
    
    return SuccessResponse(
        task="geometry.circle_angles",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )



