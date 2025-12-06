import { NextRequest, NextResponse } from 'next/server'
import { langChainAIWrapper } from '@/lib/langchain-integration'
import { enhancedLangSmithClient } from '@/lib/langsmith-enhanced'

// 开发环境专用的测试端点
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const testRunId = crypto.randomUUID()
    console.log(`🧪 Starting tracing test with runId: ${testRunId}`)

    // 测试1: 直接使用 enhanced client 创建运行
    await enhancedLangSmithClient.createRun(
      testRunId,
      'Test Run - Direct Client',
      {
        test: true,
        timestamp: new Date().toISOString()
      },
      {
        success: true,
        message: 'Direct client test successful'
      },
      ['test', 'direct-client'],
      {
        testRun: true,
        testType: 'direct'
      }
    )

    // 测试2: 使用 LangChain 包装器
    const langchainResponse = await langChainAIWrapper.invoke({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Solve: 2 + 2 = ?'
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
      stream: false
    }, {
      tags: ['test', 'langchain-wrapper'],
      metadata: {
        testRun: true,
        testType: 'langchain'
      }
    })

    console.log('✅ Both tracing tests completed successfully')

    return NextResponse.json({
      success: true,
      message: 'LangSmith tracing test completed',
      results: {
        directClientRunId: testRunId,
        langchainResponseReceived: !!langchainResponse,
        langchainResponseText: typeof langchainResponse === 'object' ? langchainResponse.text?.substring(0, 100) : 'Non-object response'
      },
      instructions: {
        checkLangSmith: 'Check your LangSmith dashboard for traces with runId: ' + testRunId,
        projectName: process.env.LANGCHAIN_PROJECT || 'dse-math-tutoring'
      }
    })

  } catch (error) {
    console.error('❌ Tracing test failed:', error)

    return NextResponse.json({
      success: false,
      error: 'Tracing test failed',
      details: error instanceof Error ? error.message : String(error)
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
    message: 'LangSmith Tracing Test Endpoint',
    usage: 'POST /api/test/tracing',
    description: 'Tests both direct LangSmith client and LangChain wrapper tracing',
    expectedResults: [
      'Direct client run creation',
      'LangChain wrapper invocation',
      'Evaluation metrics logging',
      'Proper run hierarchy and metadata'
    ]
  })
}