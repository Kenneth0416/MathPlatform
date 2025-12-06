// LangChain MCP 工具系統
// 使用 LangChain 原生 MCP 支持替換自定義 fetch 邏輯

import { Tool } from '@langchain/core/tools'
import { convertToOpenAITool } from '@langchain/core/utils/function_calling'

// MathMCP 工具類型定義
export interface MathMCPToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required: string[]
  }
  endpoint: string
  method: string
}

// 定義所有 MathMCP 工具
const MATH_MCP_TOOLS: Record<string, MathMCPToolDefinition> = {
  algebra_solve: {
    name: 'algebra_solve',
    description: 'Solve algebraic equations with detailed steps',
    parameters: {
      type: 'object',
      properties: {
        equation: {
          type: 'string',
          description: 'The algebraic equation to solve'
        },
        variable: {
          type: 'string',
          description: 'The variable to solve for (optional)'
        }
      },
      required: ['equation']
    },
    endpoint: '/algebra/solve',
    method: 'POST'
  },

  algebra_simplify: {
    name: 'algebra_simplify',
    description: 'Simplify algebraic expressions',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The algebraic expression to simplify'
        }
      },
      required: ['expression']
    },
    endpoint: '/algebra/simplify',
    method: 'POST'
  },

  algebra_expand: {
    name: 'algebra_expand',
    description: 'Expand algebraic expressions',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The algebraic expression to expand'
        }
      },
      required: ['expression']
    },
    endpoint: '/algebra/expand',
    method: 'POST'
  },

  algebra_factor: {
    name: 'algebra_factor',
    description: 'Factor algebraic expressions',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The algebraic expression to factor'
        }
      },
      required: ['expression']
    },
    endpoint: '/algebra/factor',
    method: 'POST'
  },

  arithmetic_fraction: {
    name: 'arithmetic_fraction',
    description: 'Perform arithmetic operations on fractions',
    parameters: {
      type: 'object',
      properties: {
        a: { type: 'string', description: 'First fraction (e.g., "1/2")' },
        b: { type: 'string', description: 'Second fraction (e.g., "3/4")' },
        op: {
          type: 'string',
          enum: ['+', '-', '*', '/'],
          description: 'Arithmetic operator: +, -, *, /'
        },
        detail: {
          type: 'string',
          enum: ['short', 'full'],
          description: 'Detail level of calculation steps',
          default: 'short'
        },
        exact: {
          type: 'boolean',
          description: 'Whether to return exact results',
          default: true
        }
      },
      required: ['a', 'b', 'op']
    },
    endpoint: '/arithmetic/fraction',
    method: 'POST'
  },

  arithmetic_percent: {
    name: 'arithmetic_percent',
    description: 'Calculate percentages and percentage changes',
    parameters: {
      type: 'object',
      properties: {
        base: { type: 'number', description: 'Base number' },
        rate: { type: 'number', description: 'Percentage rate' },
        mode: {
          type: 'string',
          enum: ['increase', 'decrease', 'of'],
          description: 'Calculation mode'
        }
      },
      required: ['base', 'rate']
    },
    endpoint: '/arithmetic/percent',
    method: 'POST'
  },

  eval_numeric: {
    name: 'eval_numeric',
    description: 'Evaluate numerical expressions and calculations',
    parameters: {
      type: 'object',
      properties: {
        expr: { type: 'string', description: 'Numerical expression to evaluate' }
      },
      required: ['expr']
    },
    endpoint: '/eval/numeric',
    method: 'POST'
  },

  geometry_pythagoras: {
    name: 'geometry_pythagoras',
    description: 'Apply Pythagorean theorem for right triangle calculations',
    parameters: {
      type: 'object',
      properties: {
        known: {
          type: 'string',
          enum: ['legs', 'hypotenuse'],
          description: 'Known sides: "legs" if both legs are known, "hypotenuse" if hypotenuse and one leg are known'
        },
        a: { type: 'number', description: 'Length of leg a (if known)' },
        b: { type: 'number', description: 'Length of leg b (if known)' },
        c: { type: 'number', description: 'Length of hypotenuse c (if known)' },
        detail: {
          type: 'string',
          enum: ['short', 'full'],
          description: 'Detail level of calculation steps',
          default: 'short'
        }
      },
      required: ['known']
    },
    endpoint: '/geometry/pythagoras',
    method: 'POST'
  },

  geometry_similar_triangles: {
    name: 'geometry_similar_triangles',
    description: 'Calculate similar triangle proportions and missing sides',
    parameters: {
      type: 'object',
      properties: {
        tri1: {
          type: 'object',
          description: 'First triangle with sides a, b, c'
        },
        tri2: {
          type: 'object',
          description: 'Second triangle with sides a, b, c'
        },
        mapping: {
          type: 'object',
          description: 'Mapping of corresponding sides'
        },
        query: { type: 'string', description: 'What to calculate' }
      },
      required: []
    },
    endpoint: '/geometry/similar',
    method: 'POST'
  },

  geometry_circle_angles: {
    name: 'geometry_circle_angles',
    description: 'Calculate circle angles and arc measures',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of angle calculation'
        },
        given: { type: 'number', description: 'Given angle measure' }
      },
      required: []
    },
    endpoint: '/geometry/circle_angles',
    method: 'POST'
  },

  combinatorics_ncr: {
    name: 'combinatorics_ncr',
    description: 'Calculate combinations (n choose r)',
    parameters: {
      type: 'object',
      properties: {
        n: { type: 'integer', description: 'Total number of items' },
        r: { type: 'integer', description: 'Number of items to choose' }
      },
      required: ['n', 'r']
    },
    endpoint: '/combinatorics/ncr',
    method: 'POST'
  },

  combinatorics_npr: {
    name: 'combinatorics_npr',
    description: 'Calculate permutations (n permute r)',
    parameters: {
      type: 'object',
      properties: {
        n: { type: 'integer', description: 'Total number of items' },
        r: { type: 'integer', description: 'Number of items to arrange' }
      },
      required: ['n', 'r']
    },
    endpoint: '/combinatorics/npr',
    method: 'POST'
  }
}

// LangChain MathMCP 工具實現
class MathMCPTool extends Tool {
  name: string
  description: string
  toolDefinition: MathMCPToolDefinition
  baseURL: string

  constructor(toolDefinition: MathMCPToolDefinition, baseURL: string = 'http://localhost:8001') {
    super()
    this.name = toolDefinition.name
    this.description = toolDefinition.description
    this.toolDefinition = toolDefinition
    this.baseURL = baseURL
  }

  // 驗證和清理參數，確保符合 MCP server 要求
  private validateAndCleanParams(params: any): any {
    const cleanParams: any = {}

    switch (this.name) {
      case 'geometry_pythagoras':
        // 驗證 known 參數
        if (params.known && ['legs', 'hypotenuse'].includes(params.known)) {
          cleanParams.known = params.known
        } else {
          cleanParams.known = 'legs' // 默認值
        }

        // 清理數值參數，移除 NaN 和 undefined
        if (params.a !== undefined && params.a !== null && !isNaN(Number(params.a))) {
          cleanParams.a = Number(params.a)
        }
        if (params.b !== undefined && params.b !== null && !isNaN(Number(params.b))) {
          cleanParams.b = Number(params.b)
        }
        if (params.c !== undefined && params.c !== null && !isNaN(Number(params.c))) {
          cleanParams.c = Number(params.c)
        }

        // 添加默認 detail
        cleanParams.detail = params.detail || 'short'
        break

      case 'arithmetic_fraction':
        cleanParams.a = params.a || ''
        cleanParams.b = params.b || ''
        cleanParams.op = params.op || '+'
        cleanParams.detail = params.detail || 'short'
        cleanParams.exact = params.exact !== undefined ? params.exact : true
        break

      case 'algebra_solve':
        cleanParams.equation = params.equation || ''
        if (params.variable) {
          cleanParams.variable = params.variable
        }
        break

      case 'algebra_simplify':
      case 'algebra_expand':
      case 'algebra_factor':
        cleanParams.expression = params.expression || ''
        break

      case 'eval_numeric':
        cleanParams.expr = params.expr || ''
        break

      case 'arithmetic_percent':
        if (params.base !== undefined && !isNaN(Number(params.base))) {
          cleanParams.base = Number(params.base)
        }
        if (params.rate !== undefined && !isNaN(Number(params.rate))) {
          cleanParams.rate = Number(params.rate)
        }
        cleanParams.mode = params.mode || 'of'
        break

      case 'combinatorics_ncr':
      case 'combinatorics_npr':
        if (params.n !== undefined && !isNaN(Number(params.n))) {
          cleanParams.n = parseInt(String(params.n))
        }
        if (params.r !== undefined && !isNaN(Number(params.r))) {
          cleanParams.r = parseInt(String(params.r))
        }
        break

      default:
        // 對於其他工具，直接複製參數但移除無效值
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null && !isNaN(Number(value))) {
            cleanParams[key] = value
          }
        }
        break
    }

    return cleanParams
  }

  /** @ignore */
  async _call(input: string): Promise<string> {
    try {
      const params = typeof input === 'string' ? JSON.parse(input) : input

      // 清理和驗證參數
      const cleanParams = this.validateAndCleanParams(params)

      console.log(`🔧 LangChain MathMCP Tool: ${this.name}`, cleanParams)
      console.log(`📤 Request payload:`, JSON.stringify(cleanParams, null, 2))

      const response = await fetch(`${this.baseURL}${this.toolDefinition.endpoint}`, {
        method: this.toolDefinition.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanParams)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ HTTP Error ${response.status}:`, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()

      // 格式化結果為易讀文本
      if (result.result) {
        const formattedResult = this.formatResult(result.result, this.name)
        console.log(`✅ LangChain MathMCP Tool ${this.name}: SUCCESS`)
        console.log(`📝 Formatted result: ${formattedResult}`)
        return formattedResult
      } else {
        throw new Error('No result returned from MathMCP service')
      }

    } catch (error) {
      console.error(`❌ LangChain MathMCP Tool ${this.name} failed:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return `🔧 計算失敗: ${errorMessage}`
    }
  }

  private formatResult(result: any, toolName: string): string {
    if (!result) return '🔧 計算完成：無返回數據'

    try {
      switch (toolName) {
        case 'algebra_solve':
          if (result.solutions && Array.isArray(result.solutions)) {
            const solutions = result.solutions.map((sol: any) => sol.toString()).join(', ')
            return `∎ 方程求解結果：${solutions}`
          }
          return `∎ 方程求解結果：${result.exact || result.approx || '求解完成'}`

        case 'algebra_simplify':
          return `∎ 表達式化簡結果：${result.exact || result.approx || '化簡完成'}`

        case 'algebra_expand':
          return `∎ 表達式展開結果：${result.exact || result.approx || '展開完成'}`

        case 'algebra_factor':
          return `∎ 表達式因式分解結果：${result.exact || result.approx || '分解完成'}`

        case 'arithmetic_fraction':
          return `∎ 分數運算結果：${result.exact || result.approx || result.value || '計算完成'}`

        case 'eval_numeric':
          return `∎ 數值計算結果：${result.exact || result.approx || result.value || '計算完成'}`

        case 'geometry_pythagoras':
          return `∎ 勾股定理計算結果：${result.exact || result.approx || '計算完成'}`

        case 'geometry_similar_triangles':
          if (result.solutions && Array.isArray(result.solutions)) {
            return `∎ 相似三角形計算結果：${result.solutions.join(', ')}`
          }
          return `∎ 相似三角形計算完成`

        case 'combinatorics_ncr':
          return `∎ 組合計算結果：${result.exact || result.approx || result.value || '計算完成'}`

        case 'combinatorics_npr':
          return `∎ 排列計算結果：${result.exact || result.approx || result.value || '計算完成'}`

        case 'arithmetic_percent':
          return `∎ 百分比計算結果：${result.exact || result.approx || result.value || '計算完成'}`

        case 'geometry_circle_angles':
          return `∎ 圓角度計算結果：${result.exact || result.approx || result.value || '計算完成'}`

        default:
          return `∎ ${toolName} 計算完成：${result.exact || result.approx || result.value || '完成'}`
      }
    } catch (error) {
      console.warn(`Error formatting result for ${toolName}:`, error)
      return `∎ ${toolName} 計算完成（結果格式化出錯）`
    }
  }
}

// MathMCP 工具工廠
export class MathMCPToolFactory {
  private baseURL: string

  constructor(baseURL: string = 'http://localhost:8001') {
    this.baseURL = baseURL
  }

  // 創建所有 MathMCP 工具
  createAllTools(): MathMCPTool[] {
    const tools: MathMCPTool[] = []

    for (const [key, definition] of Object.entries(MATH_MCP_TOOLS)) {
      tools.push(new MathMCPTool(definition, this.baseURL))
    }

    return tools
  }

  // 創建特定工具
  createTool(toolName: string): MathMCPTool | null {
    const definition = MATH_MCP_TOOLS[toolName]
    if (!definition) {
      console.warn(`Tool ${toolName} not found in MathMCP tools`)
      return null
    }

    return new MathMCPTool(definition, this.baseURL)
  }

  // 獲取 OpenAI 工具格式（用於 LangChain）
  getOpenAITools(): any[] {
    const tools = this.createAllTools()
    return tools.map(tool => convertToOpenAITool(tool))
  }

  // 健康檢查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`)
      return response.ok
    } catch (error) {
      console.error('MathMCP health check failed:', error)
      return false
    }
  }
}

// 導出便捷函數
export function createMathMCPTools(baseURL: string = 'http://localhost:8001'): MathMCPTool[] {
  const factory = new MathMCPToolFactory(baseURL)
  return factory.createAllTools()
}

export function getMathMCPOpenAITools(baseURL: string = 'http://localhost:8001'): any[] {
  const factory = new MathMCPToolFactory(baseURL)
  return factory.getOpenAITools()
}

// 工具名稱列表，用於驗證和提示詞
export const AVAILABLE_MATH_MCP_TOOLS = Object.keys(MATH_MCP_TOOLS)