// LangChain 流式處理器
// 使用 LangChain 原生工具系統替換自定義流式 MCP 處理

import { createMCPAgent, LangchainMCPAgent, MCPToolCall } from './langchain-mcp-agent'
import { MCPCallInfo, MCPStatus, generateMCPSummary } from '@/types/mcp'

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
      mcpCallInfos?: import('@/types/mcp').MCPCallInfo[]
    }
  }>
  toolResults?: MCPToolCall[]
}

export class LangChainStreamProcessor {
  private mcpAgent: LangchainMCPAgent
  private buffer: string = ''
  private mode: 'solve' | 'tutor' | 'practice' | 'check'
  private toolResults: MCPToolCall[] = []
  private mcpCallInfos: MCPCallInfo[] = []
  private activeMCPCalls: Map<string, { startTime: number; toolName: string }> = new Map()

  constructor(mode: 'solve' | 'tutor' | 'practice' | 'check') {
    this.mode = mode
    this.mcpAgent = createMCPAgent({
      baseURL: 'http://localhost:8000',
      maxRetries: 3,
      timeout: 30000
    })
  }

  // 處理流式數據塊
  async processChunk(chunk: StreamChunk): Promise<ProcessedStreamChunk> {
    const content = chunk.choices[0]?.delta?.content || ''

    if (!content) {
      return chunk
    }

    this.buffer += content

    // 只在 solve 和 check 模式下處理工具調用
    if (this.mode !== 'solve' && this.mode !== 'check') {
      return chunk
    }

    // 檢測完整的 MCP 調用模式
    const mcpCallPattern = /\[MCP:([a-zA-Z_]\w*):([^:\[\]]+(?::[^:\[\]]+)*)\]/g
    const matches = this.buffer.match(mcpCallPattern)

    if (matches && matches.length > 0) {
      // 找到完整的 MCP 調用
      const lastMatch = matches[matches.length - 1]
      const lastIndex = this.buffer.lastIndexOf(lastMatch)

      // 檢查是否已經完整（以 ] 結尾）
      if (lastMatch.endsWith(']')) {
        const contentBeforeCall = this.buffer.substring(0, lastIndex)
        const mcpCall = lastMatch

        // 使用 LangChain MCP 代理處理調用
        await this.executeMCPCallWithLangChain(mcpCall)

        // 根據模式決定處理方式
        if (this.mode === 'solve') {
          // solve 模式：同步執行，等待結果並替換
          const currentMCPCallInfos = this.mcpCallInfos.slice() // 複製當前狀態
          const toolResult = currentMCPCallInfos[currentMCPCallInfos.length - 1]?.result || '[處理完成]'

          this.buffer = contentBeforeCall + toolResult
          this.toolResults.push(...toolResult.split('\n').map(r => ({
            tool_name: mcpCall.split(':')[1],
            parameters: {},
            result: r.trim()
          })).filter(r => r.result))

          console.log('🔧 LangChain Stream Processor: Returning chunk with MCP infos', {
            mcpCallInfos: currentMCPCallInfos,
            contentLength: toolResult.length
          })

          return {
            choices: [{
              delta: {
                content: toolResult,
                mcpCallInfos: currentMCPCallInfos
              }
            }],
            toolResults: this.toolResults
          }
        } else {
          // check 模式：異步執行，保留調用前的內容
          this.executeMCPCallAsync(mcpCall)
          this.buffer = contentBeforeCall

          const currentMCPCallInfos = this.mcpCallInfos.slice() // 複製當前狀態

          return {
            choices: [{
              delta: {
                content: contentBeforeCall,
                mcpCallInfos: currentMCPCallInfos
              }
            }],
            toolResults: this.toolResults
          }
        }
      }
    }

    return chunk
  }

  // 使用 LangChain MCP 代理執行工具調用
  private async executeMCPCallWithLangChain(mcpCall: string): Promise<string> {
    try {
      console.log(`🔧 LangChain Stream Processor: Processing ${mcpCall}`)

      // 解析 MCP 調用
      const match = mcpCall.match(/\[MCP:([a-zA-Z_]\w*):([^:\[\]]+(?::[^:\[\]]+)*)\]/)
      if (!match) {
        return `[解析錯誤: 無法解析 MCP 調用]`
      }

      const [, toolName, paramString] = match
      const startTime = Date.now()

      // 記錄開始執行
      this.activeMCPCalls.set(mcpCall, { startTime, toolName })

      // 使用 LangChain MCP 代理處理消息和工具調用
      const { processedContent, toolCalls } = await this.mcpAgent.processMessageWithTools(
        mcpCall,
        this.mode
      )

      const executionTime = Date.now() - startTime

      if (toolCalls.length > 0 && toolCalls[0].result) {
        console.log(`✅ LangChain Stream Processor: ${toolName} completed in ${executionTime}ms`)
        console.log(`📝 Result: ${toolCalls[0].result}`)

        // 創建 MCP 調用信息
        const mcpCallInfo: MCPCallInfo = {
          id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          toolName,
          status: 'success',
          summary: generateMCPSummary(toolName, 'success', toolCalls[0].result, executionTime),
          details: {
            parameters: toolCalls[0].parameters,
            result: toolCalls[0].result,
            executionTime
          }
        }

        this.mcpCallInfos.push(mcpCallInfo)
        this.activeMCPCalls.delete(mcpCall)

        return toolCalls[0].result
      } else if (toolCalls.length > 0 && toolCalls[0].error) {
        console.log(`❌ LangChain Stream Processor: ${toolName} failed in ${executionTime}ms`)

        const mcpCallInfo: MCPCallInfo = {
          id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          toolName,
          status: 'error',
          summary: generateMCPSummary(toolName, 'error', undefined, executionTime),
          details: {
            parameters: toolCalls[0].parameters,
            error: toolCalls[0].error,
            executionTime
          }
        }

        this.mcpCallInfos.push(mcpCallInfo)
        this.activeMCPCalls.delete(mcpCall)

        return `[計算失敗: ${toolCalls[0].error}]`
      } else {
        const mcpCallInfo: MCPCallInfo = {
          id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          toolName,
          status: 'error',
          summary: generateMCPSummary(toolName, 'error', undefined, executionTime),
          details: {
            error: '無返回結果',
            executionTime
          }
        }

        this.mcpCallInfos.push(mcpCallInfo)
        this.activeMCPCalls.delete(mcpCall)

        return `[計算失敗: 無返回結果]`
      }

    } catch (error) {
      const executionTime = Date.now() - this.activeMCPCalls.get(mcpCall)?.startTime || 0
      console.error(`LangChain Stream Processor error for ${mcpCall}:`, error)

      const mcpCallInfo: MCPCallInfo = {
        id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        toolName: mcpCall.split(':')[1] || 'unknown',
        status: 'error',
        summary: generateMCPSummary(mcpCall.split(':')[1] || 'unknown', 'error', undefined, executionTime),
        details: {
          error: error instanceof Error ? error.message : '未知錯誤',
          executionTime
        }
      }

      this.mcpCallInfos.push(mcpCallInfo)
      this.activeMCPCalls.delete(mcpCall)

      return `[計算錯誤: ${error instanceof Error ? error.message : '未知錯誤'}]`
    }
  }

  // 異步執行 MCP 調用（用於 check 模式）
  private async executeMCPCallAsync(mcpCall: string): Promise<void> {
    try {
      console.log(`🔧 LangChain Async MCP call: ${mcpCall}`)

      // 發送處理標記
      this.sendMCPProcessingMarker(mcpCall)

      // 使用 LangChain MCP 代理執行
      const { toolCalls } = await this.mcpAgent.processMessageWithTools(mcpCall, this.mode)

      if (toolCalls.length > 0) {
        const toolCall = toolCalls[0]
        if (toolCall.result) {
          this.sendMCPResult(toolCall)
        } else if (toolCall.error) {
          this.sendMCPError(mcpCall, toolCall.error)
        }
      }

    } catch (error) {
      console.error('Async LangChain MCP call failed:', error)
      this.sendMCPError(mcpCall, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // 發送 MCP 處理標記
  private sendMCPProcessingMarker(mcpCall: string): void {
    console.log(`🔄 Processing LangChain MCP call: ${mcpCall}`)
  }

  // 發送 MCP 結果
  private sendMCPResult(toolCall: MCPToolCall): void {
    console.log(`✅ LangChain MCP result for ${toolCall.tool_name}:`, toolCall.result)
  }

  // 發送 MCP 錯誤
  private sendMCPError(mcpCall: string, error: string): void {
    console.error(`❌ LangChain MCP error for ${mcpCall}:`, error)
  }

  // 完成流處理，執行剩餘的 MCP 調用
  async finalize(): Promise<string> {
    if (this.buffer) {
      // 處理緩衝區中剩餘的內容
      const { processedContent } = await this.mcpAgent.processMessageWithTools(
        this.buffer,
        this.mode
      )
      this.buffer = processedContent
    }

    // 返回最終的 MCP 調用信息
    return {
      content: this.buffer,
      mcpCallInfos: this.mcpCallInfos
    } as any // 臨時返回對象格式，將在流處理中正確處理
  }

  // 獲取最終的 MCP 調用信息（用於流處理結束時）
  getFinalMCPCallInfos(): import('@/types/mcp').MCPCallInfo[] {
    return this.mcpCallInfos
  }

  // 獲取所有工具結果
  getToolResults(): MCPToolCall[] {
    return this.toolResults
  }

  // 清空緩衝區和結果
  reset(): void {
    this.buffer = ''
    this.toolResults = []
  }

  // 健康檢查
  async healthCheck(): Promise<boolean> {
    return await this.mcpAgent.healthCheck()
  }

  // 獲取可用工具
  getAvailableTools(): string[] {
    return this.mcpAgent.getAvailableTools()
  }

  // 獲取工具描述
  getToolDescriptions(): string {
    return this.mcpAgent.getToolDescriptions()
  }

  // 獲取 MCP 調用信息
  getMCPCallInfos(): MCPCallInfo[] {
    return [...this.mcpCallInfos]
  }

  // 獲取當前正在執行的 MCP 調用
  getActiveMCPCalls(): MCPCallInfo[] {
    return Array.from(this.activeMCPCalls.entries()).map(([mcpCall, { startTime, toolName }]) => ({
      id: mcpCall,
      toolName,
      status: 'executing' as MCPStatus,
      summary: generateMCPSummary(toolName, 'executing'),
      details: {
        executionTime: Date.now() - startTime
      }
    }))
  }

  // 獲取所有 MCP 調用信息（包括正在執行的）
  getAllMCPCallInfos(): MCPCallInfo[] {
    return [...this.mcpCallInfos, ...this.getActiveMCPCalls()]
  }
}

// 處理完整流響應的便捷函數
export async function processStreamWithLangChainMCP(
  stream: ReadableStream<Uint8Array>,
  mode: 'solve' | 'tutor' | 'practice' | 'check'
): Promise<ReadableStream<Uint8Array>> {
  const processor = new LangChainStreamProcessor(mode)
  const reader = stream.getReader()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        // 健康檢查
        const isHealthy = await processor.healthCheck()
        if (!isHealthy) {
          console.warn('LangChain MCP service is unhealthy, proceeding without tool execution')
        }

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            // 處理緩衝區中剩餘的內容
            const finalContent = await processor.finalize()
            const finalMCPCallInfos = processor.getFinalMCPCallInfos()

            console.log('🔧 LangChain Stream Processor: Stream ending with MCP infos', {
              finalContentLength: finalContent?.length || 0,
              mcpCallInfosCount: finalMCPCallInfos.length,
              mcpCallInfos: finalMCPCallInfos
            })

            if (finalContent) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                choices: [{
                  delta: {
                    content: finalContent,
                    mcpCallInfos: finalMCPCallInfos
                  }
                }]
              })}\n\n`))
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            break
          }

          // 解析 SSE 數據
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

                if (processed.choices[0]?.delta?.content || processed.choices[0]?.delta?.mcpCallInfos) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(processed)}\n\n`))
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data in LangChain processor:', parseError)
                // 直接轉發原始數據
                controller.enqueue(encoder.encode(line + '\n'))
              }
            }
          }
        }
      } catch (error) {
        console.error('LangChain Stream processing error:', error)
        controller.error(error)
      }
    }
  })
}

// 創建流處理器的便捷函數
export function createLangChainStreamProcessor(
  mode: 'solve' | 'tutor' | 'practice' | 'check'
): LangChainStreamProcessor {
  return new LangChainStreamProcessor(mode)
}