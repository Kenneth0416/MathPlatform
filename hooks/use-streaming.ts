"use client"

import { useState, useCallback } from 'react'
import { chatService, ChatRequest } from '@/lib/chat-service'
import { logger } from '@/lib/logger'

interface StreamingOptions {
  onComplete?: (content: string, mcpCallInfos?: import('@/types/mcp').MCPCallInfo[]) => void
  onError?: (error: Error) => void
}

export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingMCPCallInfos, setStreamingMCPCallInfos] = useState<import('@/types/mcp').MCPCallInfo[]>([])

  const startStreaming = useCallback(async (
    request: ChatRequest,
    options: StreamingOptions = {}
  ) => {
    setIsStreaming(true)
    setStreamingContent('')
    setStreamingMCPCallInfos([])

    try {
      await logger.info('開始串流聊天', {
        component: 'use-streaming',
        action: 'start_streaming',
        metadata: {
          mode: request.mode,
          difficulty: request.difficulty,
          language: request.language,
          hasCustomInstructions: !!request.customInstructions
        },
        userId: request.userId,
        sessionId: request.sessionId
      })

      let accumulatedContent = ''

      // 使用新的 ChatService 進行串流聊天
      for await (const chunk of chatService.chatStream(request, {
        customInstructions: request.customInstructions,
        metadata: request.metadata
      })) {
        if (chunk) {
          accumulatedContent += chunk
          setStreamingContent(accumulatedContent)
        }
      }

      // 記錄完成事件
      await logger.info('串流聊天完成', {
        component: 'use-streaming',
        action: 'streaming_complete',
        metadata: {
          mode: request.mode,
          difficulty: request.difficulty,
          language: request.language,
          contentLength: accumulatedContent.length,
          mcpCallCount: streamingMCPCallInfos.length
        },
        userId: request.userId,
        sessionId: request.sessionId
      })

      // 傳遞完整的內容和 MCP 調用信息
      options.onComplete?.(accumulatedContent, streamingMCPCallInfos)

    } catch (error) {
      await logger.error('串流聊天錯誤', {
        component: 'use-streaming',
        action: 'streaming_error',
        metadata: {
          mode: request.mode,
          difficulty: request.difficulty,
          language: request.language
        },
        userId: request.userId,
        sessionId: request.sessionId
      }, error as Error)

      console.error('Streaming error:', error)
      options.onError?.(error as Error)
    } finally {
      setIsStreaming(false)
    }
  }, [streamingMCPCallInfos])

  const startStreamingWithURL = useCallback(async (
    url: string,
    body: any,
    options: StreamingOptions = {}
  ) => {
    setIsStreaming(true)
    setStreamingContent('')

    try {
      await logger.warn('使用舊版 API 調用方式', {
        component: 'use-streaming',
        action: 'legacy_api_call',
        metadata: { url }
      })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let content = ''

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)

              if (data === '[DONE]') {
                console.log('📡 Streaming completed with [DONE] signal')
                reader.releaseLock()
                options.onComplete?.(content, streamingMCPCallInfos)
                return // 直接返回，結束流處理
              }

              try {
                const parsed = JSON.parse(data)
                const deltaContent = parsed.choices?.[0]?.delta?.content || parsed.content || ''
                const deltaMCPCallInfos = parsed.choices?.[0]?.delta?.mcpCallInfos || []

                if (deltaContent) {
                  content += deltaContent
                  setStreamingContent(content)
                }

                if (deltaMCPCallInfos && deltaMCPCallInfos.length > 0) {
                  console.log('🔧 Streaming Hook: Received MCP call infos', deltaMCPCallInfos)
                  setStreamingMCPCallInfos(prev => {
                    const existingIds = new Set(prev.map(info => info.id))
                    const newInfos = deltaMCPCallInfos.filter((info: any) => !existingIds.has(info.id))
                    return [...prev, ...newInfos]
                  })
                }
              } catch (e) {
                console.warn('Failed to parse streaming data:', data)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      options.onComplete?.(content, streamingMCPCallInfos)
    } catch (error) {
      await logger.error('舊版 API 調用錯誤', {
        component: 'use-streaming',
        action: 'legacy_api_error',
        metadata: { url }
      }, error as Error)

      console.error('Streaming error:', error)
      options.onError?.(error as Error)
    } finally {
      setIsStreaming(false)
    }
  }, [streamingMCPCallInfos])

  const stopStreaming = useCallback(() => {
    setIsStreaming(false)
  }, [])

  const clearContent = useCallback(() => {
    setStreamingContent('')
    setStreamingMCPCallInfos([])
  }, [])

  return {
    isStreaming,
    streamingContent,
    streamingMCPCallInfos,
    startStreaming,      // 新的 ChatService 方式
    startStreamingWithURL, // 舊的 URL 方式（向后兼容）
    stopStreaming,
    clearContent,
  }
}
