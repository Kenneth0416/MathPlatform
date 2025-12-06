// LangChain MCP 代理管理器
// 替換舊的 mcp-parser，使用 LangChain 原生工具調用

import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { createMathMCPTools, getMathMCPOpenAITools, MathMCPTool } from './langchain-mcp-tools'
import { AVAILABLE_MATH_MCP_TOOLS } from './langchain-mcp-tools'

export interface MCPToolCall {
  tool_name: string
  parameters: Record<string, any>
  result?: string
  error?: string
}

export interface MCPAgentConfig {
  baseURL?: string
  maxRetries?: number
  timeout?: number
}

export class LangchainMCPAgent {
  private tools: MathMCPTool[]
  private toolMap: Map<string, MathMCPTool>
  private config: MCPAgentConfig

  constructor(config: MCPAgentConfig = {}) {
    this.config = {
      baseURL: config.baseURL || 'http://localhost:8000',
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      ...config
    }

    this.tools = createMathMCPTools(this.config.baseURL!)
    this.toolMap = new Map()

    // 創建工具映射以便快速查找
    for (const tool of this.tools) {
      this.toolMap.set(tool.name, tool)
    }
  }

  // 檢查 MathMCP 服務健康狀態
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseURL}/health`)
      return response.ok
    } catch (error) {
      console.error('MathMCP service health check failed:', error)
      return false
    }
  }

  // 執行單個工具調用
  async executeToolCall(toolName: string, parameters: Record<string, any>): Promise<MCPToolCall> {
    const tool = this.toolMap.get(toolName)
    if (!tool) {
      return {
        tool_name: toolName,
        parameters,
        error: `Tool ${toolName} not found`
      }
    }

    try {
      console.log(`🔧 LangChain Agent: Executing ${toolName}`, parameters)

      const result = await tool.invoke(JSON.stringify(parameters))

      console.log(`✅ LangChain Agent: ${toolName} completed`)
      console.log(`📝 Result: ${result}`)

      return {
        tool_name: toolName,
        parameters,
        result
      }
    } catch (error) {
      console.error(`❌ LangChain Agent: ${toolName} failed`, error)
      return {
        tool_name: toolName,
        parameters,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // 處理消息中的工具調用（支持 LangChain 格式）
  async processMessageWithTools(
    message: string,
    mode: 'solve' | 'check' | 'tutor' | 'practice' = 'solve'
  ): Promise<{ processedContent: string; toolCalls: MCPToolCall[] }> {
    // 只在 solve 和 check 模式下執行工具調用
    if (mode !== 'solve' && mode !== 'check') {
      return {
        processedContent: message,
        toolCalls: []
      }
    }

    const toolCalls: MCPToolCall[] = []
    let processedContent = message

    // 檢測並處理舊的 [MCP:...] 格式（向後兼容）
    const mcpPattern = /\[MCP:([a-zA-Z_]\w*):([^:\[\]]+(?::[^:\[\]]+)*)\]/g
    let match

    while ((match = mcpPattern.exec(message)) !== null) {
      const [fullMatch, toolName, paramString] = match
      // 移除參數字符串末尾的 ']' 字符
      const cleanParamString = paramString.replace(/\]$/, '')
      const params = this.parseLegacyParameters(toolName, cleanParamString)

      if (params) {
        const toolCall = await this.executeToolCall(toolName, params)
        toolCalls.push(toolCall)

        // 替換原文中的 MCP 調用為結果
        if (toolCall.result) {
          processedContent = processedContent.replace(fullMatch, toolCall.result)
        } else if (toolCall.error) {
          processedContent = processedContent.replace(fullMatch, `[${toolCall.error}]`)
        }
      }
    }

    return {
      processedContent,
      toolCalls
    }
  }

  // 解析舊格式的參數
  private parseLegacyParameters(toolName: string, paramString: string): Record<string, any> | null {
    try {
      const params: Record<string, any> = {}
      const parts = paramString.split(',').map(p => p.trim())

      switch (toolName) {
        case 'algebra_solve':
          params.equation = parts[0] || ''
          if (parts[1]) params.variable = parts[1]
          break

        case 'algebra_simplify':
        case 'algebra_expand':
        case 'algebra_factor':
          params.expression = parts[0] || ''
          break

        case 'arithmetic_fraction':
          if (parts.length >= 2) {
            params.a = parts[0] || ''
            params.b = parts[1] || ''
            if (parts[2]) params.op = parts[2]
            params.detail = 'short'
            params.exact = true
          }
          break

        case 'eval_numeric':
          params.expr = parts[0] || ''
          break

        case 'geometry_pythagoras':
          // 驗證第一個參數是否為有效的 known 值
          const knownValue = parts[0] || 'legs'
          params.known = ['legs', 'hypotenuse'].includes(knownValue) ? knownValue : 'legs'

          // 只添加有效的數值參數
          if (parts[1] && !isNaN(parseFloat(parts[1]))) {
            params.a = parseFloat(parts[1])
          }
          if (parts[2] && !isNaN(parseFloat(parts[2]))) {
            params.b = parseFloat(parts[2])
          }
          if (parts[3] && !isNaN(parseFloat(parts[3]))) {
            params.c = parseFloat(parts[3])
          }

          params.detail = 'short'
          break

        case 'combinatorics_ncr':
        case 'combinatorics_npr':
          if (parts[0]) params.n = parseInt(parts[0])
          if (parts[1]) params.r = parseInt(parts[1])
          break

        case 'arithmetic_percent':
          if (parts[0]) params.base = parseFloat(parts[0])
          if (parts[1]) params.rate = parseFloat(parts[1])
          if (parts[2]) params.mode = parts[2].toLowerCase()
          break

        case 'geometry_circle_angles':
          params.type = parts[0] || 'inscribed'
          if (parts[1]) params.given = parseFloat(parts[1])
          break

        default:
          // 默認：按序號保存參數
          parts.forEach((part, index) => {
            if (part) params[`param${index + 1}`] = part
          })
      }

      return params
    } catch (error) {
      console.warn(`Failed to parse parameters for ${toolName}:`, error)
      return null
    }
  }

  // 獲取可用的工具名稱
  getAvailableTools(): string[] {
    return AVAILABLE_MATH_MCP_TOOLS
  }

  // 獲取工具描述（用於提示詞）
  getToolDescriptions(): string {
    const descriptions = [
      '📐 代數計算：',
      '- 方程求解：algebra_solve(方程式, 變量)',
      '- 表達式化簡：algebra_simplify(表達式)',
      '- 展開表達式：algebra_expand(表達式)',
      '- 因式分解：algebra_factor(表達式)',
      '',
      '🔢 算術計算：',
      '- 分數運算：arithmetic_fraction(分數1, 分數2, 運算符)',
      '- 百分比計算：arithmetic_percent(基數, 百分比, 模式)',
      '- 數值計算：eval_numeric(表達式)',
      '',
      '📏 幾何計算：',
      '- 勾股定理：geometry_pythagoras(已知類型, a邊, b邊, c邊)',
      '- 相似三角形：geometry_similar_triangles(三角形1, 三角形2, 對應關係, 查詢)',
      '- 圓角度計算：geometry_circle_angles(類型, 角度)',
      '',
      '🎲 組合數學：',
      '- 組合計算：combinatorics_ncr(n, r)',
      '- 排列計算：combinatorics_npr(n, r)'
    ]

    return descriptions.join('\n')
  }

  // 獲取 LangChain 工具（用於 LangChain 代理）
  getLangChainTools(): MathMCPTool[] {
    return this.tools
  }

  // 獲取 OpenAI 格式的工具定義
  getOpenAITools(): any[] {
    return getMathMCPOpenAITools(this.config.baseURL!)
  }

  // 批量執行工具調用
  async executeMultipleToolCalls(toolCalls: Array<{ tool_name: string; parameters: Record<string, any> }>): Promise<MCPToolCall[]> {
    const results: MCPToolCall[] = []

    // 並行執行所有工具調用
    const promises = toolCalls.map(async (call) => {
      return await this.executeToolCall(call.tool_name, call.parameters)
    })

    const executedCalls = await Promise.all(promises)
    results.push(...executedCalls)

    return results
  }
}

// 導出便捷函數
export function createMCPAgent(config?: MCPAgentConfig): LangchainMCPAgent {
  return new LangchainMCPAgent(config)
}

export function getToolDescriptions(): string {
  const agent = new LangchainMCPAgent()
  return agent.getToolDescriptions()
}