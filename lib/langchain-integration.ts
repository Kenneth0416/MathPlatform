// LangChain Integration for AI API Manager
// 提供LangChain兼容的接口以启用自动追踪

import { Runnable, RunnableConfig } from "@langchain/core/runnables"
import { CallbackManager } from "@langchain/core/callbacks/manager"
import { enhancedLangSmithClient } from "./langsmith-enhanced"
import { getAIAPIManager, POERequest } from "./ai-api"

// LangChain 兼容的 AI API 包装器
export class LangChainAIWrapper implements Runnable<POERequest, any> {
  private aiManager = getAIAPIManager()
  private projectName: string

  constructor(projectName?: string) {
    this.projectName = projectName || process.env.LANGCHAIN_PROJECT || 'dse-math-tutoring'
  }

  // 实现 LangChain Runnable 接口
  async invoke(
    input: POERequest,
    options?: RunnableConfig & { callbacks?: any }
  ): Promise<any> {
    const startTime = Date.now()
    let runId = ''
    let llmRunId = ''

    try {
      // 从 callbacks 中获取 run ID（如果存在）
      if (options?.callbacks?.manager) {
        const callbackManager = options.callbacks.manager
        if (callbackManager.currentRun?.id) {
          runId = callbackManager.currentRun.id
        }
      }

      console.log(`🔗 LangChain wrapper invoked with runId: ${runId}`)

      // 如果没有 run ID，创建一个新的父运行
      if (!runId) {
        runId = crypto.randomUUID()
        await enhancedLangSmithClient.createRun(
          runId,
          'Math Chat - LangChain Wrapper',
          {
            messages: input.messages,
            mode: this.extractMode(input.messages),
            stream: input.stream || false,
            temperature: input.temperature,
            max_tokens: input.max_tokens
          },
          {},
          ['langchain-wrapper', 'api-call'],
          {
            sessionId: options?.tags?.find((tag: string) => tag.includes('session:')),
            startTime
          }
        )
      }

      // 创建 LLM 子运行
      llmRunId = await enhancedLangSmithClient.createLLMRun(
        runId,
        input.model || 'Claude-Sonnet-4.5',
        {
          messages: input.messages,
          stream: input.stream || false,
          temperature: input.temperature,
          max_tokens: input.max_tokens
        },
        {},
        {
          provider: this.detectProvider(input.model),
          temperature: input.temperature,
          maxTokens: input.max_tokens,
          startTime
        }
      )

      // 调用实际的 AI API
      const response = await this.aiManager.sendMessage(input)
      const responseTime = Date.now() - startTime

      // 处理流式响应
      if (input.stream && response instanceof ReadableStream) {
        console.log(`📡 Streaming response initiated, runId: ${runId}`)
        return this.wrapStreamWithTracing(response, runId, llmRunId, responseTime)
      }

      // 处理普通响应
      let responseText = ''
      let tokensUsed = 0
      let provider = 'unknown'

      if (typeof response === 'object' && response !== null) {
        responseText = response.text || ''
        tokensUsed = response.tokensUsed || 0
        provider = response.provider || 'unknown'
      } else if (typeof response === 'string') {
        responseText = response
      }

      // 更新 LLM 运行结果
      await enhancedLangSmithClient.updateRunWithResults(llmRunId, {
        response: responseText.substring(0, 1000),
        response_time_ms: responseTime,
        tokens_used: tokensUsed,
        provider
      })

      // 更新父运行结果
      if (runId && llmRunId !== runId) {
        await enhancedLangSmithClient.updateRunWithResults(runId, {
          response: responseText.substring(0, 1000),
          response_time_ms: responseTime,
          tokens_used: tokensUsed,
          provider,
          success: true
        })
      }

      console.log(`✅ LangChain wrapper completed, runId: ${runId}`)
      return response

    } catch (error) {
      const responseTime = Date.now() - startTime
      console.error(`❌ LangChain wrapper error, runId: ${runId}:`, error)

      // 追踪错误
      if (runId) {
        await enhancedLangSmithClient.updateRunWithResults(runId, {
          error: error instanceof Error ? error.message : String(error),
          response_time_ms: responseTime,
          success: false
        })
      }

      throw error
    }
  }

  // 包装流式响应以添加追踪
  private wrapStreamWithTracing(
    stream: ReadableStream<Uint8Array>,
    parentRunId: string,
    llmRunId: string,
    startTime: number
  ): ReadableStream<Uint8Array> {
    const responseStream = new TransformStream({
      start() {
        this.accumulatedResponse = ''
      },
      transform(chunk, controller) {
        // 累积响应内容用于后续分析
        const text = new TextDecoder().decode(chunk)
        this.accumulatedResponse += text
        controller.enqueue(chunk)
      },
      async flush() {
        const responseTime = Date.now() - startTime

        try {
          // 更新 LLM 运行结果
          await enhancedLangSmithClient.updateRunWithResults(llmRunId, {
            response: this.accumulatedResponse.substring(0, 1000),
            response_time_ms: responseTime,
            stream: true,
            provider: 'poe' // 可以从实际响应中提取
          })

          console.log(`✅ Stream tracing completed, runId: ${llmRunId}`)
        } catch (error) {
          console.error('Error updating stream run:', error)
        }
      }
    })

    return stream.pipeThrough(responseStream)
  }

  // 提取学习模式
  private extractMode(messages: any[]): string {
    const systemMessage = messages.find(msg => msg.role === 'system')
    if (systemMessage?.content) {
      const content = systemMessage.content.toLowerCase()
      if (content.includes('solve')) return 'solve'
      if (content.includes('tutor')) return 'tutor'
      if (content.includes('practice')) return 'practice'
      if (content.includes('check')) return 'check'
    }
    return 'unknown'
  }

  // 检测 AI 提供商
  private detectProvider(model?: string): string {
    if (model?.toLowerCase().includes('claude')) return 'poe'
    if (model?.toLowerCase().includes('deepseek')) return 'deepseek'
    if (model?.toLowerCase().includes('gpt')) return 'openai'
    return 'poe' // 默认提供商
  }

  // LangChain 必需的方法
  transform(
    generator: AsyncGenerator<POERequest>,
    options?: RunnableConfig
  ): AsyncGenerator<any> {
    return (async function* () {
      for await (const input of generator) {
        yield await this.invoke(input, options)
      }
    }).call(this)()
  }

  stream(
    input: POERequest,
    options?: RunnableConfig
  ): AsyncGenerator<any> {
    return this.transform([input] as any, options)
  }

  batch(inputs: POERequest[], options?: RunnableConfig): Promise<any[]> {
    return Promise.all(inputs.map(input => this.invoke(input, options)))
  }

  map(): Runnable<POERequest, any> {
    return this
  }

  // 配置方法
  withConfig(config: RunnableConfig): this {
    return this
  }

  withCallbacks(callbacks: any): this {
    return this
  }
}

// 创建全局 LangChain 包装器实例
export const langChainAIWrapper = new LangChainAIWrapper()

// 兼容性函数：将现有的 AI API 调用包装为 LangChain 调用
export async function callAIWithLangChainTracing(
  request: POERequest,
  options?: { tags?: string[]; metadata?: Record<string, any> }
): Promise<any> {
  const config: RunnableConfig = {
    tags: options?.tags || [],
    metadata: options?.metadata || {}
  }

  return langChainAIWrapper.invoke(request, config)
}

// 导出便捷函数
export function createLangChainTracedAICall(
  messages: any[],
  options?: {
    mode?: string
    difficulty?: string
    language?: string
    stream?: boolean
    temperature?: number
    max_tokens?: number
  }
) {
  const request: POERequest = {
    messages,
    temperature: options?.temperature || 0.7,
    max_tokens: options?.max_tokens || 2000,
    stream: options?.stream || false
  }

  const tags = []
  if (options?.mode) tags.push(`mode:${options.mode}`)
  if (options?.difficulty) tags.push(`difficulty:${options.difficulty}`)
  if (options?.language) tags.push(`language:${options.language}`)

  return callAIWithLangChainTracing(request, {
    tags,
    metadata: {
      mode: options?.mode,
      difficulty: options?.difficulty,
      language: options?.language
    }
  })
}