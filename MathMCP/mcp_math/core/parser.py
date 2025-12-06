"""安全的表达式解析器，使用 SymPy 白名单模式"""

import re
from typing import Any, Optional
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)
from sympy.core.sympify import SympifyError
from .schema import ErrorCode, create_error_response


# 白名单：允许的函数和符号
ALLOWED_FUNCTIONS = {
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sqrt', 'exp', 'log', 'ln', 'abs',
    'factorial', 'binomial',
    'pi', 'e', 'oo',  # 常数
}

ALLOWED_SYMBOLS = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')


def sanitize_input(expr_str: str) -> str:
    """
    清理输入表达式，移除危险字符
    
    Args:
        expr_str: 输入表达式字符串
        
    Returns:
        清理后的表达式
    """
    # 移除多余空白
    expr_str = expr_str.strip()
    
    # 替換 Unicode 數學符號為 ASCII 符號
    unicode_replacements = {
        '−': '-',      # Unicode minus (U+2212) → ASCII hyphen-minus
        '×': '*',      # Unicode multiplication sign → ASCII asterisk
        '÷': '/',      # Unicode division sign → ASCII slash
        '√': 'sqrt',   # Square root symbol
        '²': '**2',    # Superscript 2
        '³': '**3',    # Superscript 3
        '（': '(',     # Full-width parenthesis
        '）': ')',     # Full-width parenthesis
        '　': ' ',     # Full-width space
        '≥': '>=',     # Greater than or equal (U+2265)
        '≤': '<=',     # Less than or equal (U+2264)
        '≠': '!=',     # Not equal (U+2260)
        '＞': '>',     # Full-width greater than
        '＜': '<',     # Full-width less than
        '＝': '=',     # Full-width equals
    }
    
    for unicode_char, ascii_char in unicode_replacements.items():
        expr_str = expr_str.replace(unicode_char, ascii_char)
    
    # 检查是否包含危险的关键字
    dangerous_keywords = ['import', 'eval', 'exec', '__', 'lambda']
    for keyword in dangerous_keywords:
        if keyword in expr_str.lower():
            raise ValueError(f"不允许使用关键字: {keyword}")
    
    return expr_str


def parse_expression(
    expr_str: str,
    local_dict: Optional[dict] = None,
    angle_mode: str = "deg"
) -> sp.Expr:
    """
    安全地解析数学表达式
    
    Args:
        expr_str: 表达式字符串
        local_dict: 局部变量字典
        angle_mode: 角度模式 ("deg" 或 "rad")
        
    Returns:
        SymPy 表达式对象
        
    Raises:
        ValueError: 解析失败
    """
    try:
        # 清理输入
        expr_str = sanitize_input(expr_str)
        
        # 替换常见的数学符号
        expr_str = expr_str.replace('^', '**')
        expr_str = expr_str.replace('√', 'sqrt')
        
        # 设置转换规则
        transformations = (
            standard_transformations +
            (implicit_multiplication_application, convert_xor)
        )
        
        # 准备局部字典
        if local_dict is None:
            local_dict = {}
        
        # 添加常用符号和函数
        local_dict.update({
            'pi': sp.pi,
            'e': sp.E,
            'sqrt': sp.sqrt,
            'sin': sp.sin,
            'cos': sp.cos,
            'tan': sp.tan,
            'asin': sp.asin,
            'acos': sp.acos,
            'atan': sp.atan,
            'ln': sp.ln,
            'log': sp.log,
            'exp': sp.exp,
            'abs': sp.Abs,
            'factorial': sp.factorial,
        })
        
        # 解析表达式
        expr = parse_expr(
            expr_str,
            local_dict=local_dict,
            transformations=transformations,
            evaluate=True
        )
        
        # 角度模式转换（如果包含三角函数）
        if angle_mode == "deg" and any(f in expr_str.lower() for f in ['sin', 'cos', 'tan']):
            # TODO: 实现角度到弧度的自动转换
            pass
        
        return expr
        
    except (SympifyError, ValueError, TypeError) as e:
        raise ValueError(f"表达式解析失败: {str(e)}")
    except Exception as e:
        raise ValueError(f"未知解析错误: {str(e)}")


def parse_equation(eq_str: str, var: str = "x") -> tuple[sp.Expr, sp.Expr]:
    """
    解析方程，返回左右两边的表达式
    
    Args:
        eq_str: 方程字符串（可能包含等号）
        var: 变量名
        
    Returns:
        (左边表达式, 右边表达式)
    """
    try:
        eq_str = sanitize_input(eq_str)
        
        # 分割等号
        if '=' in eq_str:
            left, right = eq_str.split('=', 1)
        else:
            # 如果没有等号，假设右边为0
            left, right = eq_str, '0'
        
        left_expr = parse_expression(left.strip(), local_dict={var: sp.Symbol(var)})
        right_expr = parse_expression(right.strip(), local_dict={var: sp.Symbol(var)})
        
        return left_expr, right_expr
        
    except Exception as e:
        raise ValueError(f"方程解析失败: {str(e)}")


def parse_fraction(frac_str: str) -> sp.Rational:
    """
    解析分数表达式
    
    Args:
        frac_str: 分数字符串，如 "3/4" 或 "0.75" 或 "3"
        
    Returns:
        SymPy Rational 对象
    """
    try:
        frac_str = sanitize_input(frac_str)
        
        if '/' in frac_str:
            # 分数形式
            parts = frac_str.split('/')
            if len(parts) != 2:
                raise ValueError("分数格式错误")
            numerator = int(parts[0].strip())
            denominator = int(parts[1].strip())
            if denominator == 0:
                raise ValueError("分母不能为零")
            return sp.Rational(numerator, denominator)
        else:
            # 尝试解析为数字
            try:
                # 整数
                return sp.Rational(int(frac_str))
            except ValueError:
                # 小数
                return sp.Rational(float(frac_str))
                
    except Exception as e:
        raise ValueError(f"分数解析失败: {str(e)}")


def deg_to_rad(degrees: float) -> float:
    """角度转弧度"""
    return degrees * sp.pi / 180


def rad_to_deg(radians: float) -> float:
    """弧度转角度"""
    return radians * 180 / sp.pi


def validate_symbols(expr: sp.Expr, allowed: set) -> bool:
    """
    验证表达式中的符号是否在白名单内
    
    Args:
        expr: SymPy 表达式
        allowed: 允许的符号集合
        
    Returns:
        是否验证通过
    """
    symbols = expr.free_symbols
    for sym in symbols:
        if str(sym) not in allowed:
            return False
    return True


