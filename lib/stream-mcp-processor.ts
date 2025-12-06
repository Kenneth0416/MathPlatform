// 流式响应中的 MCP 处理器
// 处理实时流中的 MathMCP 调用

import { executeAllMCPCalls, hasMCPCalls, MCPExecutionResult } from './mcp-parser'

export interface StreamChunk {
  choices: Array<{
    delta: {
      content?: string
    }
  }>
}

export interface ProcessedStreamChunk {
  choices: Array<{
    delta: {
      content?: string
    }
  }>
  mcpResults?: MCPExecutionResult[]
}

export class StreamMCPProcessor {
  private buffer: string = ''
  private isProcessing: boolean = false
  private pendingMCPCalls: string[] = []
  private mode: 'solve' | 'tutor' | 'practice' | 'check' | null = null

  constructor(mode: 'solve' | 'tutor' | 'practice' | 'check') {
    this.mode = mode
  }

  // 处理流式数据块
  async processChunk(chunk: StreamChunk): Promise<ProcessedStreamChunk> {
    const content = chunk.choices[0]?.delta?.content || ''

    if (!content) {
      return chunk
    }

    this.buffer += content

    // 只在 check 和 solve 模式下处理 MCP 调用
    if (this.mode !== 'check' && this.mode !== 'solve') {
      return chunk
    }

    // 检查是否有完整的 MCP 调用 - 与 mcp-parser.ts 保持一致
    const mcpCallPattern = /\[MCP:([a-zA-Z_]\w*):([^:\[\]]+(?::[^:\[\]]+)*)\]/g
    const matches = this.buffer.match(mcpCallPattern)

    if (matches && matches.length > 0) {
      // 找到完整的 MCP 调用
      const lastMatch = matches[matches.length - 1]
      const lastIndex = this.buffer.lastIndexOf(lastMatch)

      // 检查是否已经完整（以 ] 结尾）
      if (lastMatch.endsWith(']')) {
        const contentBeforeCall = this.buffer.substring(0, lastIndex)
        const mcpCall = lastMatch
        const contentAfterCall = this.buffer.substring(lastIndex + mcpCall.length)

        // 根据模式选择执行方式
        if (this.mode === 'solve') {
          // solve 模式：同步执行，等待结果
          const mcpResult = await this.executeMCPCallSync(mcpCall)

          // 清空缓冲区，因为我们已经处理了所有的内容
          this.buffer = ''

          // 在 solve 模式下，返回调用前的内容和 MCP 处理结果
          return {
            choices: [{
              delta: {
                content: contentBeforeCall + mcpResult + contentAfterCall
              }
            }]
          }
        } else {
          // check 模式：异步执行
          this.executeMCPCallAsync(mcpCall)

          // 清空缓冲区，保留调用后的内容
          this.buffer = contentAfterCall

          // 返回包含调用前内容的流块
          return {
            choices: [{
              delta: {
                content: contentBeforeCall
              }
            }]
          }
        }
      }
    }

    return chunk
  }

  // 异步执行单个 MCP 调用
  private async executeMCPCallAsync(mcpCall: string): Promise<void> {
    try {
      console.log(`🔧 Async MCP call: ${mcpCall}`)

      // 这里可以发送一个特殊标记到流中表示正在处理 MCP 调用
      this.sendMCPProcessingMarker(mcpCall)

      const result = await executeAllMCPCalls(mcpCall)

      if (result.results.length > 0) {
        // 发送 MCP 结果到流
        this.sendMCPResult(result.results[0])
      }

    } catch (error) {
      console.error('Async MCP call failed:', error)
      this.sendMCPError(mcpCall, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // 同步执行单个 MCP 调用（用于 solve 模式）
  private async executeMCPCallSync(mcpCall: string): Promise<string> {
    try {
      console.log(`🔧 Sync MCP call: ${mcpCall}`)

      // 发送处理标记
      this.sendMCPProcessingMarker(mcpCall)

      // 同步执行 MCP 调用并等待结果
      const result = await executeAllMCPCalls(mcpCall)

      if (result.results.length > 0) {
        const mcpResult = result.results[0]

        if (mcpResult.success && mcpResult.data) {
          // 成功时，返回格式化的结果
          const formattedResult = this.formatMCPResult(mcpResult)
          console.log(`✅ MCP result for ${mcpResult.tool}: SUCCESS`)
          console.log(`📝 Injected result: ${formattedResult}`)
          return formattedResult
        } else {
          // 失败时，返回友好的错误信息
          const errorMsg = `[计算失败: ${mcpResult.error || '未知错误'}]`
          console.log(`❌ MCP result for ${mcpResult.tool}: FAILED`)
          console.log(`📝 Injected error: ${errorMsg}`)
          return errorMsg
        }
      } else {
        // 如果没有结果，返回通用错误信息
        const noResultMsg = `[计算超时或无结果]`
        console.log(`⚠️ No MCP result for: ${mcpCall}`)
        return noResultMsg
      }

    } catch (error) {
      const errorMsg = `[工具调用错误: ${error instanceof Error ? error.message : 'Unknown error'}]`
      console.error('Sync MCP call failed:', error)
      console.log(`📝 Injected error: ${errorMsg}`)
      return errorMsg
    }
  }

  // 格式化 MCP 结果为可读文本
  private formatMCPResult(result: MCPExecutionResult): string {
    if (!result.success || !result.data) {
      return `[计算失败: ${result.error || '未知错误'}]`
    }

    const tool = result.tool
    const data = result.data as any
    const mcpResult = data.result

    if (!mcpResult) {
      return `[计算完成: 无返回数据]`
    }

    try {
      switch (tool) {
        case 'algebra_solve':
          if (mcpResult.solutions && Array.isArray(mcpResult.solutions)) {
            const solutions = mcpResult.solutions.map((sol: any) => sol.toString()).join(', ')
            return `∎ 方程求解结果：${solutions}`
          }
          return `∎ 方程求解结果：${mcpResult.exact || mcpResult.approx || '求解完成'}`

        case 'algebra_simplify':
          return `∎ 表达式化简结果：${mcpResult.exact || mcpResult.approx || '化简完成'}`

        case 'algebra_expand':
          return `∎ 表达式展开结果：${mcpResult.exact || mcpResult.approx || '展开完成'}`

        case 'algebra_factor':
          return `∎ 表达式因式分解结果：${mcpResult.exact || mcpResult.approx || '分解完成'}`

        case 'arithmetic_fraction':
          return `∎ 分数运算结果：${mcpResult.exact || mcpResult.approx || mcpResult.value || '计算完成'}`

        case 'eval_numeric':
          return `∎ 数值计算结果：${mcpResult.exact || mcpResult.approx || mcpResult.value || '计算完成'}`

        case 'geometry_pythagoras':
          return `∎ 勾股定理计算结果：${mcpResult.exact || mcpResult.approx || '计算完成'}`

        case 'geometry_similar':
        case 'geometry_similar_triangles':
          if (mcpResult.solutions && Array.isArray(mcpResult.solutions)) {
            return `∎ 相似三角形计算结果：${mcpResult.solutions.join(', ')}`
          }
          return `∎ 相似三角形计算完成`

        case 'combinatorics_ncr':
          return `∎ 组合计算结果：${mcpResult.exact || mcpResult.approx || mcpResult.value || '计算完成'}`

        case 'combinatorics_npr':
          return `∎ 排列计算结果：${mcpResult.exact || mcpResult.approx || mcpResult.value || '计算完成'}`

        case 'arithmetic_percent':
          return `∎ 百分比计算结果：${mcpResult.exact || mcpResult.approx || mcpResult.value || '计算完成'}`

        case 'geometry_circle_angles':
          return `∎ 圆角度计算结果：${mcpResult.exact || mcpResult.approx || mcpResult.value || '计算完成'}`

        default:
          return `∎ ${tool} 计算完成：${mcpResult.exact || mcpResult.approx || mcpResult.value || '完成'}`
      }
    } catch (error) {
      console.warn(`Error formatting MCP result in stream:`, error)
      return `∎ ${tool} 计算完成（结果格式化出错）`
    }
  }

  // 发送 MCP 处理标记（可选）
  private sendMCPProcessingMarker(mcpCall: string): void {
    // 这里可以实现一个机制来通知前端正在处理 MCP 调用
    // 例如发送一个特殊的 SSE 事件
    console.log(`🔄 Processing MCP call: ${mcpCall}`)
  }

  // 发送 MCP 结果（这里可以扩展为实际发送到客户端）
  private sendMCPResult(result: MCPExecutionResult): void {
    console.log(`✅ MCP result for ${result.tool}:`, result.success ? 'SUCCESS' : 'FAILED')

    // 在实际实现中，这里可以通过 WebSocket 或额外的 SSE 通道发送结果
    // 目前只是记录日志
  }

  // 发送 MCP 错误
  private sendMCPError(mcpCall: string, error: string): void {
    console.error(`❌ MCP error for ${mcpCall}:`, error)
  }

  // 完成流处理，执行剩余的 MCP 调用
  async finalize(): Promise<string> {
    if (this.buffer && hasMCPCalls(this.buffer)) {
      console.log('🔧 Finalizing remaining MCP calls in stream buffer...')
      const result = await executeAllMCPCalls(this.buffer)
      this.buffer = result.processedText
      return result.processedText
    }

    return this.buffer
  }
}

// 创建流处理器的便捷函数
export function createStreamMCPProcessor(mode: 'solve' | 'tutor' | 'practice' | 'check'): StreamMCPProcessor {
  return new StreamMCPProcessor(mode)
}

// 处理完整流响应的便捷函数
export async function processStreamWithMCP(
  stream: ReadableStream<Uint8Array>,
  mode: 'solve' | 'tutor' | 'practice' | 'check'
): Promise<ReadableStream<Uint8Array>> {
  const processor = new StreamMCPProcessor(mode)
  const reader = stream.getReader()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            // 处理缓冲区中剩余的内容
            const finalContent = await processor.finalize()
            if (finalContent) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                choices: [{
                  delta: {
                    content: finalContent
                  }
                }]
              })}\n\n`))
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            break
          }

          // 解析 SSE 数据
          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataLine = line.substring(6) // Remove 'data: ' prefix

              // Check for [DONE] signal
              if (dataLine.trim() === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                continue
              }

              try {
                const data = JSON.parse(dataLine)
                const processed = await processor.processChunk(data)

                if (processed.choices[0]?.delta?.content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(processed)}\n\n`))
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError)
                // 直接转发原始数据
                controller.enqueue(encoder.encode(line + '\n'))
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error)
        controller.error(error)
      }
    }
  })
}