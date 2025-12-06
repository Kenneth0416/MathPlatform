"""三角學工具測試案例 - DSE 風格測試"""

import pytest
import sys
import os

# 添加項目根目錄到 Python 路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from mcp_math.core.trigonometry import (
    trigonometry_sine, 
    trigonometry_cosine, 
    trigonometry_tangent,
    trigonometry_law_of_sines
)


class TestTrigonometrySine:
    """三角學正弦工具測試"""
    
    def test_sin_mode_basic(self):
        """測試基本正弦值計算"""
        params = {
            "mode": "sin",
            "opposite": 3,
            "hypotenuse": 5,
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert result.task == "trigonometry.sine"
        assert "sin θ = 0.6" in result.result.exact
        assert abs(result.result.approx - 0.6) < 0.001
        assert len(result.steps) >= 2
        
        # 檢查步驟內容
        step_outputs = [step.out for step in result.steps]
        assert any("3 / 5" in output for output in step_outputs)
        assert any("0.6" in output for output in step_outputs)
    
    def test_sin_mode_3_4_5_triangle(self):
        """測試 3-4-5 直角三角形（經典 DSE 題型）"""
        params = {
            "mode": "sin",
            "opposite": 3,
            "hypotenuse": 5,
            "unit": "degrees",
            "detail": "short"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert result.result.approx == 0.6
        assert result.meta.angle_mode == "deg"
    
    def test_arcsin_mode_basic(self):
        """測試基本角度求解"""
        params = {
            "mode": "arcsin",
            "value": 0.5,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert "θ = 30.00°" in result.result.exact
        assert abs(result.result.approx - 30.0) < 0.1
        
        # 檢查步驟
        step_outputs = [step.out for step in result.steps]
        assert any("arcsin(0.5)" in output for output in step_outputs)
    
    def test_arcsin_mode_common_values(self):
        """測試常見正弦值對應的角度"""
        test_cases = [
            (0.5, 30.0),      # sin(30°) = 0.5
            (0.866, 60.0),    # sin(60°) ≈ 0.866
            (0.707, 45.0),    # sin(45°) ≈ 0.707
        ]
        
        for sin_value, expected_angle in test_cases:
            params = {
                "mode": "arcsin",
                "value": sin_value,
                "unit": "degrees"
            }
            
            result = trigonometry_sine(params)
            assert result.ok is True
            assert abs(result.result.approx - expected_angle) < 1.0, f"sin({expected_angle}°) should be close to {sin_value}"
    
    def test_radians_mode(self):
        """測試弧度模式"""
        params = {
            "mode": "arcsin",
            "value": 0.5,
            "unit": "radians",
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert "弧度" in result.result.exact or "rad" in result.result.exact
        assert result.meta.angle_mode == "rad"
        # π/6 ≈ 0.524 弧度
        assert abs(result.result.approx - 0.524) < 0.01
    
    def test_dse_style_problem_1(self):
        """DSE 風格問題 1：直角三角形已知對邊和斜邊求正弦值"""
        # 題目：在直角三角形 ABC 中，∠C = 90°，AC = 4，AB = 5，求 sin ∠B
        params = {
            "mode": "sin",
            "opposite": 4,  # AC（對邊）
            "hypotenuse": 5,  # AB（斜邊）
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert "sin θ = 0.8" in result.result.exact
        assert result.result.approx == 0.8
    
    def test_dse_style_problem_2(self):
        """DSE 風格問題 2：已知正弦值求角度"""
        # 題目：若 sin θ = 0.6，求 θ（度數）
        params = {
            "mode": "arcsin",
            "value": 0.6,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert "θ = 36.87°" in result.result.exact
        assert abs(result.result.approx - 36.87) < 0.1
    
    def test_dse_style_problem_3(self):
        """DSE 風格問題 3：特殊角度 30°"""
        # 題目：若 sin θ = 0.5，求 θ
        params = {
            "mode": "arcsin",
            "value": 0.5,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert "θ = 30.00°" in result.result.exact
        assert abs(result.result.approx - 30.0) < 0.1
    
    def test_error_handling_invalid_mode(self):
        """測試錯誤處理：無效模式"""
        params = {
            "mode": "cos",  # 無效模式
            "opposite": 3,
            "hypotenuse": 5
        }
        
        with pytest.raises(ValueError, match="不支持的模式"):
            trigonometry_sine(params)
    
    def test_error_handling_missing_params_sin(self):
        """測試錯誤處理：sin 模式缺少參數"""
        params = {
            "mode": "sin",
            "opposite": 3
            # 缺少 hypotenuse
        }
        
        with pytest.raises(ValueError, match="sin 模式需要提供"):
            trigonometry_sine(params)
    
    def test_error_handling_missing_params_arcsin(self):
        """測試錯誤處理：arcsin 模式缺少參數"""
        params = {
            "mode": "arcsin"
            # 缺少 value
        }
        
        with pytest.raises(ValueError, match="arcsin 模式需要提供"):
            trigonometry_sine(params)
    
    def test_error_handling_invalid_sin_value(self):
        """測試錯誤處理：無效正弦值"""
        params = {
            "mode": "arcsin",
            "value": 1.5  # 超出範圍 [-1, 1]
        }
        
        with pytest.raises(ValueError, match="正弦值必須在 -1 到 1 之間"):
            trigonometry_sine(params)
    
    def test_error_handling_negative_hypotenuse(self):
        """測試錯誤處理：負斜邊長度"""
        params = {
            "mode": "sin",
            "opposite": 3,
            "hypotenuse": -5
        }
        
        with pytest.raises(ValueError, match="斜邊長度必須大於 0"):
            trigonometry_sine(params)
    
    def test_error_handling_opposite_larger_than_hypotenuse(self):
        """測試錯誤處理：對邊大於斜邊"""
        params = {
            "mode": "sin",
            "opposite": 6,
            "hypotenuse": 5
        }
        
        with pytest.raises(ValueError, match="對邊長度不能大於斜邊長度"):
            trigonometry_sine(params)
    
    def test_edge_case_zero_opposite(self):
        """測試邊界情況：對邊為 0"""
        params = {
            "mode": "sin",
            "opposite": 0,
            "hypotenuse": 5,
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert "sin θ = 0.000000" in result.result.exact
        assert result.result.approx == 0.0
    
    def test_edge_case_opposite_equals_hypotenuse(self):
        """測試邊界情況：對邊等於斜邊"""
        params = {
            "mode": "sin",
            "opposite": 5,
            "hypotenuse": 5,
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert "sin θ = 1.000000" in result.result.exact
        assert result.result.approx == 1.0
    
    def test_negative_sin_value(self):
        """測試負正弦值"""
        params = {
            "mode": "arcsin",
            "value": -0.5,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_sine(params)
        
        assert result.ok is True
        assert "θ = -30.00°" in result.result.exact
        assert abs(result.result.approx - (-30.0)) < 0.1


class TestTrigonometryCosine:
    """三角學餘弦工具測試"""
    
    def test_cos_mode_basic(self):
        """測試基本餘弦值計算"""
        params = {
            "mode": "cos",
            "adjacent": 4,
            "hypotenuse": 5,
            "detail": "full"
        }
        
        result = trigonometry_cosine(params)
        
        assert result.ok is True
        assert result.task == "trigonometry.cosine"
        assert "cos θ = 0.8" in result.result.exact
        assert abs(result.result.approx - 0.8) < 0.001
    
    def test_arccos_mode_basic(self):
        """測試基本角度求解"""
        params = {
            "mode": "arccos",
            "value": 0.5,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_cosine(params)
        
        assert result.ok is True
        assert "θ = 60.00°" in result.result.exact
        assert abs(result.result.approx - 60.0) < 0.1


class TestTrigonometryTangent:
    """三角學正切工具測試"""
    
    def test_tan_mode_basic(self):
        """測試基本正切值計算"""
        params = {
            "mode": "tan",
            "opposite": 3,
            "adjacent": 4,
            "detail": "full"
        }
        
        result = trigonometry_tangent(params)
        
        assert result.ok is True
        assert result.task == "trigonometry.tangent"
        assert "tan θ = 0.75" in result.result.exact
        assert abs(result.result.approx - 0.75) < 0.001
    
    def test_arctan_mode_basic(self):
        """測試基本角度求解"""
        params = {
            "mode": "arctan",
            "value": 1.0,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_tangent(params)
        
        assert result.ok is True
        assert "θ = 45.00°" in result.result.exact
        assert abs(result.result.approx - 45.0) < 0.1


class TestTrigonometryLawOfSines:
    """正弦定理工具測試"""
    
    def test_find_side_basic(self):
        """測試基本求邊功能"""
        params = {
            "mode": "find_side",
            "angle_A": 30,
            "angle_B": 60,
            "side_a": 5,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_law_of_sines(params)
        
        assert result.ok is True
        assert result.task == "trigonometry.law_of_sines"
        assert "b = " in result.result.exact
    
    def test_find_angle_basic(self):
        """測試基本求角功能"""
        params = {
            "mode": "find_angle",
            "angle_A": 30,
            "side_a": 5,
            "side_b": 8.66,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_law_of_sines(params)
        
        assert result.ok is True
        assert "B = " in result.result.exact
    
    def test_solve_triangle_basic(self):
        """測試基本解三角形功能"""
        params = {
            "mode": "solve_triangle",
            "angle_A": 30,
            "angle_B": 60,
            "side_a": 5,
            "unit": "degrees",
            "detail": "full"
        }
        
        result = trigonometry_law_of_sines(params)
        
        assert result.ok is True
        assert "解：" in result.result.exact
        assert "C=" in result.result.exact


def run_simple_tests():
    """簡單測試函數（不使用 pytest）"""
    print("=== 三角學工具測試 ===")
    
    # 測試正弦函數
    print("\n=== 正弦函數測試 ===")
    print("測試 1：sin 模式 - 3-4-5 直角三角形")
    params1 = {"mode": "sin", "opposite": 3, "hypotenuse": 5}
    result1 = trigonometry_sine(params1)
    print(f"結果：{result1.result.exact}")
    print(f"近似值：{result1.result.approx}")
    
    print("測試 2：arcsin 模式 - sin θ = 0.5")
    params2 = {"mode": "arcsin", "value": 0.5, "unit": "degrees"}
    result2 = trigonometry_sine(params2)
    print(f"結果：{result2.result.exact}")
    print(f"近似值：{result2.result.approx}")
    
    # 測試餘弦函數
    print("\n=== 餘弦函數測試 ===")
    print("測試 3：cos 模式 - 4-5 直角三角形")
    params3 = {"mode": "cos", "adjacent": 4, "hypotenuse": 5}
    result3 = trigonometry_cosine(params3)
    print(f"結果：{result3.result.exact}")
    print(f"近似值：{result3.result.approx}")
    
    print("測試 4：arccos 模式 - cos θ = 0.5")
    params4 = {"mode": "arccos", "value": 0.5, "unit": "degrees"}
    result4 = trigonometry_cosine(params4)
    print(f"結果：{result4.result.exact}")
    print(f"近似值：{result4.result.approx}")
    
    # 測試正切函數
    print("\n=== 正切函數測試 ===")
    print("測試 5：tan 模式 - 3-4 直角三角形")
    params5 = {"mode": "tan", "opposite": 3, "adjacent": 4}
    result5 = trigonometry_tangent(params5)
    print(f"結果：{result5.result.exact}")
    print(f"近似值：{result5.result.approx}")
    
    print("測試 6：arctan 模式 - tan θ = 1")
    params6 = {"mode": "arctan", "value": 1.0, "unit": "degrees"}
    result6 = trigonometry_tangent(params6)
    print(f"結果：{result6.result.exact}")
    print(f"近似值：{result6.result.approx}")
    
    # 測試正弦定理
    print("\n=== 正弦定理測試 ===")
    print("測試 7：find_side 模式")
    params7 = {"mode": "find_side", "angle_A": 30, "angle_B": 60, "side_a": 5, "unit": "degrees"}
    result7 = trigonometry_law_of_sines(params7)
    print(f"結果：{result7.result.exact}")
    
    print("測試 8：solve_triangle 模式")
    params8 = {"mode": "solve_triangle", "angle_A": 30, "angle_B": 60, "side_a": 5, "unit": "degrees"}
    result8 = trigonometry_law_of_sines(params8)
    print(f"結果：{result8.result.exact}")
    
    print("\n=== 測試完成 ===")


if __name__ == "__main__":
    # 運行簡單測試
    run_simple_tests()
    
    # 如果安裝了 pytest，也可以運行完整測試
    # pytest test_trigonometry.py -v
