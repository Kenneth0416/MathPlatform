import { NextRequest, NextResponse } from 'next/server'
import { getAIAPIManager, POERequest, POEMessage } from '@/lib/ai-api'
import { buildMathPrompt } from '@/lib/prompts/math-prompts'
import { createContentFilter, globalContentFilter } from '@/lib/content-filter'
import { processStreamWithLangChainMCP } from '@/lib/langchain-stream-processor'
import { Client } from 'langsmith'
import { randomUUID } from 'crypto'

export interface Visualization {
  id: string
  type: 'mermaid' | 'chart' | 'graph'
  code: string
  title?: string
  description?: string
}

export interface StreamChatRequest {
  messages: POEMessage[]
  mode: 'solve' | 'tutor' | 'practice' | 'check'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
  bot?: string
}


export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let runId: string | undefined

  try {
    const body: StreamChatRequest = await req.json()

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    // 跨语言内容过滤 - 检测用户输入是否包含敏感内容
    // 检查最后一条用户消息（最新输入）
    const lastUserMessage = body.messages
      .filter(msg => msg.role === 'user')
      .pop()

    if (lastUserMessage) {
      const filterResult = globalContentFilter.detectAndFilterMultipleLanguages(lastUserMessage.content, body.language)

      if (filterResult.shouldBlock && filterResult.message) {
        console.log('Cross-lingual stream content blocked by filter:', {
          userLanguage: body.language,
          messageLength: lastUserMessage.content.length
        })

        // 注意：內容過濾會通過 LangChain 自動 tracing 記錄
        console.log(`🚫 Content filtered: ${body.language}, ${filterResult.contentType}`)

        // 创建一个包含拒绝消息的流式响应
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            // 发送拒绝消息
            const chunk = `data: ${JSON.stringify({
              choices: [{
                delta: {
                  content: filterResult.message
                }
              }]
            })}\n\n`

            controller.enqueue(encoder.encode(chunk))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }
    }

    // 檢查是否有任何 AI API 配置
    const hasAPIConfig = process.env.DEEPSEEK_API_KEY ||
                         process.env.POE_API_KEY ||
                         process.env.OPENAI_API_KEY

    if (!hasAPIConfig) {
      return NextResponse.json({
        error: 'No AI API configured. Please set DEEPSEEK_API_KEY, POE_API_KEY, or OPENAI_API_KEY in environment variables.'
      }, { status: 503 })
    }

    // 構建 AI API 請求（使用集中式提示詞）
    // 過濾掉已有的 system 消息，避免重複注入
    const userAndAssistantMessages = body.messages.filter(
      msg => msg.role !== 'system'
    )
    
    const aiRequest: POERequest = {
      messages: [
        {
          role: 'system',
          content: buildMathPrompt({
            mode: body.mode,
            difficulty: body.difficulty,
            language: body.language
          })
        },
        ...userAndAssistantMessages
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    }

    console.log('🚀 Starting stream request:', {
      messageCount: aiRequest.messages.length,
      mode: body.mode,
      difficulty: body.difficulty,
      language: body.language
    })

    // 使用 LangChain 標準的 LangSmith Client 創建 run（確保項目名稱正確）
    const langsmithClient = new Client({
      apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
      apiKey: process.env.LANGCHAIN_API_KEY,
    })
    
    // 明確使用項目名稱 dse-math-tutoring（不使用環境變量，避免發送到 default）
    const projectName = 'dse-math-tutoring'
    runId = randomUUID()
    const userMessage = body.messages.map(m => m.content).join('\n')
    
    // 使用 LangSmith Client 的 createRun 方法，確保項目名稱正確
    await langsmithClient.createRun({
      id: runId,
      name: `Stream Chat - ${body.mode}`,
      run_type: 'chain',
      project_name: projectName, // 明確設置項目名稱
      inputs: {
        messages: body.messages,
        mode: body.mode,
        difficulty: body.difficulty,
        language: body.language,
        userMessage: userMessage,
        messageCount: body.messages.length
      },
      tags: [
        'math-chat',
        'streaming',
        `mode:${body.mode}`,
        `difficulty:${body.difficulty}`,
        `language:${body.language}`
      ],
      extra: {
        metadata: {
          sessionId: (body as any).sessionId || 'unknown',
          userId: (body as any).userId || 'anonymous',
          startTime: startTime,
          endpoint: '/api/chat/stream',
          streaming: true,
          application: 'dse-math-tutoring'
        }
      },
      start_time: Date.now()
    })
    
    console.log(`✅ LangSmith stream run created: ${runId} for project: ${projectName}`)

    const stream = await getAIAPIManager().sendMessage(aiRequest)

    console.log('✅ Stream request completed')

    if (!stream || typeof stream === 'object' && 'error' in stream) {
      console.error('AI Stream API Error:', stream)
      return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 })
    }

    // 創建包裝流來收集內容並更新 LangSmith
    const contentBuffer: string[] = []
    const mcpCallInfos: any[] = []
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    // 包裝原始流
    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = (stream as ReadableStream<Uint8Array>).getReader()

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // 流結束，更新 LangSmith run（使用 LangSmith Client 標準方法）
              const fullContent = contentBuffer.join('')
              const responseTime = Date.now() - startTime
              
              const langsmithClient = new Client({
                apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
                apiKey: process.env.LANGCHAIN_API_KEY,
              })

              await langsmithClient.updateRun(runId, {
                outputs: {
                  aiResponse: fullContent.substring(0, 1000), // 限制長度
                  responseText: fullContent,
                  mcpCallsExecuted: mcpCallInfos.length,
                  responseTime: responseTime,
                  streaming: true
                },
                end_time: Date.now()
              })

              console.log(`✅ LangSmith stream run updated: ${runId}`)
              controller.close()
              break
            }

            // 處理數據塊
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataLine = line.substring(6)

                if (dataLine.trim() === '[DONE]') {
                  continue
                }

                try {
                  const data = JSON.parse(dataLine)
                  const content = data.choices?.[0]?.delta?.content || ''
                  const mcpInfos = data.choices?.[0]?.delta?.mcpCallInfos || []

                  if (content) {
                    contentBuffer.push(content)
                  }

                  if (mcpInfos && Array.isArray(mcpInfos)) {
                    mcpCallInfos.push(...mcpInfos)
                    
                    // 為每個 MCP 調用創建子 run（使用 LangSmith Client 標準方法）
                    const langsmithClient = new Client({
                      apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
                      apiKey: process.env.LANGCHAIN_API_KEY,
                    })
                    
                    // 明確使用項目名稱 dse-math-tutoring（不使用環境變量，避免發送到 default）
    const projectName = 'dse-math-tutoring'
                    
                    for (const mcpInfo of mcpInfos) {
                      if (mcpInfo.toolName) {
                        const toolRunId = randomUUID()
                        await langsmithClient.createRun({
                          id: toolRunId,
                          name: `${mcpInfo.toolName} Tool`,
                          run_type: 'tool',
                          parent_run_id: runId,
                          project_name: projectName, // 明確設置項目名稱
                          inputs: {
                            tool: mcpInfo.toolName,
                            parameters: mcpInfo.details?.parameters || {},
                            input: mcpInfo.details?.parameters || {}
                          },
                          outputs: mcpInfo.status === 'success' ? {
                            result: mcpInfo.details?.result,
                            success: true
                          } : {
                            error: mcpInfo.details?.error,
                            success: false
                          },
                          tags: ['mcp-tool', `tool:${mcpInfo.toolName}`, `mode:${body.mode}`],
                          extra: {
                            metadata: {
                              toolType: 'mcp',
                              executionTime: mcpInfo.details?.executionTime || 0,
                              mode: body.mode,
                              application: 'dse-math-tutoring'
                            }
                          },
                          start_time: Date.now(),
                          end_time: Date.now()
                        })
                      }
                    }
                  }
                } catch (e) {
                  // 忽略解析錯誤
                }
              }
            }

            // 轉發原始數據
            controller.enqueue(value)
          }
        } catch (error) {
          console.error('Stream processing error:', error)
          controller.error(error)
        }
      }
    })

    // 在 check 和 solve 模式下，使用 LangChain MCP 流处理器
    if (body.mode === 'check' || body.mode === 'solve') {
      console.log(`🔧 Processing ${body.mode} stream with LangChain MathMCP integration...`)

      const processedStream = await processStreamWithLangChainMCP(
        wrappedStream,
        body.mode
      )

      console.log(`✅ LangChain Stream processor setup completed for ${body.mode} mode`)

      return new Response(processedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // 其他模式直接返回包裝流
      return new Response(wrappedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ Stream API error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')

    // 如果有 runId，更新 run 記錄錯誤
    if (typeof runId !== 'undefined') {
      try {
        const langsmithClient = new Client({
          apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
          apiKey: process.env.LANGCHAIN_API_KEY,
        })
        
        await langsmithClient.updateRun(runId, {
          outputs: {
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          },
          end_time: Date.now()
        })
      } catch (updateError) {
        console.error('Failed to update LangSmith run with error:', updateError)
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}