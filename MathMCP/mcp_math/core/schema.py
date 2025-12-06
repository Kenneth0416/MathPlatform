"""统一的数据结构与响应规范"""

from typing import Optional, List, Dict, Any, Literal, Union
from pydantic import BaseModel, Field
import uuid
from enum import Enum


class ErrorCode(str, Enum):
    """错误代码枚举"""
    PARSE_ERROR = "PARSE_ERROR"
    DOMAIN_ERROR = "DOMAIN_ERROR"
    UNSUPPORTED = "UNSUPPORTED"
    TIMEOUT = "TIMEOUT"
    VALIDATION_ERROR = "VALIDATION_ERROR"


class Step(BaseModel):
    """步骤结构"""
    op: str = Field(..., description="操作类型")
    input: Union[str, List[str]] = Field(..., alias="in", description="输入表达式")
    out: str = Field(..., description="输出表达式")
    note: Optional[str] = Field(None, description="步骤说明")
    latex: Optional[str] = Field(None, description="LaTeX 格式（可选）")

    class Config:
        populate_by_name = True


class Display(BaseModel):
    """显示格式"""
    latex: str = Field(..., description="主结果的 LaTeX 表示")
    latex_steps: Optional[List[str]] = Field(None, description="步骤的 LaTeX 表示")


class Meta(BaseModel):
    """元数据"""
    method: str = Field(..., description="使用的方法")
    strategy_hints: Optional[List[str]] = Field(None, description="策略提示")
    angle_mode: Literal["deg", "rad"] = Field("deg", description="角度模式")
    units: Optional[str] = Field(None, description="单位")
    trace_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="追踪ID")
    version: str = Field("0.1.0", description="版本号")
    warnings: List[str] = Field(default_factory=list, description="警告信息")
    intermediate: Optional[Dict[str, Any]] = Field(None, description="中间结果")
    scale_k: Optional[float] = Field(None, description="几何相似缩放比例")


class Result(BaseModel):
    """结果结构"""
    exact: Union[str, int, float, List[str]] = Field(..., description="精确结果")
    approx: Optional[float] = Field(None, description="近似小数值")
    solutions: Optional[List[str]] = Field(None, description="方程解（可选）")


class SuccessResponse(BaseModel):
    """成功响应"""
    ok: bool = Field(True, description="请求成功标志")
    task: str = Field(..., description="任务类型")
    result: Result = Field(..., description="计算结果")
    steps: List[Step] = Field(default_factory=list, description="计算步骤")
    display: Display = Field(..., description="显示格式")
    meta: Meta = Field(..., description="元数据")


class ErrorDetail(BaseModel):
    """错误详情"""
    code: ErrorCode = Field(..., description="错误代码")
    message: str = Field(..., description="错误消息")
    hint: Optional[str] = Field(None, description="错误提示")


class ErrorResponse(BaseModel):
    """错误响应"""
    ok: bool = Field(False, description="请求失败标志")
    error: ErrorDetail = Field(..., description="错误详情")
    trace_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="追踪ID")


# 请求模型

class SimplifyRequest(BaseModel):
    """化简请求"""
    expr: str = Field(..., description="表达式")
    detail: Literal["short", "full"] = Field("short", description="详细程度")
    exact: bool = Field(True, description="是否返回精确结果")
    decimals: int = Field(4, description="小数位数")
    language: str = Field("zh", description="语言")


class ExpandRequest(BaseModel):
    """展开请求"""
    expr: str = Field(..., description="表达式")
    detail: Literal["short", "full"] = Field("short", description="详细程度")
    exact: bool = Field(True, description="是否返回精确结果")
    language: str = Field("zh", description="语言")


class FactorRequest(BaseModel):
    """因式分解请求"""
    expr: str = Field(..., description="表达式")
    detail: Literal["short", "full"] = Field("short", description="详细程度")
    exact: bool = Field(True, description="是否返回精确结果")
    language: str = Field("zh", description="语言")


class SolveRequest(BaseModel):
    """解方程请求"""
    eq: str = Field(..., description="方程")
    var: Optional[str] = Field("x", description="变量")
    method: Literal["auto", "quadratic_formula", "factor"] = Field("auto", description="求解方法")
    detail: Literal["short", "full"] = Field("short", description="详细程度")
    exact: bool = Field(True, description="是否返回精确结果")
    decimals: int = Field(4, description="小数位数")
    language: str = Field("zh", description="语言")


class FractionRequest(BaseModel):
    """分式运算请求"""
    a: str = Field(..., description="第一个数")
    b: str = Field(..., description="第二个数")
    op: Literal["+", "-", "*", "/"] = Field(..., description="运算符")
    detail: Literal["short", "full"] = Field("short", description="详细程度")
    exact: bool = Field(True, description="是否返回精确结果")


class PercentRequest(BaseModel):
    """百分比计算请求"""
    base: float = Field(..., description="基数")
    rate: float = Field(..., description="比率（百分数）")
    mode: Literal["increase", "decrease"] = Field(..., description="增长或减少")
    decimals: int = Field(4, description="小数位数")


class PythagorasRequest(BaseModel):
    """勾股定理请求"""
    known: Literal["legs", "hypotenuse"] = Field(..., description="已知条件")
    a: Optional[float] = Field(None, description="直角边a")
    b: Optional[float] = Field(None, description="直角边b")
    c: Optional[float] = Field(None, description="斜边c")
    detail: Literal["short", "full"] = Field("short", description="详细程度")


class SimilarRequest(BaseModel):
    """相似三角形请求"""
    tri1: Dict[str, float] = Field(..., description="三角形1的边")
    tri2: Dict[str, float] = Field(..., description="三角形2的边")
    mapping: Dict[str, str] = Field(..., description="顶点对应关系")
    query: str = Field(..., description="查询的边")
    detail: Literal["short", "full"] = Field("short", description="详细程度")


class CircleAnglesRequest(BaseModel):
    """圆角度计算请求"""
    center_angle: Optional[float] = Field(None, description="圆心角")
    inscribed_angle: Optional[float] = Field(None, description="圆周角")
    mode: Literal["deg", "rad"] = Field("deg", description="角度模式")
    query: Literal["center", "inscribed"] = Field(..., description="查询类型")


class CombinatoricsRequest(BaseModel):
    """组合排列请求"""
    n: int = Field(..., description="总数")
    r: int = Field(..., description="选择数")


class EvalRequest(BaseModel):
    """数值计算请求"""
    expr: str = Field(..., description="表达式")
    precision: int = Field(10, description="精度")


def create_error_response(
    code: ErrorCode,
    message: str,
    hint: Optional[str] = None
) -> ErrorResponse:
    """创建错误响应"""
    return ErrorResponse(
        error=ErrorDetail(code=code, message=message, hint=hint)
    )



