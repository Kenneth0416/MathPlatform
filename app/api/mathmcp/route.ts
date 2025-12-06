import { NextRequest, NextResponse } from 'next/server'
import { mathMCPClient, MCPResponse, MCPError, isMCPSuccess, isMCPError } from '@/lib/mathmcp-client'

export interface MathMCPRequest {
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
}

export interface MathMCPAPIResponse {
  success: boolean
  data?: MCPResponse
  error?: string
  tool?: string
  executionTime?: number
}

// 工具映射 - 将工具名称映射到客户端方法
const TOOL_MAPPING = {
  'algebra_solve': 'solveEquation',
  'algebra_simplify': 'simplifyExpression',
  'algebra_expand': 'expandExpression',
  'algebra_factor': 'factorExpression',
  'arithmetic_fraction': 'fractionOperation',
  'arithmetic_percent': 'percentCalculation',
  'geometry_pythagoras': 'pythagoreanTheorem',
  'geometry_similar': 'similarTriangles',
  'geometry_similar_triangles': 'similarTriangles', // 兼容 AI 生成的名称
  'geometry_circle_angles': 'circleAngles',
  'combinatorics_ncr': 'combinations',
  'combinatorics_npr': 'permutations',
  'eval_numeric': 'evaluateExpression'
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: MathMCPRequest = await request.json()

    // 验证请求
    if (!body.tool || !body.params) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request: tool and params are required'
      } as MathMCPAPIResponse, { status: 400 })
    }

    // 检查 MathMCP 服务健康状态
    try {
      await mathMCPClient.healthCheck()
    } catch (healthError) {
      console.error('MathMCP health check failed:', healthError)
      return NextResponse.json({
        success: false,
        error: 'MathMCP service is unavailable',
        tool: body.tool
      } as MathMCPAPIResponse, { status: 503 })
    }

    // 获取对应的客户端方法
    const methodName = TOOL_MAPPING[body.tool as keyof typeof TOOL_MAPPING]
    if (!methodName) {
      return NextResponse.json({
        success: false,
        error: `Unknown tool: ${body.tool}`,
        tool: body.tool
      } as MathMCPAPIResponse, { status: 400 })
    }

    // 执行对应的 MathMCP 方法
    let result: MCPResponse
    try {
      switch (body.tool) {
        case 'algebra_solve':
          result = await mathMCPClient.solveEquation(
            body.params.equation,
            body.params.variable,
            { ...body.options }
          )
          break

        case 'algebra_simplify':
          result = await mathMCPClient.simplifyExpression(
            body.params.expression,
            { ...body.options }
          )
          break

        case 'algebra_expand':
          result = await mathMCPClient.expandExpression(
            body.params.expression,
            { ...body.options }
          )
          break

        case 'algebra_factor':
          result = await mathMCPClient.factorExpression(
            body.params.expression,
            { ...body.options }
          )
          break

        case 'arithmetic_fraction':
          result = await mathMCPClient.fractionOperation(
            body.params.a,
            body.params.b,
            body.params.operator,
            { ...body.options }
          )
          break

        case 'arithmetic_percent':
          result = await mathMCPClient.percentCalculation(
            body.params.base,
            body.params.rate,
            body.params.mode,
            { ...body.options }
          )
          break

        case 'geometry_pythagoras':
          result = await mathMCPClient.pythagoreanTheorem(
            body.params.known,
            body.params.a,
            body.params.b,
            body.params.c,
            { ...body.options }
          )
          break

        case 'geometry_similar':
          result = await mathMCPClient.similarTriangles(
            body.params.tri1,
            body.params.tri2,
            body.params.mapping,
            body.params.query,
            { ...body.options }
          )
          break

        case 'geometry_circle_angles':
          result = await mathMCPClient.circleAngles(
            body.params.type,
            body.params.given,
            { ...body.options }
          )
          break

        case 'combinatorics_ncr':
          result = await mathMCPClient.combinations(
            body.params.n,
            body.params.r,
            { ...body.options }
          )
          break

        case 'combinatorics_npr':
          result = await mathMCPClient.permutations(
            body.params.n,
            body.params.r,
            { ...body.options }
          )
          break

        case 'eval_numeric':
          result = await mathMCPClient.evaluateExpression(
            body.params.expr,
            { ...body.options }
          )
          break

        default:
          return NextResponse.json({
            success: false,
            error: `Tool ${body.tool} not implemented`,
            tool: body.tool
          } as MathMCPAPIResponse, { status: 501 })
      }

    } catch (executionError) {
      console.error(`MathMCP execution error for ${body.tool}:`, executionError)
      return NextResponse.json({
        success: false,
        error: `Execution failed: ${executionError instanceof Error ? executionError.message : 'Unknown error'}`,
        tool: body.tool
      } as MathMCPAPIResponse, { status: 500 })
    }

    const executionTime = Date.now() - startTime

    // 验证结果
    if (isMCPSuccess(result)) {
      console.log(`✅ MathMCP ${body.tool} executed successfully`, {
        executionTime,
        resultType: typeof result
      })

      return NextResponse.json({
        success: true,
        data: result,
        tool: body.tool,
        executionTime
      } as MathMCPAPIResponse)

    } else if (isMCPError(result)) {
      console.error(`❌ MathMCP ${body.tool} returned error:`, result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        tool: body.tool,
        executionTime
      } as MathMCPAPIResponse, { status: 400 })
    } else {
      console.error(`❌ Unexpected MathMCP response format for ${body.tool}:`, result)
      return NextResponse.json({
        success: false,
        error: 'Invalid response format from MathMCP service',
        tool: body.tool,
        executionTime
      } as MathMCPAPIResponse, { status: 500 })
    }

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('❌ MathMCP API Error:', error)

    return NextResponse.json({
      success: false,
      error: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime
    } as MathMCPAPIResponse, { status: 500 })
  }
}

// GET 方法用于健康检查和服务状态
export async function GET() {
  try {
    const health = await mathMCPClient.healthCheck()

    return NextResponse.json({
      success: true,
      service: 'MathMCP',
      status: health.status,
      availableTools: Object.keys(TOOL_MAPPING)
    } as MathMCPAPIResponse & { availableTools: string[] })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'MathMCP service unavailable',
      service: 'MathMCP'
    } as MathMCPAPIResponse, { status: 503 })
  }
}