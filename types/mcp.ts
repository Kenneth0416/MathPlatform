// MCP 調用相關類型定義

export type MCPStatus = 'executing' | 'success' | 'error'

export interface MCPToolCall {
  tool_name: string
  parameters: Record<string, any>
  result?: string
  error?: string
  executionTime?: number
  startTime?: number
}

export interface MCPCallInfo {
  id: string
  toolName: string
  status: MCPStatus
  summary: string
  details?: {
    parameters: Record<string, any>
    result?: string
    error?: string
    executionTime: number
  }
}

export interface MCPCallCardProps {
  callInfo: MCPCallInfo
  onToggle?: () => void
  defaultExpanded?: boolean
}

// MCP 工具本地化顯示名稱
export const MCP_TOOL_NAMES: Record<string, { zhTW: string; zhCN: string; en: string }> = {
  algebra_solve: {
    zhTW: '代數方程求解',
    zhCN: '代数方程求解',
    en: 'Algebraic Equation Solver'
  },
  algebra_simplify: {
    zhTW: '代數表達式化簡',
    zhCN: '代数表达式化简',
    en: 'Algebraic Expression Simplifier'
  },
  algebra_expand: {
    zhTW: '代數表達式展開',
    zhCN: '代数表达式展开',
    en: 'Algebraic Expression Expander'
  },
  algebra_factor: {
    zhTW: '代數表達式因式分解',
    zhCN: '代数表达式因式分解',
    en: 'Algebraic Expression Factorizer'
  },
  arithmetic_fraction: {
    zhTW: '分數運算計算',
    zhCN: '分数运算计算',
    en: 'Fraction Calculator'
  },
  arithmetic_percent: {
    zhTW: '百分比計算',
    zhCN: '百分比计算',
    en: 'Percentage Calculator'
  },
  eval_numeric: {
    zhTW: '數值計算',
    zhCN: '数值计算',
    en: 'Numerical Calculator'
  },
  geometry_pythagoras: {
    zhTW: '勾股定理計算',
    zhCN: '勾股定理计算',
    en: 'Pythagorean Theorem Calculator'
  },
  geometry_similar_triangles: {
    zhTW: '相似三角形計算',
    zhCN: '相似三角形计算',
    en: 'Similar Triangles Calculator'
  },
  geometry_circle_angles: {
    zhTW: '圓角度計算',
    zhCN: '圆角度计算',
    en: 'Circle Angle Calculator'
  },
  combinatorics_ncr: {
    zhTW: '組合數計算',
    zhCN: '组合数计算',
    en: 'Combination Calculator'
  },
  combinatorics_npr: {
    zhTW: '排列數計算',
    zhCN: '排列数计算',
    en: 'Permutation Calculator'
  }
}

// 工具狀態本地化
export const MCP_STATUS_LABELS: Record<MCPStatus, { zhTW: string; zhCN: string; en: string }> = {
  executing: {
    zhTW: '計算中',
    zhCN: '计算中',
    en: 'Calculating'
  },
  success: {
    zhTW: '計算完成',
    zhCN: '计算完成',
    en: 'Calculation Complete'
  },
  error: {
    zhTW: '計算失敗',
    zhCN: '计算失败',
    en: 'Calculation Failed'
  }
}

// 生成調用摘要文本
export function generateMCPSummary(
  toolName: string,
  status: MCPStatus,
  result?: string,
  executionTime?: number
): string {
  const toolDisplayName = MCP_TOOL_NAMES[toolName]?.zhTW || toolName

  if (status === 'executing') {
    return `正在使用 ${toolDisplayName}...`
  }

  if (status === 'error') {
    return `${toolDisplayName} 計算失敗`
  }

  const timeText = executionTime ? ` (${executionTime}ms)` : ''
  return `${toolDisplayName} 計算完成${timeText}`
}