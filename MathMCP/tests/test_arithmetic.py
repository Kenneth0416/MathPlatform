"""算术运算测试"""

import pytest
from mcp_math.core.arithmetic import fraction_operation, percent_calculation


class TestFraction:
    """分数运算测试"""
    
    def test_fraction_add(self):
        """分数加法"""
        result = fraction_operation("3/4", "5/6", "+")
        assert result.ok is True
        # 3/4 + 5/6 = 9/12 + 10/12 = 19/12
        assert "19" in result.result.exact
    
    def test_fraction_subtract(self):
        """分数减法"""
        result = fraction_operation("5/6", "3/4", "-")
        assert result.ok is True
    
    def test_fraction_multiply(self):
        """分数乘法"""
        result = fraction_operation("2/3", "3/4", "*")
        assert result.ok is True
        # 2/3 * 3/4 = 6/12 = 1/2
        assert "1/2" in result.result.exact
    
    def test_fraction_divide(self):
        """分数除法"""
        result = fraction_operation("2/3", "3/4", "/")
        assert result.ok is True
        # 2/3 / 3/4 = 2/3 * 4/3 = 8/9
        assert "8" in result.result.exact
    
    def test_fraction_divide_zero(self):
        """除以零"""
        with pytest.raises(ValueError):
            fraction_operation("1/2", "0", "/")
    
    def test_fraction_integer(self):
        """整数运算"""
        result = fraction_operation("3", "4", "+")
        assert result.ok is True
        assert "7" in result.result.exact
    
    def test_fraction_invalid_op(self):
        """无效运算符"""
        with pytest.raises(ValueError):
            fraction_operation("1/2", "1/3", "%")


class TestPercent:
    """百分比测试"""
    
    def test_percent_increase(self):
        """增长"""
        result = percent_calculation(100, 20, "increase")
        assert result.ok is True
        assert result.result.exact == 120
    
    def test_percent_decrease(self):
        """减少"""
        result = percent_calculation(100, 20, "decrease")
        assert result.ok is True
        assert result.result.exact == 80
    
    def test_percent_decimal(self):
        """小数基数"""
        result = percent_calculation(50.5, 10, "increase")
        assert result.ok is True
        assert abs(result.result.exact - 55.55) < 0.01
    
    def test_percent_invalid_mode(self):
        """无效模式"""
        with pytest.raises(ValueError):
            percent_calculation(100, 20, "invalid")



