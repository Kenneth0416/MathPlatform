"""三角函數計算：正弦值與反正弦（arcsin）"""

from typing import Dict, Optional
import math
from .latex import to_latex
from .schema import Step, Result, Display, Meta, SuccessResponse


def trigonometry_sine(params: Dict) -> SuccessResponse:
    """
    三角函數正弦計算
    
    支援兩種模式：
    1. sin 模式：已知對邊和斜邊，計算正弦值
    2. arcsin 模式：已知正弦值，求角度
    
    Args:
        params: 參數字典，包含：
            - mode: "sin" 或 "arcsin"
            - opposite: 對邊長度（sin 模式必填）
            - hypotenuse: 斜邊長度（sin 模式必填）
            - value: 正弦值（arcsin 模式必填，-1 到 1）
            - unit: "degrees" 或 "radians"（默認 "degrees"）
            - detail: "short" 或 "full"（默認 "full"）
    
    Returns:
        統一響應結構
    """
    # 提取參數
    mode = params.get("mode")
    opposite = params.get("opposite")
    hypotenuse = params.get("hypotenuse")
    value = params.get("value")
    unit = params.get("unit", "degrees")
    detail = params.get("detail", "full")
    
    steps = []
    
    # 參數驗證
    if mode not in ["sin", "arcsin"]:
        raise ValueError(f"不支持的模式: {mode}。支援的模式：'sin' 或 'arcsin'")
    
    if unit not in ["degrees", "radians"]:
        raise ValueError(f"不支持的單位: {unit}。支援的單位：'degrees' 或 'radians'")
    
    if mode == "sin":
        # sin 模式：計算正弦值
        if opposite is None or hypotenuse is None:
            raise ValueError("sin 模式需要提供 opposite（對邊）和 hypotenuse（斜邊）參數")
        
        # 轉換為浮點數
        try:
            opposite = float(opposite)
            hypotenuse = float(hypotenuse)
        except (ValueError, TypeError):
            raise ValueError("opposite 和 hypotenuse 必須是數字")
        
        # 驗證輸入合理性
        if hypotenuse <= 0:
            raise ValueError("斜邊長度必須大於 0")
        if opposite < 0:
            raise ValueError("對邊長度不能為負數")
        if opposite > hypotenuse:
            raise ValueError("對邊長度不能大於斜邊長度")
        
        # 計算正弦值
        sin_value = opposite / hypotenuse
        
        if detail == "full":
            steps.append(Step(
                op="formula",
                input="sin θ = 對邊 / 斜邊",
                out=f"sin θ = {opposite} / {hypotenuse}",
                note="正弦函數定義"
            ))
            steps.append(Step(
                op="divide",
                input=f"{opposite} / {hypotenuse}",
                out=f"{sin_value:.6f}",
                note="計算正弦值"
            ))
        else:
            steps.append(Step(
                op="sin_calc",
                input=f"對邊={opposite}, 斜邊={hypotenuse}",
                out=f"sin θ = {sin_value:.6f}",
                note="正弦值計算"
            ))
        
        # 結果格式化
        result = Result(
            exact=f"sin θ = {sin_value:.6f}",
            approx=sin_value
        )
        
        query_desc = "計算正弦值"
        
    elif mode == "arcsin":
        # arcsin 模式：求角度
        if value is None:
            raise ValueError("arcsin 模式需要提供 value（正弦值）參數")
        
        # 轉換為浮點數
        try:
            value = float(value)
        except (ValueError, TypeError):
            raise ValueError("value 必須是數字")
        
        # 驗證正弦值範圍
        if value < -1 or value > 1:
            raise ValueError("正弦值必須在 -1 到 1 之間")
        
        # 計算角度（弧度）
        angle_rad = math.asin(value)
        
        if unit == "degrees":
            # 轉換為度數
            angle_deg = math.degrees(angle_rad)
            
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="θ = arcsin(x)",
                    out=f"θ = arcsin({value})",
                    note="反正弦函數定義"
                ))
                steps.append(Step(
                    op="arcsin_calc",
                    input=f"arcsin({value})",
                    out=f"{angle_rad:.6f} 弧度",
                    note="計算弧度值"
                ))
                steps.append(Step(
                    op="convert",
                    input=f"{angle_rad:.6f} 弧度",
                    out=f"{angle_deg:.2f}°",
                    note="轉換為度數"
                ))
            else:
                steps.append(Step(
                    op="arcsin",
                    input=f"arcsin({value})",
                    out=f"{angle_deg:.2f}°",
                    note="求角度"
                ))
            
            result = Result(
                exact=f"θ = {angle_deg:.2f}°",
                approx=angle_deg
            )
            unit_symbol = "°"
        else:
            # 保持弧度
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="θ = arcsin(x)",
                    out=f"θ = arcsin({value})",
                    note="反正弦函數定義"
                ))
                steps.append(Step(
                    op="arcsin_calc",
                    input=f"arcsin({value})",
                    out=f"{angle_rad:.6f}",
                    note="計算弧度值"
                ))
            else:
                steps.append(Step(
                    op="arcsin",
                    input=f"arcsin({value})",
                    out=f"{angle_rad:.6f}",
                    note="求角度"
                ))
            
            result = Result(
                exact=f"θ = {angle_rad:.6f}",
                approx=angle_rad
            )
            unit_symbol = " 弧度"
        
        query_desc = "求角度"
    
    # 創建顯示格式
    display = Display(
        latex=result.exact,
        latex_steps=[step.out for step in steps]
    )
    
    # 元數據
    meta = Meta(
        method="trigonometry_sine",
        strategy_hints=[
            "正弦函數：sin θ = 對邊/斜邊",
            "反正弦函數：θ = arcsin(x)",
            f"角度單位：{unit}"
        ],
        angle_mode="deg" if unit == "degrees" else "rad",
        units=unit
    )
    
    return SuccessResponse(
        task="trigonometry.sine",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def trigonometry_cosine(params: Dict) -> SuccessResponse:
    """
    三角函數餘弦計算
    
    支援兩種模式：
    1. cos 模式：已知鄰邊和斜邊，計算餘弦值
    2. arccos 模式：已知餘弦值，求角度
    
    Args:
        params: 參數字典，包含：
            - mode: "cos" 或 "arccos"
            - adjacent: 鄰邊長度（cos 模式必填）
            - hypotenuse: 斜邊長度（cos 模式必填）
            - value: 餘弦值（arccos 模式必填，-1 到 1）
            - unit: "degrees" 或 "radians"（默認 "degrees"）
            - detail: "short" 或 "full"（默認 "full"）
    
    Returns:
        統一響應結構
    """
    # 提取參數
    mode = params.get("mode")
    adjacent = params.get("adjacent")
    hypotenuse = params.get("hypotenuse")
    value = params.get("value")
    unit = params.get("unit", "degrees")
    detail = params.get("detail", "full")
    
    steps = []
    
    # 參數驗證
    if mode not in ["cos", "arccos"]:
        raise ValueError(f"不支持的模式: {mode}。支援的模式：'cos' 或 'arccos'")
    
    if unit not in ["degrees", "radians"]:
        raise ValueError(f"不支持的單位: {unit}。支援的單位：'degrees' 或 'radians'")
    
    if mode == "cos":
        # cos 模式：計算餘弦值
        if adjacent is None or hypotenuse is None:
            raise ValueError("cos 模式需要提供 adjacent（鄰邊）和 hypotenuse（斜邊）參數")
        
        # 轉換為浮點數
        try:
            adjacent = float(adjacent)
            hypotenuse = float(hypotenuse)
        except (ValueError, TypeError):
            raise ValueError("adjacent 和 hypotenuse 必須是數字")
        
        # 驗證輸入合理性
        if hypotenuse <= 0:
            raise ValueError("斜邊長度必須大於 0")
        if adjacent < 0:
            raise ValueError("鄰邊長度不能為負數")
        if adjacent > hypotenuse:
            raise ValueError("鄰邊長度不能大於斜邊長度")
        
        # 計算餘弦值
        cos_value = adjacent / hypotenuse
        
        if detail == "full":
            steps.append(Step(
                op="formula",
                input="cos θ = 鄰邊 / 斜邊",
                out=f"cos θ = {adjacent} / {hypotenuse}",
                note="餘弦函數定義"
            ))
            steps.append(Step(
                op="divide",
                input=f"{adjacent} / {hypotenuse}",
                out=f"{cos_value:.6f}",
                note="計算餘弦值"
            ))
        else:
            steps.append(Step(
                op="cos_calc",
                input=f"鄰邊={adjacent}, 斜邊={hypotenuse}",
                out=f"cos θ = {cos_value:.6f}",
                note="餘弦值計算"
            ))
        
        # 結果格式化
        result = Result(
            exact=f"cos θ = {cos_value:.6f}",
            approx=cos_value
        )
        
        query_desc = "計算餘弦值"
        
    elif mode == "arccos":
        # arccos 模式：求角度
        if value is None:
            raise ValueError("arccos 模式需要提供 value（餘弦值）參數")
        
        # 轉換為浮點數
        try:
            value = float(value)
        except (ValueError, TypeError):
            raise ValueError("value 必須是數字")
        
        # 驗證餘弦值範圍
        if value < -1 or value > 1:
            raise ValueError("餘弦值必須在 -1 到 1 之間")
        
        # 計算角度（弧度）
        angle_rad = math.acos(value)
        
        if unit == "degrees":
            # 轉換為度數
            angle_deg = math.degrees(angle_rad)
            
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="θ = arccos(x)",
                    out=f"θ = arccos({value})",
                    note="反餘弦函數定義"
                ))
                steps.append(Step(
                    op="arccos_calc",
                    input=f"arccos({value})",
                    out=f"{angle_rad:.6f} 弧度",
                    note="計算弧度值"
                ))
                steps.append(Step(
                    op="convert",
                    input=f"{angle_rad:.6f} 弧度",
                    out=f"{angle_deg:.2f}°",
                    note="轉換為度數"
                ))
            else:
                steps.append(Step(
                    op="arccos",
                    input=f"arccos({value})",
                    out=f"{angle_deg:.2f}°",
                    note="求角度"
                ))
            
            result = Result(
                exact=f"θ = {angle_deg:.2f}°",
                approx=angle_deg
            )
            unit_symbol = "°"
        else:
            # 保持弧度
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="θ = arccos(x)",
                    out=f"θ = arccos({value})",
                    note="反餘弦函數定義"
                ))
                steps.append(Step(
                    op="arccos_calc",
                    input=f"arccos({value})",
                    out=f"{angle_rad:.6f}",
                    note="計算弧度值"
                ))
            else:
                steps.append(Step(
                    op="arccos",
                    input=f"arccos({value})",
                    out=f"{angle_rad:.6f}",
                    note="求角度"
                ))
            
            result = Result(
                exact=f"θ = {angle_rad:.6f}",
                approx=angle_rad
            )
            unit_symbol = " 弧度"
        
        query_desc = "求角度"
    
    # 創建顯示格式
    display = Display(
        latex=result.exact,
        latex_steps=[step.out for step in steps]
    )
    
    # 元數據
    meta = Meta(
        method="trigonometry_cosine",
        strategy_hints=[
            "餘弦函數：cos θ = 鄰邊/斜邊",
            "反餘弦函數：θ = arccos(x)",
            f"角度單位：{unit}"
        ],
        angle_mode="deg" if unit == "degrees" else "rad",
        units=unit
    )
    
    return SuccessResponse(
        task="trigonometry.cosine",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def trigonometry_tangent(params: Dict) -> SuccessResponse:
    """
    三角函數正切計算
    
    支援兩種模式：
    1. tan 模式：已知對邊和鄰邊，計算正切值
    2. arctan 模式：已知正切值，求角度
    
    Args:
        params: 參數字典，包含：
            - mode: "tan" 或 "arctan"
            - opposite: 對邊長度（tan 模式必填）
            - adjacent: 鄰邊長度（tan 模式必填）
            - value: 正切值（arctan 模式必填）
            - unit: "degrees" 或 "radians"（默認 "degrees"）
            - detail: "short" 或 "full"（默認 "full"）
    
    Returns:
        統一響應結構
    """
    # 提取參數
    mode = params.get("mode")
    opposite = params.get("opposite")
    adjacent = params.get("adjacent")
    value = params.get("value")
    unit = params.get("unit", "degrees")
    detail = params.get("detail", "full")
    
    steps = []
    
    # 參數驗證
    if mode not in ["tan", "arctan"]:
        raise ValueError(f"不支持的模式: {mode}。支援的模式：'tan' 或 'arctan'")
    
    if unit not in ["degrees", "radians"]:
        raise ValueError(f"不支持的單位: {unit}。支援的單位：'degrees' 或 'radians'")
    
    if mode == "tan":
        # tan 模式：計算正切值
        if opposite is None or adjacent is None:
            raise ValueError("tan 模式需要提供 opposite（對邊）和 adjacent（鄰邊）參數")
        
        # 轉換為浮點數
        try:
            opposite = float(opposite)
            adjacent = float(adjacent)
        except (ValueError, TypeError):
            raise ValueError("opposite 和 adjacent 必須是數字")
        
        # 驗證輸入合理性
        if adjacent == 0:
            raise ValueError("鄰邊長度不能為 0（正切值無定義）")
        if opposite < 0:
            raise ValueError("對邊長度不能為負數")
        if adjacent < 0:
            raise ValueError("鄰邊長度不能為負數")
        
        # 計算正切值
        tan_value = opposite / adjacent
        
        if detail == "full":
            steps.append(Step(
                op="formula",
                input="tan θ = 對邊 / 鄰邊",
                out=f"tan θ = {opposite} / {adjacent}",
                note="正切函數定義"
            ))
            steps.append(Step(
                op="divide",
                input=f"{opposite} / {adjacent}",
                out=f"{tan_value:.6f}",
                note="計算正切值"
            ))
        else:
            steps.append(Step(
                op="tan_calc",
                input=f"對邊={opposite}, 鄰邊={adjacent}",
                out=f"tan θ = {tan_value:.6f}",
                note="正切值計算"
            ))
        
        # 結果格式化
        result = Result(
            exact=f"tan θ = {tan_value:.6f}",
            approx=tan_value
        )
        
        query_desc = "計算正切值"
        
    elif mode == "arctan":
        # arctan 模式：求角度
        if value is None:
            raise ValueError("arctan 模式需要提供 value（正切值）參數")
        
        # 轉換為浮點數
        try:
            value = float(value)
        except (ValueError, TypeError):
            raise ValueError("value 必須是數字")
        
        # 計算角度（弧度）
        angle_rad = math.atan(value)
        
        if unit == "degrees":
            # 轉換為度數
            angle_deg = math.degrees(angle_rad)
            
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="θ = arctan(x)",
                    out=f"θ = arctan({value})",
                    note="反正切函數定義"
                ))
                steps.append(Step(
                    op="arctan_calc",
                    input=f"arctan({value})",
                    out=f"{angle_rad:.6f} 弧度",
                    note="計算弧度值"
                ))
                steps.append(Step(
                    op="convert",
                    input=f"{angle_rad:.6f} 弧度",
                    out=f"{angle_deg:.2f}°",
                    note="轉換為度數"
                ))
            else:
                steps.append(Step(
                    op="arctan",
                    input=f"arctan({value})",
                    out=f"{angle_deg:.2f}°",
                    note="求角度"
                ))
            
            result = Result(
                exact=f"θ = {angle_deg:.2f}°",
                approx=angle_deg
            )
            unit_symbol = "°"
        else:
            # 保持弧度
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="θ = arctan(x)",
                    out=f"θ = arctan({value})",
                    note="反正切函數定義"
                ))
                steps.append(Step(
                    op="arctan_calc",
                    input=f"arctan({value})",
                    out=f"{angle_rad:.6f}",
                    note="計算弧度值"
                ))
            else:
                steps.append(Step(
                    op="arctan",
                    input=f"arctan({value})",
                    out=f"{angle_rad:.6f}",
                    note="求角度"
                ))
            
            result = Result(
                exact=f"θ = {angle_rad:.6f}",
                approx=angle_rad
            )
            unit_symbol = " 弧度"
        
        query_desc = "求角度"
    
    # 創建顯示格式
    display = Display(
        latex=result.exact,
        latex_steps=[step.out for step in steps]
    )
    
    # 元數據
    meta = Meta(
        method="trigonometry_tangent",
        strategy_hints=[
            "正切函數：tan θ = 對邊/鄰邊",
            "反正切函數：θ = arctan(x)",
            f"角度單位：{unit}"
        ],
        angle_mode="deg" if unit == "degrees" else "rad",
        units=unit
    )
    
    return SuccessResponse(
        task="trigonometry.tangent",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )


def trigonometry_law_of_sines(params: Dict) -> SuccessResponse:
    """
    正弦定理計算
    
    正弦定理：a/sin(A) = b/sin(B) = c/sin(C)
    
    支援三種模式：
    1. find_angle: 已知兩邊一角，求另一角
    2. find_side: 已知兩角一邊，求另一邊
    3. solve_triangle: 解三角形（已知部分信息，求其他信息）
    
    Args:
        params: 參數字典，包含：
            - mode: "find_angle", "find_side", "solve_triangle"
            - side_a, side_b, side_c: 邊長
            - angle_A, angle_B, angle_C: 角度
            - unit: "degrees" 或 "radians"（默認 "degrees"）
            - detail: "short" 或 "full"（默認 "full"）
    
    Returns:
        統一響應結構
    """
    # 提取參數
    mode = params.get("mode")
    side_a = params.get("side_a")
    side_b = params.get("side_b")
    side_c = params.get("side_c")
    angle_A = params.get("angle_A")
    angle_B = params.get("angle_B")
    angle_C = params.get("angle_C")
    unit = params.get("unit", "degrees")
    detail = params.get("detail", "full")
    
    steps = []
    
    # 參數驗證
    if mode not in ["find_angle", "find_side", "solve_triangle"]:
        raise ValueError(f"不支持的模式: {mode}。支援的模式：'find_angle', 'find_side', 'solve_triangle'")
    
    if unit not in ["degrees", "radians"]:
        raise ValueError(f"不支持的單位: {unit}。支援的單位：'degrees' 或 'radians'")
    
    # 轉換角度為弧度（內部計算使用弧度）
    def to_radians(angle):
        if angle is None:
            return None
        if unit == "degrees":
            return math.radians(angle)
        return angle
    
    def to_degrees(angle_rad):
        if unit == "degrees":
            return math.degrees(angle_rad)
        return angle_rad
    
    angle_A_rad = to_radians(angle_A)
    angle_B_rad = to_radians(angle_B)
    angle_C_rad = to_radians(angle_C)
    
    if mode == "find_angle":
        # 已知兩邊一角，求另一角
        # 需要確定哪個角已知，哪個角未知
        if angle_A is not None and side_a is not None and side_b is not None:
            # 已知角A和邊a、b，求角B
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="正弦定理：a/sin(A) = b/sin(B)",
                    out=f"{side_a}/sin({angle_A}°) = {side_b}/sin(B)",
                    note="正弦定理公式"
                ))
                steps.append(Step(
                    op="solve",
                    input=f"sin(B) = {side_b} × sin({angle_A}°) / {side_a}",
                    out=f"sin(B) = {side_b} × {math.sin(angle_A_rad):.6f} / {side_a}",
                    note="解出 sin(B)"
                ))
            
            sin_B = side_b * math.sin(angle_A_rad) / side_a
            
            if sin_B > 1 or sin_B < 0:
                raise ValueError("計算結果超出正弦值範圍，請檢查輸入數據")
            
            angle_B_rad = math.asin(sin_B)
            angle_B_deg = to_degrees(angle_B_rad)
            
            if detail == "full":
                steps.append(Step(
                    op="arcsin",
                    input=f"sin(B) = {sin_B:.6f}",
                    out=f"B = {angle_B_deg:.2f}°",
                    note="求角B"
                ))
            else:
                steps.append(Step(
                    op="law_of_sines",
                    input=f"已知：a={side_a}, b={side_b}, A={angle_A}°",
                    out=f"B = {angle_B_deg:.2f}°",
                    note="正弦定理求角"
                ))
            
            result = Result(
                exact=f"B = {angle_B_deg:.2f}°",
                approx=angle_B_deg
            )
            query_desc = "求角B"
            
        elif angle_B is not None and side_a is not None and side_b is not None:
            # 已知角B和邊a、b，求角A
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="正弦定理：a/sin(A) = b/sin(B)",
                    out=f"{side_a}/sin(A) = {side_b}/sin({angle_B}°)",
                    note="正弦定理公式"
                ))
                steps.append(Step(
                    op="solve",
                    input=f"sin(A) = {side_a} × sin({angle_B}°) / {side_b}",
                    out=f"sin(A) = {side_a} × {math.sin(angle_B_rad):.6f} / {side_b}",
                    note="解出 sin(A)"
                ))
            
            sin_A = side_a * math.sin(angle_B_rad) / side_b
            
            if sin_A > 1 or sin_A < 0:
                raise ValueError("計算結果超出正弦值範圍，請檢查輸入數據")
            
            angle_A_rad = math.asin(sin_A)
            angle_A_deg = to_degrees(angle_A_rad)
            
            if detail == "full":
                steps.append(Step(
                    op="arcsin",
                    input=f"sin(A) = {sin_A:.6f}",
                    out=f"A = {angle_A_deg:.2f}°",
                    note="求角A"
                ))
            else:
                steps.append(Step(
                    op="law_of_sines",
                    input=f"已知：a={side_a}, b={side_b}, B={angle_B}°",
                    out=f"A = {angle_A_deg:.2f}°",
                    note="正弦定理求角"
                ))
            
            result = Result(
                exact=f"A = {angle_A_deg:.2f}°",
                approx=angle_A_deg
            )
            query_desc = "求角A"
        else:
            raise ValueError("find_angle 模式需要提供兩個邊長和一個對應的角度")
    
    elif mode == "find_side":
        # 已知兩角一邊，求另一邊
        if angle_A is not None and angle_B is not None and side_a is not None:
            # 已知角A、角B和邊a，求邊b
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="正弦定理：a/sin(A) = b/sin(B)",
                    out=f"{side_a}/sin({angle_A}°) = b/sin({angle_B}°)",
                    note="正弦定理公式"
                ))
                steps.append(Step(
                    op="solve",
                    input=f"b = {side_a} × sin({angle_B}°) / sin({angle_A}°)",
                    out=f"b = {side_a} × {math.sin(angle_B_rad):.6f} / {math.sin(angle_A_rad):.6f}",
                    note="解出邊b"
                ))
            
            side_b = side_a * math.sin(angle_B_rad) / math.sin(angle_A_rad)
            
            if detail == "full":
                steps.append(Step(
                    op="calculate",
                    input=f"b = {side_a} × {math.sin(angle_B_rad):.6f} / {math.sin(angle_A_rad):.6f}",
                    out=f"b = {side_b:.6f}",
                    note="計算結果"
                ))
            else:
                steps.append(Step(
                    op="law_of_sines",
                    input=f"已知：A={angle_A}°, B={angle_B}°, a={side_a}",
                    out=f"b = {side_b:.6f}",
                    note="正弦定理求邊"
                ))
            
            result = Result(
                exact=f"b = {side_b:.6f}",
                approx=side_b
            )
            query_desc = "求邊b"
            
        elif angle_A is not None and angle_B is not None and side_b is not None:
            # 已知角A、角B和邊b，求邊a
            if detail == "full":
                steps.append(Step(
                    op="formula",
                    input="正弦定理：a/sin(A) = b/sin(B)",
                    out=f"a/sin({angle_A}°) = {side_b}/sin({angle_B}°)",
                    note="正弦定理公式"
                ))
                steps.append(Step(
                    op="solve",
                    input=f"a = {side_b} × sin({angle_A}°) / sin({angle_B}°)",
                    out=f"a = {side_b} × {math.sin(angle_A_rad):.6f} / {math.sin(angle_B_rad):.6f}",
                    note="解出邊a"
                ))
            
            side_a = side_b * math.sin(angle_A_rad) / math.sin(angle_B_rad)
            
            if detail == "full":
                steps.append(Step(
                    op="calculate",
                    input=f"a = {side_b} × {math.sin(angle_A_rad):.6f} / {math.sin(angle_B_rad):.6f}",
                    out=f"a = {side_a:.6f}",
                    note="計算結果"
                ))
            else:
                steps.append(Step(
                    op="law_of_sines",
                    input=f"已知：A={angle_A}°, B={angle_B}°, b={side_b}",
                    out=f"a = {side_a:.6f}",
                    note="正弦定理求邊"
                ))
            
            result = Result(
                exact=f"a = {side_a:.6f}",
                approx=side_a
            )
            query_desc = "求邊a"
        else:
            raise ValueError("find_side 模式需要提供兩個角度和一個對應的邊長")
    
    elif mode == "solve_triangle":
        # 解三角形：根據已知信息求其他信息
        known_count = sum(1 for x in [side_a, side_b, side_c, angle_A, angle_B, angle_C] if x is not None)
        
        if known_count < 3:
            raise ValueError("解三角形至少需要3個已知量")
        
        # 這裡可以實現更複雜的解三角形邏輯
        # 暫時提供基本的兩角一邊情況
        if angle_A is not None and angle_B is not None and side_a is not None:
            # 已知兩角一邊，求其他信息
            angle_C_rad = math.pi - angle_A_rad - angle_B_rad
            angle_C_deg = to_degrees(angle_C_rad)
            
            side_b = side_a * math.sin(angle_B_rad) / math.sin(angle_A_rad)
            side_c = side_a * math.sin(angle_C_rad) / math.sin(angle_A_rad)
            
            if detail == "full":
                steps.append(Step(
                    op="angle_sum",
                    input="三角形內角和 = 180°",
                    out=f"C = 180° - {angle_A}° - {angle_B}° = {angle_C_deg:.2f}°",
                    note="求角C"
                ))
                steps.append(Step(
                    op="law_of_sines",
                    input="正弦定理求邊b和c",
                    out=f"b = {side_b:.6f}, c = {side_c:.6f}",
                    note="應用正弦定理"
                ))
            else:
                steps.append(Step(
                    op="solve_triangle",
                    input=f"已知：A={angle_A}°, B={angle_B}°, a={side_a}",
                    out=f"解：C={angle_C_deg:.2f}°, b={side_b:.6f}, c={side_c:.6f}",
                    note="解三角形"
                ))
            
            result = Result(
                exact=f"解：A={angle_A}°, B={angle_B}°, C={angle_C_deg:.2f}°, a={side_a}, b={side_b:.6f}, c={side_c:.6f}",
                approx=angle_C_deg  # 使用主要結果作為近似值
            )
            query_desc = "解三角形"
        else:
            raise ValueError("solve_triangle 模式暫時只支援兩角一邊的情況")
    
    # 創建顯示格式
    display = Display(
        latex=result.exact,
        latex_steps=[step.out for step in steps]
    )
    
    # 元數據
    meta = Meta(
        method="trigonometry_law_of_sines",
        strategy_hints=[
            "正弦定理：a/sin(A) = b/sin(B) = c/sin(C)",
            f"模式：{mode}",
            f"角度單位：{unit}"
        ],
        angle_mode="deg" if unit == "degrees" else "rad",
        units=unit
    )
    
    return SuccessResponse(
        task="trigonometry.law_of_sines",
        result=result,
        steps=steps,
        display=display,
        meta=meta
    )
