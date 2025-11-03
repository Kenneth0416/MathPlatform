import { NextRequest, NextResponse } from 'next/server'
import { poeClient } from '@/lib/poe-api'
import { buildMathPrompt } from '@/lib/prompts/math-prompts'

export async function POST(req: NextRequest) {
  try {
    const { messages, mode, difficulty, language } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    if (!process.env.POE_API_KEY) {
      return NextResponse.json({ error: 'POE API is not configured' }, { status: 503 })
    }

    const userMessageContent = messages[messages.length - 1].content
    const prompt = buildMathPrompt({
      mode,
      difficulty,
      language,
    }) + `\n\n用戶問題: ${userMessageContent}`

    // 調用 POE API 並獲取真正的流式響應
    const stream = await poeClient.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      bot: 'Claude-Sonnet-4.5',
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    })

    if (!stream) {
      return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 })
    }

    // 直接返回流，不做額外處理
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Stream API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
