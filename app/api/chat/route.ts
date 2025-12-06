import { NextRequest, NextResponse } from 'next/server'
import { getAIAPIManager, POERequest, POEMessage } from '@/lib/ai-api'
import { buildMathPrompt } from '@/lib/prompts/math-prompts'
import { createContentFilter, BlockedContentResponse } from '@/lib/content-filter'
import { globalContentFilter } from '@/lib/content-filter'
import { traceContentFilterEvent } from '@/lib/langsmith-config'
import { executeAllMCPCalls, hasMCPCalls } from '@/lib/mcp-parser'
import { Client } from 'langsmith'
import { randomUUID } from 'crypto'

export interface ChatRequest {
  messages: POEMessage[]
  mode: 'solve' | 'tutor' | 'practice' | 'check'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
  bot?: string
}

export interface Visualization {
  id: string
  type: 'mermaid' | 'chart' | 'graph'
  code: string
  title?: string
  description?: string
}

export interface ChatResponse {
  text: string
  steps?: Array<{
    id: string
    title: string
    content: string
    explanation?: string
    formula?: string
  }>
  knowledgePoints?: string[]
  visualizations?: Visualization[]
  error?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let runId: string | undefined

  // 初始化 LangSmith Client（在函數開始時聲明一次，避免重複聲明）
  const langsmithClient = new Client({
    apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
    apiKey: process.env.LANGCHAIN_API_KEY,
  })

  try {
    const body: ChatRequest = await request.json()

    // 驗證請求
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      )
    }

    if (!body.mode || !body.difficulty || !body.language) {
      return NextResponse.json(
        { error: 'Invalid request: mode, difficulty, and language are required' },
        { status: 400 }
      )
    }

    // 跨语言内容过滤 - 检测用户输入是否包含敏感内容
    // 检查最后一条用户消息（最新输入）
    const lastUserMessage = body.messages
      .filter(msg => msg.role === 'user')
      .pop()

    if (lastUserMessage) {
      const filterResult = globalContentFilter.detectAndFilterMultipleLanguages(lastUserMessage.content, body.language)

      if (filterResult.shouldBlock && filterResult.message) {
        console.log('Cross-lingual content blocked by filter:', {
          userLanguage: body.language,
          messageLength: lastUserMessage.content.length
        })

        // 追踪内容过滤事件
        await traceContentFilterEvent(
          lastUserMessage.content,
          filterResult.detectedContent || [],
          body.language,
          filterResult.contentType || 'general'
        )

        return NextResponse.json({
          text: filterResult.message,
          error: 'Content blocked: inappropriate input detected (cross-lingual)'
        }, { status: 200 }) // 返回200状态码，但包含拒绝消息
      }
    }

    // 檢查是否有任何 AI API 配置
    const hasAPIConfig = process.env.DEEPSEEK_API_KEY ||
                         process.env.POE_API_KEY ||
                         process.env.OPENAI_API_KEY

    if (!hasAPIConfig) {
      return NextResponse.json(
        {
          error: 'No AI API configured. Please set DEEPSEEK_API_KEY, POE_API_KEY, or OPENAI_API_KEY in your environment variables.',
          text: '抱歉，AI 服務暫時不可用。請檢查服務器配置。'
        },
        { status: 503 }
      )
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
    }

    console.log('🚀 Starting chat request:', {
      messageCount: aiRequest.messages.length,
      mode: body.mode,
      difficulty: body.difficulty,
      language: body.language
    })

    // 使用 LangChain 標準的 LangSmith Client 創建 run（確保項目名稱正確）
    // 明確使用項目名稱 dse-math-tutoring（不使用環境變量，避免發送到 default）
    const projectName = 'dse-math-tutoring'
    runId = randomUUID()
    const userMessage = body.messages.map(m => m.content).join('\n')
    
    // 使用 LangSmith Client 的 createRun 方法，明確設置項目名稱
    await langsmithClient.createRun({
      id: runId,
      name: `Math Chat - ${body.mode}`,
      run_type: 'chain',
      project_name: projectName, // 明確設置項目名稱為 dse-math-tutoring
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
        `mode:${body.mode}`,
        `difficulty:${body.difficulty}`,
        `language:${body.language}`
      ],
      extra: {
        metadata: {
          sessionId: (body as any).sessionId || 'unknown',
          userId: (body as any).userId || 'anonymous',
          startTime: startTime,
          endpoint: '/api/chat',
          streaming: false,
          application: 'dse-math-tutoring'
        }
      },
      start_time: Date.now()
    })
    
    console.log(`✅ LangSmith run created: ${runId} for project: ${projectName}`)

    // 調用 AI API 管理器
    const response = await getAIAPIManager().sendMessage(aiRequest)

    console.log('✅ Chat request completed')

    if (typeof response === 'object' && 'error' in response && response.error) {
      console.error('AI API Error:', response.error)
      return NextResponse.json(
        {
          error: `AI API Error: ${response.error}`,
          text: '抱歉，AI 服務暫時不可用。請稍後再試。'
        },
        { status: 502 }
      )
    }

    // 確保 response 不是流
    if (response instanceof ReadableStream) {
      throw new Error('Expected non-streaming response but got stream')
    }

    // 检查并执行 MathMCP 调用（仅在 check 和 practice 模式下）
    let processedText = response.text
    let mcpExecutionResults: any[] = []

    if ((body.mode === 'check' || body.mode === 'practice') && hasMCPCalls(response.text)) {
      console.log(`🔧 Processing ${body.mode} mode with MathMCP calls...`)

      const mcpResult = await executeAllMCPCalls(response.text)
      processedText = mcpResult.processedText
      mcpExecutionResults = mcpResult.results

      // 為每個 MCP 調用創建 LangSmith 子 run（使用 LangSmith Client 標準方法）
      // 明確使用項目名稱 dse-math-tutoring
      const projectName = 'dse-math-tutoring'
      
      for (const mcpResult of mcpExecutionResults) {
        if (mcpResult.tool) {
          const toolRunId = randomUUID()
          await langsmithClient.createRun({
            id: toolRunId,
            name: `${mcpResult.tool} Tool`,
            run_type: 'tool',
            parent_run_id: runId,
            project_name: projectName, // 明確設置項目名稱
            inputs: {
              tool: mcpResult.tool,
              parameters: mcpResult.rawCall || {},
              input: mcpResult.rawCall || ''
            },
            outputs: mcpResult.success ? {
              result: mcpResult.data,
              success: true
            } : {
              error: mcpResult.error,
              success: false
            },
            tags: ['mcp-tool', `tool:${mcpResult.tool}`, `mode:${body.mode}`],
            extra: {
              metadata: {
                toolType: 'mcp',
                executionTime: mcpResult.executionTime || 0,
                mode: body.mode,
                application: 'dse-math-tutoring'
              }
            },
            start_time: Date.now(),
            end_time: Date.now()
          })
        }
      }

      console.log(`✅ MathMCP processing completed for ${body.mode} mode:`, {
        totalCalls: mcpResult.results.length,
        executionTime: mcpResult.executionTime,
        successful: mcpResult.results.filter(r => r.success).length
      })
    }

    // 解析響應，提取步驟、知識點和可視化
    const steps = parseSteps(processedText)
    const knowledgePoints = extractKnowledgePoints(processedText)
    const visualizations = extractVisualizations(processedText)

    const chatResponse: ChatResponse = {
      text: processedText,
      steps,
      knowledgePoints,
      visualizations,
    }

    // 更新 LangSmith run 的 outputs（使用 LangSmith Client 標準方法）
    const responseTime = Date.now() - startTime
    
    await langsmithClient.updateRun(runId, {
      outputs: {
        aiResponse: processedText.substring(0, 1000), // 限制長度
        responseText: processedText,
        steps: steps.length,
        knowledgePoints: knowledgePoints,
        visualizations: visualizations.length,
        mcpCallsExecuted: mcpExecutionResults.length,
        mcpCallsSuccessful: mcpExecutionResults.filter(r => r.success).length,
        responseTime: responseTime,
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed || 0
      },
      end_time: Date.now()
    })

    console.log('Successfully processed chat request with AI API')
    console.log(`✅ LangSmith run updated: ${runId}`)
    return NextResponse.json(chatResponse)

  } catch (error) {
    console.error('❌ Chat API Error:', error)

    // 如果有 runId，更新 run 記錄錯誤
    if (typeof runId !== 'undefined') {
      try {
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
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        text: '抱歉，處理您的請求時發生錯誤。請稍後再試。'
      },
      { status: 500 }
    )
  }
}

// 解析步驟化解答
function parseSteps(text: string): Array<{
  id: string
  title: string
  content: string
  explanation?: string
  formula?: string
}> {
  const steps: Array<{
    id: string
    title: string
    content: string
    explanation?: string
    formula?: string
  }> = []

  // 匹配步驟模式
  const stepPatterns = [
    /(?:步驟|步骤|Step)\s*(\d+)[:：]\s*(.+?)(?=(?:步驟|步骤|Step)\s*\d+[:：]|$)/gs,
    /(?:第|第)\s*(\d+)\s*(?:步|步)[:：]\s*(.+?)(?=(?:第|第)\s*\d+\s*(?:步|步)[:：]|$)/gs,
  ]

  for (const pattern of stepPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const stepNumber = match[1]
      const stepContent = match[2].trim()

      // 提取公式
      const formulaMatch = stepContent.match(/\$\$([^$]+)\$\$|\$([^$]+)\$/)
      const formula = formulaMatch ? (formulaMatch[1] || formulaMatch[2]) : undefined

      // 提取解釋
      const explanation = stepContent.replace(/\$\$[^$]+\$\$|\$[^$]+\$/g, '').trim()

      steps.push({
        id: `step-${stepNumber}`,
        title: `步驟 ${stepNumber}`,
        content: stepContent,
        explanation,
        formula,
      })
    }
  }

  return steps
}

// 提取知識點
function extractKnowledgePoints(text: string): string[] {
  const knowledgePoints: string[] = []

  // 常見數學知識點關鍵詞
  const mathKeywords = [
    '二次方程', '一次方程', '線性方程', 'quadratic equation', 'linear equation',
    '三角函數', 'trigonometry', 'sin', 'cos', 'tan',
    '導數', 'derivative', '微分', 'differentiation',
    '積分', 'integral', 'integration',
    '幾何', 'geometry', '面積', 'area', '體積', 'volume',
    '概率', 'probability', '統計', 'statistics',
    '向量', 'vector', '矩陣', 'matrix',
    '函數', 'function', '圖像', 'graph',
    '不等式', 'inequality', '絕對值', 'absolute value',
    '對數', 'logarithm', '指數', 'exponential',
    '數列', 'sequence', '級數', 'series',
    '複數', 'complex number', '極坐標', 'polar coordinates',
  ]

  for (const keyword of mathKeywords) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      knowledgePoints.push(keyword)
    }
  }

  return [...new Set(knowledgePoints)] // 去重
}

// 提取 Mermaid 可視化代碼
function extractVisualizations(text: string): Visualization[] {
  const visualizations: Visualization[] = []

  // 匹配 Mermaid 代碼塊
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/gi
  let match

  while ((match = mermaidRegex.exec(text)) !== null) {
    const mermaidCode = match[1].trim()

    if (mermaidCode) {
      // 分析 Mermaid 類型
      let type: 'mermaid' | 'chart' | 'graph' = 'mermaid'

      if (mermaidCode.toLowerCase().includes('flowchart')) {
        type = 'mermaid'
      } else if (mermaidCode.toLowerCase().includes('graph')) {
        type = 'graph'
      } else if (mermaidCode.toLowerCase().includes('sequence')) {
        type = 'mermaid'
      }

      // 生成 ID
      const id = `mermaid-${visualizations.length + 1}-${Date.now()}`

      // 提取標題（如果有的話）
      let title: string | undefined
      const titleMatch = mermaidCode.match(/title\s*[:：]\s*(.+)/i)
      if (titleMatch) {
        title = titleMatch[1].trim()
      }

      visualizations.push({
        id,
        type,
        code: mermaidCode,
        title
      })
    }
  }

  return visualizations
}

// 推断话题类别
function inferTopicCategory(text: string): string {
  const lowerText = text.toLowerCase()

  if (lowerText.includes('代数') || lowerText.includes('algebra') || lowerText.includes('方程') || lowerText.includes('equation')) {
    return 'algebra'
  }
  if (lowerText.includes('几何') || lowerText.includes('geometry') || lowerText.includes('三角') || lowerText.includes('triangle')) {
    return 'geometry'
  }
  if (lowerText.includes('微积分') || lowerText.includes('calculus') || lowerText.includes('导数') || lowerText.includes('积分') || lowerText.includes('derivative') || lowerText.includes('integral')) {
    return 'calculus'
  }
  if (lowerText.includes('概率') || lowerText.includes('统计') || lowerText.includes('probability') || lowerText.includes('statistics')) {
    return 'statistics'
  }
  if (lowerText.includes('三角函数') || lowerText.includes('trigonometry') || lowerText.includes('sin') || lowerText.includes('cos')) {
    return 'trigonometry'
  }

  return 'general'
}

// 推断问题类型
function inferProblemType(input: string): string {
  const lowerInput = input.toLowerCase()

  if (lowerInput.includes('solve') || lowerInput.includes('solve') || lowerInput.includes('求解') || lowerInput.includes('计算')) {
    return 'problem_solving'
  }
  if (lowerInput.includes('explain') || lowerInput.includes('解释') || lowerInput.includes('why') || lowerInput.includes('为什么')) {
    return 'explanation'
  }
  if (lowerInput.includes('help') || lowerInput.includes('帮助') || lowerInput.includes('tutor') || lowerInput.includes('辅导')) {
    return 'tutoring'
  }
  if (lowerInput.includes('practice') || lowerInput.includes('练习') || lowerInput.includes('generate') || lowerInput.includes('生成')) {
    return 'practice_generation'
  }
  if (lowerInput.includes('check') || lowerInput.includes('检查') || lowerInput.includes('verify') || lowerInput.includes('验证')) {
    return 'verification'
  }

  return 'general_inquiry'
}