"use client"

import { useState, useCallback } from 'react'

interface StreamingOptions {
  onComplete?: (content: string) => void
  onError?: (error: Error) => void
}

export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')

  const startStreaming = useCallback(async (
    url: string, 
    body: any, 
    options: StreamingOptions = {}
  ) => {
    setIsStreaming(true)
    setStreamingContent('')

    try {
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
                break
              }

              try {
                const parsed = JSON.parse(data)
                // OpenAI 格式：choices[0].delta.content
                const deltaContent = parsed.choices?.[0]?.delta?.content || parsed.content || ''
                if (deltaContent) {
                  content += deltaContent
                  setStreamingContent(content)
                }
              } catch (e) {
                // 忽略解析錯誤，繼續處理下一行
                console.warn('Failed to parse streaming data:', data)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      options.onComplete?.(content)
    } catch (error) {
      console.error('Streaming error:', error)
      options.onError?.(error as Error)
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const stopStreaming = useCallback(() => {
    setIsStreaming(false)
  }, [])

  const clearContent = useCallback(() => {
    setStreamingContent('')
  }, [])

  return {
    isStreaming,
    streamingContent,
    startStreaming,
    stopStreaming,
    clearContent,
  }
}
