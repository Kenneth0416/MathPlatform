import { NextRequest, NextResponse } from 'next/server'
import { initializeMathDatasets, demonstrateEvaluation } from '@/lib/langsmith-datasets'

// 仅在开发环境中允许访问
const DEV_MODE = process.env.NODE_ENV === 'development'

export async function POST(req: NextRequest) {
  if (!DEV_MODE) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    console.log('🚀 开始初始化 LangSmith 数据集和评估系统...')

    // 初始化数据集
    await initializeMathDatasets()

    // 演示评估功能
    await demonstrateEvaluation()

    return NextResponse.json({
      success: true,
      message: 'LangSmith 数据集和评估系统初始化成功',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 数据集初始化失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize datasets',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  if (!DEV_MODE) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    message: 'LangSmith 数据集初始化端点',
    usage: 'POST /api/admin/initialize-datasets',
    description: '初始化数学学习评估数据集和演示评估功能',
    datasets: [
      'dse-math-algebra-examples',
      'dse-math-geometry-examples',
      'dse-math-calculus-examples',
      'dse-math-learning-modes',
      'dse-math-evaluation-criteria'
    ]
  })
}