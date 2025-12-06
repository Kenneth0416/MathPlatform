"""核心数学功能模块"""

from .algebra import simplify_expression, expand_expression, factor_expression, solve_equation
from .arithmetic import fraction_operation, percent_calculation
from .geometry import pythagoras_theorem, similar_triangles, circle_angles
from .combinatorics import combination, permutation
from .inequality import solve_inequality
from .trigonometry import (
    trigonometry_sine, 
    trigonometry_cosine, 
    trigonometry_tangent,
    trigonometry_law_of_sines
)

__all__ = [
    'simplify_expression', 'expand_expression', 'factor_expression', 'solve_equation',
    'fraction_operation', 'percent_calculation',
    'pythagoras_theorem', 'similar_triangles', 'circle_angles',
    'combination', 'permutation',
    'solve_inequality',
    'trigonometry_sine', 'trigonometry_cosine', 'trigonometry_tangent', 'trigonometry_law_of_sines'
]

