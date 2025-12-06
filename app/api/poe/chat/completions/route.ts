import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate that POE_API_KEY is set
    if (!process.env.POE_API_KEY) {
      return NextResponse.json(
        { error: 'POE_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // Check if this is a streaming request
    const isStreaming = body.stream === true

    // Proxy the request to Poe API
    const res = await fetch('https://api.poe.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.POE_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    // Handle streaming responses
    if (isStreaming && res.body) {
      return new Response(res.body, {
        status: res.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Handle non-streaming responses
    const data = await res.json()

    // Return the response with the same status code
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Poe API proxy error:', error)
    return NextResponse.json(
      {
        error: 'Failed to proxy request to Poe API',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}


