"""几何计算测试"""

import pytest
from mcp_math.core.geometry import (
    pythagoras_theorem,
    similar_triangles,
    circle_angles
)


class TestPythagoras:
    """勾股定理测试"""
    
    def test_pythagoras_legs(self):
        """已知两直角边求斜边"""
        result = pythagoras_theorem("legs", a=3, b=4)
        assert result.ok is True
        assert "5" in result.result.exact
    
    def test_pythagoras_hypotenuse_a(self):
        """已知斜边和b求a"""
        result = pythagoras_theorem("hypotenuse", b=4, c=5)
        assert result.ok is True
        assert "3" in result.result.exact
    
    def test_pythagoras_hypotenuse_b(self):
        """已知斜边和a求b"""
        result = pythagoras_theorem("hypotenuse", a=3, c=5)
        assert result.ok is True
        assert "4" in result.result.exact
    
    def test_pythagoras_sqrt(self):
        """包含根号的结果"""
        result = pythagoras_theorem("legs", a=1, b=1)
        assert result.ok is True
        assert "sqrt" in result.result.exact.lower() or "√" in result.result.exact
        assert abs(result.result.approx - 1.414) < 0.01
    
    def test_pythagoras_missing_params(self):
        """缺少参数"""
        with pytest.raises(ValueError):
            pythagoras_theorem("legs", a=3)


class TestSimilar:
    """相似三角形测试"""
    
    def test_similar_basic(self):
        """基本相似计算"""
        tri1 = {"AB": 3, "BC": 4, "CA": 5}
        tri2 = {"DE": 6, "EF": None, "FD": 10}
        mapping = {"A": "D", "B": "E", "C": "F"}
        
        result = similar_triangles(tri1, tri2, mapping, "EF")
        assert result.ok is True
        assert result.result.approx == 8.0
        assert result.meta.scale_k == 2.0
    
    def test_similar_no_scale(self):
        """无法确定相似比"""
        tri1 = {"AB": 3, "BC": 4}
        tri2 = {"DE": None, "EF": None}
        mapping = {"A": "D", "B": "E", "C": "F"}
        
        with pytest.raises(ValueError):
            similar_triangles(tri1, tri2, mapping, "DE")


class TestCircleAngles:
    """圆角度测试"""
    
    def test_circle_inscribed(self):
        """求圆周角"""
        result = circle_angles(center_angle=60, query="inscribed")
        assert result.ok is True
        assert result.result.approx == 30.0
    
    def test_circle_center(self):
        """求圆心角"""
        result = circle_angles(inscribed_angle=30, query="center")
        assert result.ok is True
        assert result.result.approx == 60.0
    
    def test_circle_missing_param(self):
        """缺少参数"""
        with pytest.raises(ValueError):
            circle_angles(query="inscribed")
    
    def test_circle_invalid_query(self):
        """无效查询"""
        with pytest.raises(ValueError):
            circle_angles(center_angle=60, query="invalid")



