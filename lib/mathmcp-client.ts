// MathMCP 客户端模块
// 提供与 MathMCP HTTP API 的接口集成

export interface MCPRequest {
  [key: string]: any
}

export interface MCPResponse {
  ok: boolean
  task: string
  result: {
    exact?: string
    approx?: number | null
    solutions?: string[]
    value?: number | string
    [key: string]: any
  }
  steps?: Array<{
    op: string
    in: string
    out: string
    note: string
    latex?: string | null
  }>
  display?: {
    latex?: string
    latex_steps?: string[]
  }
  meta?: {
    method?: string
    strategy_hints?: string[]
    angle_mode?: string
    trace_id?: string
    version?: string
    warnings?: string[]
    [key: string]: any
  }
}

export interface MCPError {
  ok: false
  error: string
  detail?: string
  code?: string
}

export class MathMCPClient {
  private baseURL: string
  private timeout: number

  constructor(baseURL: string = 'http://localhost:8001', timeout: number = 10000) {
    this.baseURL = baseURL
    this.timeout = timeout
  }

  // 通用请求方法
  private async makeRequest(endpoint: string, data: MCPRequest): Promise<MCPResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: MCPResponse | MCPError = await response.json()

      if (!result.ok) {
        throw new Error(`MathMCP Error: ${result.error}`)
      }

      return result
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('MathMCP request timeout')
      }
      throw error
    }
  }

  // 代数运算
  async solveEquation(equation: string, variable: string = 'x', options?: {
    method?: 'auto' | 'quadratic_formula' | 'factoring'
    detail?: 'short' | 'full'
    exact?: boolean
    decimals?: number
    language?: 'zh' | 'en'
  }): Promise<MCPResponse> {
    return this.makeRequest('/algebra/solve', {
      eq: equation,
      var: variable,
      method: options?.method || 'auto',
      detail: options?.detail || 'short',
      exact: options?.exact ?? true,
      decimals: options?.decimals || 4,
      language: options?.language || 'zh'
    })
  }

  async simplifyExpression(expression: string, options?: {
    detail?: 'short' | 'full'
    exact?: boolean
    language?: 'zh' | 'en'
  }): Promise<MCPResponse> {
    return this.makeRequest('/algebra/simplify', {
      expr: expression,
      detail: options?.detail || 'short',
      exact: options?.exact ?? true,
      language: options?.language || 'zh'
    })
  }

  async expandExpression(expression: string, options?: {
    detail?: 'short' | 'full'
    exact?: boolean
    language?: 'zh' | 'en'
  }): Promise<MCPResponse> {
    return this.makeRequest('/algebra/expand', {
      expr: expression,
      detail: options?.detail || 'short',
      exact: options?.exact ?? true,
      language: options?.language || 'zh'
    })
  }

  async factorExpression(expression: string, options?: {
    detail?: 'short' | 'full'
    exact?: boolean
    language?: 'zh' | 'en'
  }): Promise<MCPResponse> {
    return this.makeRequest('/algebra/factor', {
      expr: expression,
      detail: options?.detail || 'short',
      exact: options?.exact ?? true,
      language: options?.language || 'zh'
    })
  }

  // 算术运算
  async fractionOperation(a: string, b: string, operator: '+' | '-' | '*' | '/', options?: {
    detail?: 'short' | 'full'
    exact?: boolean
  }): Promise<MCPResponse> {
    return this.makeRequest('/arithmetic/fraction', {
      a,
      b,
      op: operator,
      detail: options?.detail || 'short',
      exact: options?.exact ?? true
    })
  }

  async percentCalculation(base: number, rate: number, mode: 'increase' | 'decrease' | 'of', options?: {
    decimals?: number
  }): Promise<MCPResponse> {
    return this.makeRequest('/arithmetic/percent', {
      base,
      rate,
      mode,
      decimals: options?.decimals || 2
    })
  }

  // 几何计算
  async pythagoreanTheorem(known: 'legs' | 'hypotenuse' | 'leg_a' | 'leg_b', a?: number, b?: number, c?: number, options?: {
    detail?: 'short' | 'full'
  }): Promise<MCPResponse> {
    return this.makeRequest('/geometry/pythagoras', {
      known,
      a,
      b,
      c,
      detail: options?.detail || 'short'
    })
  }

  async similarTriangles(tri1: Record<string, number>, tri2: Record<string, number>,
    mapping: Record<string, string>, query: string, options?: {
    detail?: 'short' | 'full'
  }): Promise<MCPResponse> {
    return this.makeRequest('/geometry/similar', {
      tri1,
      tri2,
      mapping,
      query,
      detail: options?.detail || 'short'
    })
  }

  async circleAngles(type: string, given?: number, options?: {
    detail?: 'short' | 'full'
  }): Promise<MCPResponse> {
    return this.makeRequest('/geometry/circle_angles', {
      type,
      given,
      detail: options?.detail || 'short'
    })
  }

  // 组合数学
  async combinations(n: number, r: number, options?: {
    detail?: 'short' | 'full'
  }): Promise<MCPResponse> {
    return this.makeRequest('/combinatorics/ncr', {
      n,
      r,
      detail: options?.detail || 'short'
    })
  }

  async permutations(n: number, r: number, options?: {
    detail?: 'short' | 'full'
  }): Promise<MCPResponse> {
    return this.makeRequest('/combinatorics/npr', {
      n,
      r,
      detail: options?.detail || 'short'
    })
  }

  // 数值计算
  async evaluateExpression(expression: string, options?: {
    decimals?: number
    angle_mode?: 'deg' | 'rad'
  }): Promise<MCPResponse> {
    return this.makeRequest('/eval/numeric', {
      expr: expression,
      decimals: options?.decimals || 4,
      angle_mode: options?.angle_mode || 'deg'
    })
  }

  // 健康检查
  async healthCheck(): Promise<{ status: 'ok', service: string }> {
    try {
      const response = await fetch(`${this.baseURL}/health`)
      if (response.ok) {
        return { status: 'ok', service: 'mathmcp' }
      }
      throw new Error('Health check failed')
    } catch (error) {
      throw new Error('MathMCP service unavailable')
    }
  }

  // 智能数学问题解析（根据问题类型自动选择合适的工具）
  async solveMathProblem(problem: string, options?: {
    language?: 'zh' | 'en'
    detail?: 'short' | 'full'
  }): Promise<MCPResponse> {
    const trimmedProblem = problem.trim()

    // 尝试解析方程
    if (trimmedProblem.includes('=') && (trimmedProblem.includes('x') || trimmedProblem.includes('y') || trimmedProblem.includes('z'))) {
      const match = trimmedProblem.match(/([xyz])\s*=/)
      if (match) {
        return this.solveEquation(trimmedProblem, match[1], options)
      }
    }

    // 尝试解析分数运算
    if (trimmedProblem.includes('/') && (trimmedProblem.includes('+') || trimmedProblem.includes('-') || trimmedProblem.includes('*'))) {
      // 简单的分数运算检测
      const fractionMatch = trimmedProblem.match(/([+*-]?)/)
      if (fractionMatch) {
        // 这里需要更复杂的解析来分离两个分数
        // 暂时返回错误，让调用者处理
        throw new Error('Complex fraction parsing not implemented')
      }
    }

    // 尝试作为数值表达式计算
    try {
      return this.evaluateExpression(trimmedProblem, options)
    } catch (error) {
      throw new Error(`Unable to solve problem: ${problem}`)
    }
  }
}

// 创建全局客户端实例
export const mathMCPClient = new MathMCPClient()

// 便捷函数
export const solveEquation = (equation: string, variable?: string, options?: any) =>
  mathMCPClient.solveEquation(equation, variable, options)

export const simplifyExpression = (expression: string, options?: any) =>
  mathMCPClient.simplifyExpression(expression, options)

export const expandExpression = (expression: string, options?: any) =>
  mathMCPClient.expandExpression(expression, options)

export const factorExpression = (expression: string, options?: any) =>
  mathMCPClient.factorExpression(expression, options)

export const evaluateMath = (expression: string, options?: any) =>
  mathMCPClient.evaluateExpression(expression, options)

export const checkMathHealth = () => mathMCPClient.healthCheck()

// 类型守卫函数
export function isMCPSuccess(response: MCPResponse | MCPError): response is MCPResponse {
  return response && (response as MCPResponse).ok === true
}

export function isMCPError(response: MCPResponse | MCPError): response is MCPError {
  return response && (response as MCPError).ok === false
}