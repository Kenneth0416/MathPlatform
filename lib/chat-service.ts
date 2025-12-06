/**
 * 標準化 Chat API 服務
 * 整合 LangChain Chat 系統、LangSmith 追蹤和 MathMCP 工具
 */

import { langchainChat, ChatConfig, ChatOptions, ChatResult } from './langchain-chat'
import { logger, ChatLogContext } from './logger'
import { processStreamWithLangChainMCP } from './langchain-stream-processor'
import { buildMathPrompt } from './prompts/math-prompts'
import { createContentFilter, globalContentFilter } from './content-filter'

// Chat 請求接口
export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp?: string
  }>
  mode: 'solve' | 'tutor' | 'practice' | 'check'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
  model?: string
  temperature?: number
  maxTokens?: number
  streaming?: boolean
  userId?: string
  sessionId?: string
  customInstructions?: string
  metadata?: Record<string, any>
}

// Chat 回應接口
export interface ChatResponse {
  content: string
  metadata: {
    model: string
    responseTime: number
    tokensUsed?: number
    toolCalls?: number
    contentFiltered?: boolean
    provider?: string
  }
}

// 流式回應接口
export interface StreamChatResponse extends ChatResponse {
  isStreaming: boolean
}

// 配置接口
export interface ChatServiceConfig {
  defaultProvider: 'poe' | 'deepseek' | 'openai'
  enableMCP: boolean
  enableLangSmith: boolean
  mcpServiceUrl: string
  contentFilterEnabled: boolean
}

/**
 * 標準化 Chat 服務
 */
export class ChatService {
  private static instance: ChatService
  private config: ChatServiceConfig

  private constructor() {
    this.config = {
      defaultProvider: 'poe',
      enableMCP: true,
      enableLangSmith: true,
      mcpServiceUrl: process.env.MATHMCP_SERVICE_URL || 'http://localhost:8000',
      contentFilterEnabled: true
    }

    // 從環境變量加載配置
    this.loadConfigFromEnv()
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  /**
   * 從環境變量加載配置
   */
  private loadConfigFromEnv(): void {
    if (process.env.DEFAULT_AI_PROVIDER) {
      this.config.defaultProvider = process.env.DEFAULT_AI_PROVIDER as any
    }
    if (process.env.ENABLE_MATHMCP) {
      this.config.enableMCP = process.env.ENABLE_MATHMCP === 'true'
    }
    if (process.env.ENABLE_LANGSMITH !== undefined) {
      this.config.enableLangSmith = process.env.ENABLE_LANGSMITH === 'true'
    }
  }

  /**
   * 獲取配置
   */
  public getConfig(): ChatServiceConfig {
    return { ...this.config }
  }

  /**
   * 轉換請求到 LangChain 配置
   */
  private convertToLangChainConfig(request: ChatRequest): ChatConfig {
    return {
      model: request.model || 'gpt-4',
      temperature: request.temperature || 0.7,
      maxTokens: request.maxTokens || 2000,
      provider: this.config.defaultProvider, // 可以從請求中獲取
      streaming: request.streaming !== false,
      mode: request.mode,
      difficulty: request.difficulty,
      language: request.language,
      userId: request.userId,
      sessionId: request.sessionId
    }
  }

  /**
   * 內容過濾檢查
   */
  private async filterContent(request: ChatRequest): Promise<{
    shouldBlock: boolean
    reason?: string
  }> {
    if (!this.config.contentFilterEnabled) {
      return { shouldBlock: false }
    }

    const lastUserMessage = request.messages
      .filter(msg => msg.role === 'user')
      .pop()

    if (!lastUserMessage) {
      return { shouldBlock: false }
    }

    const filterResult = globalContentFilter.detectAndFilterMultipleLanguages(
      lastUserMessage.content,
      request.language
    )

    if (filterResult.shouldBlock && filterResult.message) {
      const context: ChatLogContext = {
        userId: request.userId,
        sessionId: request.sessionId,
        userMessage: lastUserMessage.content,
        mode: request.mode,
        difficulty: request.difficulty,
        language: request.language
      }

      await logger.logChatError(new Error(filterResult.message || 'Content blocked'), context)

      return {
        shouldBlock: true,
        reason: filterResult.message
      }
    }

    return { shouldBlock: false }
  }

  /**
   * 處理流式響應和 MCP 工具集成
   */
  private async processStreamWithMCP(
    stream: ReadableStream<Uint8Array>,
    mode: string
  ): Promise<ReadableStream<Uint8Array>> {
    if (!this.config.enableMCP || !['solve', 'check'].includes(mode)) {
      return stream
    }

    try {
      return await processStreamWithLangChainMCP(stream, mode as 'solve' | 'check')
    } catch (error) {
      await logger.warn('MCP processing failed, continuing without tools', {
        component: 'chat-service',
        action: 'mcp_processing',
        error: error instanceof Error ? error.message : String(error),
        mode
      })
      return stream
    }
  }

  /**
   * 執行 Chat 請求
   */
  public async chat(request: ChatRequest, options: ChatOptions = {}): Promise<ChatResponse> {
    const startTime = Date.now()
    const context: ChatLogContext = {
      userId: request.userId,
      sessionId: request.sessionId,
      userMessage: this.getUserMessage(request),
      mode: request.mode,
      difficulty: request.difficulty,
      language: request.language,
      metadata: request.metadata
    }

    // 內容過濾
    const filterResult = await this.filterContent(request)
    if (filterResult.shouldBlock) {
      return {
        content: filterResult.reason || 'Content has been filtered.',
        metadata: {
          model: 'filtered',
          responseTime: Date.now() - startTime,
          contentFiltered: true
        }
      }
    }

    try {
      // 轉換為 LangChain 配置
      const langchainConfig = this.convertToLangChainConfig(request)

      // 使用 LangChain Chat 服務
      const chatResult = await langchainChat.chat(
        this.getUserMessage(request),
        langchainConfig,
        {
          systemPrompt: options.customInstructions,
          metadata: request.metadata,
          ...options
        }
      )

      return {
        content: chatResult.response,
        metadata: {
          model: langchainConfig.model,
          responseTime: chatResult.responseTime,
          tokensUsed: chatResult.metadata?.tokensUsed,
          toolCalls: chatResult.toolCalls?.length,
          provider: langchainConfig.provider,
          contentFiltered: false
        }
      }

    } catch (error) {
      await logger.logChatError(error as Error, {
        ...context,
        responseTime: Date.now() - startTime
      })

      throw error
    }
  }

  /**
   * 執行流式 Chat - 使用 API 端點以支持 MCP 處理
   */
  public async *chatStream(
    request: ChatRequest,
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const startTime = Date.now()
    const context: ChatLogContext = {
      userId: request.userId,
      sessionId: request.sessionId,
      userMessage: this.getUserMessage(request),
      mode: request.mode,
      difficulty: request.difficulty,
      language: request.language,
      metadata: request.metadata
    }

    // 內容過濾
    const filterResult = await this.filterContent(request)
    if (filterResult.shouldBlock) {
      yield filterResult.reason || 'Content has been filtered.'
      return
    }

    try {
      // 構建 API 請求體
      // 過濾掉已有的 system 消息，避免重複注入
      const userAndAssistantMessages = request.messages.filter(
        msg => msg.role !== 'system'
      )
      
      const requestBody = {
        messages: [
          {
            role: "system",
            content: buildMathPrompt({
              mode: request.mode,
              difficulty: request.difficulty,
              language: request.language
            })
          },
          ...userAndAssistantMessages
        ],
        mode: request.mode,
        difficulty: request.difficulty,
        language: request.language,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
        stream: true,
        userId: request.userId,
        sessionId: request.sessionId,
        customInstructions: options.customInstructions,
        metadata: request.metadata
      }

      // 調用流式 API 端點（包含 MCP 處理）
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

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
                const deltaContent = parsed.choices?.[0]?.delta?.content || parsed.content || ''

                if (deltaContent) {
                  yield deltaContent
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

      // 完成回調
      await logger.logChatResponse({
        ...context,
        responseTime: Date.now() - startTime
      })

    } catch (error) {
      await logger.logChatError(error as Error, {
        ...context,
        responseTime: Date.now() - startTime
      })

      yield `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
    }
  }

  /**
   * 使用現有 API 端點（向後兼容）
   */
  public async chatWithExistingAPI(
    request: ChatRequest,
    options: ChatOptions = {}
  ): Promise<ChatResponse | StreamChatResponse> {
    const startTime = Date.now()

    // 內容過濾
    const filterResult = await this.filterContent(request)
    if (filterResult.shouldBlock) {
      return {
        content: filterResult.reason || 'Content has been filtered.',
        metadata: {
          model: 'filtered',
          responseTime: Date.now() - startTime,
          contentFiltered: true,
          isStreaming: false
        }
      }
    }

    try {
      // 構建請求體
      // 過濾掉已有的 system 消息，避免重複注入
      const userAndAssistantMessages = request.messages.filter(
        msg => msg.role !== 'system'
      )
      
      const requestBody = {
        messages: [
          {
            role: "system",
            content: buildMathPrompt({
              mode: request.mode,
              difficulty: request.difficulty,
              language: request.language
            })
          },
          ...userAndAssistantMessages
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
        stream: request.streaming !== false
      }

      // 發送請求到現有 API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (request.streaming) {
        // 流式響應處理
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body reader available')
        }

        const decoder = new TextDecoder()
        let content = ''
        let isStreaming = true

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)

                if (data === '[DONE]') {
                  isStreaming = false
                  break
                }

                try {
                  const parsed = JSON.parse(data)
                  const deltaContent = parsed.choices?.[0]?.delta?.content || parsed.content || ''

                  if (deltaContent) {
                    content += deltaContent
                  }
                } catch (e) {
                  // 忽略解析錯誤
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        return {
          content,
          metadata: {
            model: 'existing-api',
            responseTime: Date.now() - startTime,
            tokensUsed: undefined, // 現在從響應中提取
            contentFiltered: false,
            isStreaming: false
          },
          isStreaming
        }

      } else {
        // 非流式響應
        const result = await response.json()
        return {
          content: result.content || result.text || '',
          metadata: {
            model: 'existing-api',
            responseTime: Date.now() - startTime,
            tokensUsed: result.usage?.total_tokens,
            contentFiltered: false
          }
        }
      }

    } catch (error) {
      await logger.logChatError(error as Error, {
        ...context,
        responseTime: Date.now() - startTime
      })

      throw error
    }
  }

  /**
   * 獲取用戶消息
   */
  private getUserMessage(request: ChatRequest): string {
    // 防禦性檢查：確保 messages 存在且為數組
    if (!request || !request.messages || !Array.isArray(request.messages)) {
      console.warn('ChatService.getUserMessage: request.messages is undefined or not an array', {
        request: request ? { mode: request.mode, difficulty: request.difficulty } : 'null'
      })
      return ''
    }
    
    const userMessages = request.messages.filter(msg => msg.role === 'user')
    return userMessages[userMessages.length - 1]?.content || ''
  }

  /**
   * 檢查服務狀態
   */
  public async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy'
    services: {
      langsmith: boolean
      mcp: boolean
      contentFilter: boolean
    }
  }> {
    const langsmithStatus = logger.getConfig().langSmith.enabled
    const mcpStatus = await this.checkMCPHealth()
    const filterStatus = this.config.contentFilterEnabled

    return {
      status: langsmithStatus && mcpStatus ? 'healthy' : 'unhealthy',
      services: {
        langsmith: langsmithStatus,
        mcp: mcpStatus,
        contentFilter: filterStatus
      }
    }
  }

  /**
   * 檢查 MCP 服務健康狀態
   */
  private async checkMCPHealth(): Promise<boolean> {
    if (!this.config.enableMCP) {
      return true // MCP 被禁用時視為健康
    }

    try {
      const response = await fetch(`${this.config.mcpServiceUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      })

      return response.ok
    } catch (error) {
      await logger.warn('MCP health check failed', {
        component: 'chat-service',
        action: 'health_check',
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  /**
   * 生成統計報告
   */
  public async generateStatsReport(): Promise<{
    totalChats: number
    averageResponseTime: number
    errorRate: number
    topModes: Record<string, number>
    topProviders: Record<string, number>
    services: any
  }> {
    // 這裡可以實現統計數據的收集和分析
    // 目前返回模擬數據
    return {
      totalChats: 0,
      averageResponseTime: 0,
      errorRate: 0,
      topModes: {},
      topProviders: {},
      services: await this.checkHealth()
    }
  }
}

// 導出單例實例
export const chatService = ChatService.getInstance()

// 導出類型
export type { ChatRequest, ChatResponse, ChatServiceConfig, StreamChatResponse }