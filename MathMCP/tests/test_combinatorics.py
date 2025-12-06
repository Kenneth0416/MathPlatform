"""组合数学测试"""

import pytest
from mcp_math.core.combinatorics import combination, permutation


class TestCombination:
    """组合数测试"""
    
    def test_combination_basic(self):
        """基本组合"""
        result = combination(5, 2)
        assert result.ok is True
        assert result.result.exact == 10
    
    def test_combination_same(self):
        """n = r"""
        result = combination(5, 5)
        assert result.ok is True
        assert result.result.exact == 1
    
    def test_combination_zero(self):
        """r = 0"""
        result = combination(5, 0)
        assert result.ok is True
        assert result.result.exact == 1
    
    def test_combination_invalid_r_greater(self):
        """r > n"""
        with pytest.raises(ValueError):
            combination(3, 5)
    
    def test_combination_negative(self):
        """负数"""
        with pytest.raises(ValueError):
            combination(-1, 2)


class TestPermutation:
    """排列数测试"""
    
    def test_permutation_basic(self):
        """基本排列"""
        result = permutation(5, 2)
        assert result.ok is True
        assert result.result.exact == 20
    
    def test_permutation_same(self):
        """n = r (全排列)"""
        result = permutation(5, 5)
        assert result.ok is True
        assert result.result.exact == 120
    
    def test_permutation_zero(self):
        """r = 0"""
        result = permutation(5, 0)
        assert result.ok is True
        assert result.result.exact == 1
    
    def test_permutation_invalid_r_greater(self):
        """r > n"""
        with pytest.raises(ValueError):
            permutation(3, 5)
    
    def test_permutation_negative(self):
        """负数"""
        with pytest.raises(ValueError):
            permutation(-1, 2)



