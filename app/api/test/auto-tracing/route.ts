import { NextRequest, NextResponse } from 'next/server'
import { createTracedChat, testLangSmithAutoTracing } from '@/lib/langchain-auto-tracing'

// 开发环境专用的自动追踪测试端点
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const { testMode } = await req.json().catch(() => ({}))

    if (testMode === 'comprehensive') {
      // 运行综合测试
      await testLangSmithAutoTracing()
      return NextResponse.json({
        success: true,
        message: 'LangSmith auto-tracing comprehensive test completed',
        instructions: {
          checkLangsmith: 'Check your LangSmith dashboard for auto-traced runs',
          projectName: process.env.LANGSMITH_PROJECT || 'dse-math-tutoring',
          environment: 'LANGSMITH_TRACING=true should be set'
        }
      })
    } else {
      // 运行简单测试
      const result = await createTracedChat({
        messages: [
          { role: 'system', content: 'You are a helpful math assistant.' },
          { role: 'user', content: 'Solve: 5 + 7 = ?' }
        ],
        mode: 'test-auto',
        difficulty: 'easy',
        language: 'en',
        temperature: 0.7,
        max_tokens: 100
      })

      return NextResponse.json({
        success: true,
        message: 'LangSmith auto-tracing test completed',
        result: {
          responseText: result.content?.substring(0, 100) || 'No response',
          hasTracing: true,
          tracingMethod: 'langchain_auto'
        },
        instructions: {
          checkLangsmith: 'Check your LangSmith dashboard for auto-traced runs',
          projectName: process.env.LANGSMITH_PROJECT || 'dse-math-tutoring',
          environment: 'LANGSMITH_TRACING=true should be set'
        }
      })
    }

  } catch (error) {
    console.error('❌ Auto-tracing test failed:', error)

    return NextResponse.json({
      success: false,
      error: 'Auto-tracing test failed',
      details: error instanceof Error ? error.message : String(error),
      troubleshooting: [
        'Check if LANGSMITH_TRACING=true is set',
        'Verify LANGSMITH_API_KEY is correct',
        'Confirm LANGSMITH_PROJECT is specified',
        'Ensure at least one AI provider is configured (POE, DeepSeek, or OpenAI)'
      ]
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    message: 'LangSmith Auto-Tracing Test Endpoint',
    usage: 'POST /api/test/auto-tracing',
    description: 'Tests LangSmith automatic tracing using LangChain components',
    expectedResults: [
      'Automatic run creation without manual client calls',
      'Proper run hierarchy and metadata',
      'Tags and metadata propagation',
      'Comprehensive tracing with multiple test cases'
    ],
    environment: {
      LANGSMITH_TRACING: process.env.LANGSMITH_TRACING || 'not set',
      LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT || 'not set',
      POE_API_KEY: process.env.POE_API_KEY ? 'set' : 'not set',
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? 'set' : 'not set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'not set'
    }
  })
}