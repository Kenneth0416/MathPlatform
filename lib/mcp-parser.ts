// MCP 调用解析器
// 解析和执行 AI 响应中的 MathMCP 工具调用

export interface MCPCall {
  tool: string
  params: Record<string, any>
  options?: {
    detail?: 'short' | 'full'
    exact?: boolean
    decimals?: number
    language?: 'zh' | 'en'
    angle_mode?: 'deg' | 'rad'
    method?: 'auto' | 'quadratic_formula' | 'factoring'
  }
  rawCall: string
}

export interface MCPExecutionResult {
  success: boolean
  data?: any
  error?: string
  tool?: string
  rawCall?: string
  executionTime?: number
}

// MCP 调用格式：[MCP:工具名:参数1,参数2,...]
// 改进的正则表达式，支持更复杂的参数格式，包括包含空格、运算符的表达式
const MCP_CALL_REGEX = /\[MCP:([a-zA-Z_]\w*):([^:\[\]]+(?::[^:\[\]]+)*)\]/g

export class MCPParser {

  // 从文本中提取所有 MCP 调用
  static extractMCPCalls(text: string): MCPCall[] {
    const calls: MCPCall[] = []
    let match

    while ((match = MCP_CALL_REGEX.exec(text)) !== null) {
      const tool = match[1]
      const paramString = match[2].trim()
      const rawCall = match[0]

      try {
        const { params, options } = this.parseParameters(tool, paramString)

        calls.push({
          tool,
          params,
          options,
          rawCall
        })
      } catch (error) {
        console.warn(`Failed to parse MCP call: ${rawCall}`, error)
      }
    }

    return calls
  }

  // 解析参数字符串
  private static parseParameters(tool: string, paramString: string): {
    params: Record<string, any>,
    options?: Record<string, any>
  } {
    const params: Record<string, any> = {}
    const options: Record<string, any> = {}

    // 智能分割参数，支持逗号和冒号作为分隔符
    const smartSplit = (str: string): string[] => {
      // 先尝试按逗号分割，如果没有逗号再按冒号分割
      if (str.includes(',')) {
        return str.split(',').map(s => s.trim())
      } else if (str.includes(':')) {
        return str.split(':').map(s => s.trim())
      }
      return [str.trim()]
    }

    const parts = smartSplit(paramString)

    // 根据工具类型解析不同的参数格式
    switch (tool) {
      case 'algebra_solve':
        // 格式：[MCP:algebra_solve:方程式,变量] 或 [MCP:algebra_solve:x+2=8,x]
        params.equation = parts[0]?.trim() || ''
        if (parts[1]) {
          params.variable = parts[1].trim()
        }
        break

      case 'algebra_simplify':
      case 'algebra_expand':
      case 'algebra_factor':
        // 格式：[MCP:algebra_simplify:表达式]
        params.expression = parts[0]?.trim() || ''
        break

      case 'arithmetic_fraction':
        // 格式：[MCP:arithmetic_fraction:分数1,分数2,运算符]
        if (parts.length >= 2) {
          params.a = parts[0]?.trim() || ''
          params.b = parts[1]?.trim() || ''
          if (parts[2]) {
            const op = parts[2]?.trim()
            if (['+', '-', '*', '/'].includes(op)) {
              params.operator = op as '+' | '-' | '*' | '/'
            }
          }
        }
        break

      case 'eval_numeric':
        // 格式：[MCP:eval_numeric:表达式]
        params.expr = parts[0]?.trim() || ''
        break

      case 'geometry_pythagoras':
        // 格式：[MCP:geometry_pythagoras:已知类型,a边,b边,c边]
        params.known = parts[0]?.trim() || 'legs'
        if (parts[1]) params.a = parseFloat(parts[1]?.trim()) || undefined
        if (parts[2]) params.b = parseFloat(parts[2]?.trim()) || undefined
        if (parts[3]) params.c = parseFloat(parts[3]?.trim()) || undefined
        break

      case 'geometry_similar':
      case 'geometry_similar_triangles':
        // 格式：[MCP:geometry_similar_triangles:边长1,边长2,边长3,目标边]
        if (parts.length >= 3) {
          const tri1 = {}
          const tri2 = {}

          // 简化处理：假设前三个数字是三角形ABC的边，第四个是目标边
          if (parts[0]) (tri1 as any)['a'] = parseFloat(parts[0].trim())
          if (parts[1]) (tri1 as any)['b'] = parseFloat(parts[1].trim())
          if (parts[2]) (tri1 as any)['c'] = parseFloat(parts[2].trim())

          params.tri1 = tri1
          params.tri2 = tri2
          params.mapping = {}
          params.query = parts[3]?.trim() || ''
        }
        break

      case 'combinatorics_ncr':
      case 'combinatorics_npr':
        // 格式：[MCP:combinatorics_ncr:n值,r值]
        if (parts[0]) params.n = parseInt(parts[0]?.trim()) || 0
        if (parts[1]) params.r = parseInt(parts[1]?.trim()) || 0
        break

      case 'arithmetic_percent':
        // 格式：[MCP:arithmetic_percent:基数,百分比,模式]
        if (parts[0]) params.base = parseFloat(parts[0]?.trim()) || 0
        if (parts[1]) params.rate = parseFloat(parts[1]?.trim()) || 0
        if (parts[2]) {
          const mode = parts[2]?.trim().toLowerCase()
          if (['increase', 'decrease', 'of'].includes(mode)) {
            params.mode = mode as 'increase' | 'decrease' | 'of'
          }
        }
        break

      case 'geometry_circle_angles':
        // 格式：[MCP:geometry_circle_angles:类型,角度值]
        params.type = parts[0]?.trim() || 'inscribed'
        if (parts[1]) params.given = parseFloat(parts[1]?.trim()) || undefined
        break

      default:
        // 默认：按序号保存参数
        parts.forEach((part, index) => {
          const trimmed = part.trim()
          if (trimmed) {
            params[`param${index + 1}`] = trimmed
          }
        })
    }

    return { params, options: Object.keys(options).length > 0 ? options : undefined }
  }

  // 执行单个 MCP 调用
  static async executeMCPCall(call: MCPCall): Promise<MCPExecutionResult> {
    const startTime = Date.now()

    // 尝试多个可能的URL端点，确保连接成功
    const possibleUrls = [
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mathmcp`,
      'http://localhost:3000/api/mathmcp',
      'http://127.0.0.1:3000/api/mathmcp',
    ]

    let lastError: Error | null = null

    for (const apiUrl of possibleUrls) {
      try {
        console.log(`🔧 Attempting MCP request to: ${apiUrl}`)
        console.log(`📝 Request data:`, {
          tool: call.tool,
          params: call.params,
          options: call.options
        })

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: call.tool,
            params: call.params,
            options: call.options
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const result = await response.json()
        const executionTime = Date.now() - startTime

        console.log(`✅ MCP request successful:`, {
          tool: call.tool,
          apiUrl,
          executionTime
        })

        if (result.success) {
          return {
            success: true,
            data: result.data,
            tool: call.tool,
            rawCall: call.rawCall,
            executionTime
          }
        } else {
          return {
            success: false,
            error: result.error,
            tool: call.tool,
            rawCall: call.rawCall,
            executionTime
          }
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`❌ MCP request failed for ${apiUrl}:`, lastError.message)
        continue // 尝试下一个URL
      }
    }

    // 所有URL都失败了
    const executionTime = Date.now() - startTime
    const errorMessage = lastError?.message || 'All connection attempts failed'

    console.error(`❌ All MCP connection attempts failed for ${call.tool}:`, {
      errorMessage,
      attemptedUrls: possibleUrls,
      executionTime
    })

    return {
      success: false,
      error: `MCP服务连接失败: ${errorMessage}`,
      tool: call.tool,
      rawCall: call.rawCall,
      executionTime
    }
  }

  // 执行文本中的所有 MCP 调用（并行执行）
  static async executeAllMCPCalls(text: string): Promise<{
    processedText: string
    results: MCPExecutionResult[]
    executionTime: number
  }> {
    const calls = this.extractMCPCalls(text)

    if (calls.length === 0) {
      return {
        processedText: text,
        results: [],
        executionTime: 0
      }
    }

    console.log(`🔧 Executing ${calls.length} MathMCP calls in parallel...`)
    const startTime = Date.now()

    // 并行执行所有调用
    const executionPromises = calls.map(call => this.executeMCPCall(call))
    const results = await Promise.all(executionPromises)

    const totalExecutionTime = Date.now() - startTime

    // 替换文本中的 MCP 调用为结果
    let processedText = text
    const successfulResults: string[] = []
    const failedResults: string[] = []

    results.forEach((result, index) => {
      const originalCall = calls[index].rawCall

      if (result.success && result.data) {
        const replacement = this.formatMCPResult(result.data, result.tool)
        processedText = processedText.replace(originalCall, replacement)
        successfulResults.push(`${result.tool}: ✅`)
      } else {
        const replacement = `🔧 MathMCP 计算失败：${result.error || '未知错误'}`
        processedText = processedText.replace(originalCall, replacement)
        failedResults.push(`${result.tool}: ❌`)
      }
    })

    console.log(`✅ MathMCP execution completed:`, {
      totalCalls: calls.length,
      successful: successfulResults.length,
      failed: failedResults.length,
      executionTime: totalExecutionTime,
      successfulCalls: successfulResults,
      failedCalls: failedResults
    })

    return {
      processedText,
      results,
      executionTime: totalExecutionTime
    }
  }

  // 格式化 MCP 结果为可读文本
  private static formatMCPResult(data: any, tool: string): string {
    if (!data) {
      return '🔧 计算失败：返回数据为空'
    }

    const result = data.result
    let output = ''

    try {
      switch (tool) {
        case 'algebra_solve':
          if (result?.solutions && Array.isArray(result.solutions)) {
            const solutions = result.solutions.map((sol: any) => sol.toString()).join(', ')
            output = `∎ 方程求解结果：${solutions}`
          } else if (result?.exact) {
            output = `∎ 方程求解结果：${result.exact}`
          } else if (result?.approx !== undefined) {
            output = `∎ 方程求解结果：${result.approx}`
          } else {
            output = `∎ 方程求解完成：无解或参数错误`
          }
          break

        case 'algebra_simplify':
          output = `∎ 表达式化简结果：${result?.exact || result?.approx || '化简完成'}`
          break

        case 'algebra_expand':
          output = `∎ 表达式展开结果：${result?.exact || result?.approx || '展开完成'}`
          break

        case 'algebra_factor':
          output = `∎ 表达式因式分解结果：${result?.exact || result?.approx || '分解完成'}`
          break

        case 'arithmetic_fraction':
          output = `∎ 分数运算结果：${result?.exact || result?.approx || result?.value || '计算完成'}`
          break

        case 'eval_numeric':
          output = `∎ 数值计算结果：${result?.exact || result?.approx || result?.value || '计算完成'}`
          break

        case 'geometry_pythagoras':
          output = `∎ 勾股定理计算结果：${result?.exact || result?.approx || '计算完成'}`
          break

        case 'geometry_similar':
        case 'geometry_similar_triangles':
          if (result?.solutions && Array.isArray(result.solutions)) {
            output = `∎ 相似三角形计算结果：${result.solutions.join(', ')}`
          } else {
            output = `∎ 相似三角形计算完成`
          }
          break

        case 'combinatorics_ncr':
          output = `∎ 组合计算结果：${result?.exact || result?.approx || result?.value || 'C(n,r) = 计算完成'}`
          break

        case 'combinatorics_npr':
          output = `∎ 排列计算结果：${result?.exact || result?.approx || result?.value || 'P(n,r) = 计算完成'}`
          break

        case 'arithmetic_percent':
          output = `∎ 百分比计算结果：${result?.exact || result?.approx || result?.value || '计算完成'}`
          break

        case 'geometry_circle_angles':
          output = `∎ 圆角度计算结果：${result?.exact || result?.approx || result?.value || '计算完成'}`
          break

        default:
          output = `∎ ${tool} 计算完成：${result?.exact || result?.approx || result?.value || JSON.stringify(result).substring(0, 100)}`
      }

      // 如果有步骤且有值，添加到结果中
      if (data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
        const meaningfulSteps = data.steps
          .filter((step: any) => step.note || step.out)
          .slice(0, 3) // 只显示前3步避免过长

        if (meaningfulSteps.length > 0) {
          const stepsText = meaningfulSteps
            .map((step: any) => step.note || step.out)
            .join(' → ')

          output += `\n📐 计算步骤：${stepsText}`
        }
      }

    } catch (error) {
      console.warn(`Error formatting MCP result for ${tool}:`, error)
      output = `∎ ${tool} 计算完成（结果格式化出错）`
    }

    return output
  }

  // 检查文本是否包含 MCP 调用
  static hasMCPCalls(text: string): boolean {
    return MCP_CALL_REGEX.test(text)
  }

  // 重新设置正则表达式的 lastIndex
  static resetRegex(): void {
    MCP_CALL_REGEX.lastIndex = 0
  }
}

// 便捷函数
export const extractMCPCalls = (text: string) => MCPParser.extractMCPCalls(text)
export const executeMCPCall = (call: MCPCall) => MCPParser.executeMCPCall(call)
export const executeAllMCPCalls = (text: string) => MCPParser.executeAllMCPCalls(text)
export const hasMCPCalls = (text: string) => MCPParser.hasMCPCalls(text)