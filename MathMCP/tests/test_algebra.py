"""代数运算测试"""

import pytest
from mcp_math.core.algebra import (
    simplify_expression,
    expand_expression,
    factor_expression,
    solve_equation
)


class TestSimplify:
    """化简测试"""
    
    def test_simplify_basic(self):
        """基础化简"""
        result = simplify_expression("2*x + 3*x")
        assert result.ok is True
        assert "5" in result.result.exact
        assert "x" in result.result.exact
    
    def test_simplify_fraction(self):
        """分数化简"""
        result = simplify_expression("4/6")
        assert result.ok is True
        assert "2/3" in result.result.exact
    
    def test_simplify_invalid(self):
        """无效表达式"""
        with pytest.raises(ValueError):
            simplify_expression("2x +")


class TestExpand:
    """展开测试"""
    
    def test_expand_basic(self):
        """基础展开"""
        result = expand_expression("(x+1)*(x+2)")
        assert result.ok is True
        assert "x**2" in result.result.exact or "x^2" in result.result.exact
    
    def test_expand_square(self):
        """完全平方"""
        result = expand_expression("(x+1)**2")
        assert result.ok is True
        assert "x**2" in result.result.exact or "x^2" in result.result.exact
    
    def test_expand_simple(self):
        """简单展开"""
        result = expand_expression("2*(x+3)")
        assert result.ok is True


class TestFactor:
    """因式分解测试"""
    
    def test_factor_difference_squares(self):
        """平方差"""
        result = factor_expression("x**2 - 1")
        assert result.ok is True
        # 结果应包含因式
        assert "(" in result.result.exact and ")" in result.result.exact
    
    def test_factor_quadratic(self):
        """二次多项式"""
        result = factor_expression("x**2 + 5*x + 6")
        assert result.ok is True
    
    def test_factor_common(self):
        """提取公因式"""
        result = factor_expression("2*x + 4")
        assert result.ok is True


class TestSolve:
    """解方程测试"""
    
    def test_solve_linear(self):
        """一次方程"""
        result = solve_equation("2*x + 3 = 11", var="x")
        assert result.ok is True
        assert "4" in str(result.result.solutions[0])
    
    def test_solve_quadratic_simple(self):
        """简单二次方程"""
        result = solve_equation("x**2 - 4 = 0", var="x")
        assert result.ok is True
        assert len(result.result.solutions) == 2
    
    def test_solve_quadratic_discriminant(self):
        """二次方程判别式"""
        result = solve_equation("x**2 - 5*x + 6 = 0", var="x", detail="full")
        assert result.ok is True
        assert result.meta.intermediate is not None
        assert "discriminant" in result.meta.intermediate
    
    def test_solve_no_equals(self):
        """没有等号的方程"""
        result = solve_equation("x**2 - 4", var="x")
        assert result.ok is True
        # 应该自动补充 = 0
    
    def test_solve_invalid(self):
        """无效方程"""
        with pytest.raises(ValueError):
            solve_equation("2x +", var="x")

