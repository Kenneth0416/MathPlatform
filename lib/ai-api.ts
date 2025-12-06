// AI API 服務層
// 支持多個 API 提供商，自動切換備用方案
// 使用 LangChain 自動 tracing（通過環境變量配置）

// 注意：LangSmith tracing 通過環境變量自動啟用
// LANGCHAIN_TRACING_V2=true
// LANGCHAIN_API_KEY=xxx
// LANGCHAIN_PROJECT=dse-math-tutoring

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

export interface AIRequest {
  messages: AIMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  callbacks?: any[] // LangChain 回調
}

export interface AIResponse {
  text: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  error?: string
  provider?: string
  model?: string
  tokensUsed?: number
  responseTime?: number
}

export interface APIConfig {
  apiKey: string
  baseUrl: string
  defaultModel: string
  provider: 'openai' | 'deepseek' | 'poe'
  timeout?: number
}

// 通用 OpenAI 兼容 API 客戶端
class OpenAICompatibleClient {
  private config: APIConfig

  constructor(config: APIConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    }
  }

  async sendMessage(request: AIRequest): Promise<AIResponse | ReadableStream<Uint8Array>> {
    // For Poe API, use the Next.js proxy route to avoid CORS and keep API key secure
    const isPoeProvider = this.config.provider === 'poe'
    
    // Construct the proxy URL - handle both server-side and client-side calls
    let url: string
    if (isPoeProvider) {
      // On server-side, we need the full URL. Use environment variable or default to localhost
      if (typeof window === 'undefined') {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
        url = `${baseUrl}/api/poe`
      } else {
        // Client-side: use relative URL
        url = '/api/poe'
      }
    } else {
      url = `${this.config.baseUrl}/chat/completions`
    }
    
    let responseTime = 0
    
    // Don't include Authorization header for Poe since it's handled by the proxy
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (!isPoeProvider) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const body = {
      model: request.model || this.config.defaultModel,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens || 2000,
      stream: request.stream || false,
    }

    try {
      console.log(`[${this.config.provider.toUpperCase()}] Sending API request to:`, url)
      console.log(`[${this.config.provider.toUpperCase()}] Request body:`, JSON.stringify(body, null, 2))
      
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      console.log(`[${this.config.provider.toUpperCase()}] API response status:`, response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`[${this.config.provider.toUpperCase()}] Error Response:`, errorData)
        throw new Error(
          `${this.config.provider.toUpperCase()} API Error: ${response.status} - ${errorData.message || response.statusText}`
        )
      }

      // 如果是流式請求，直接返回 response.body
      if (request.stream) {
        return response.body!
      }

      const data = await response.json()
      console.log(`[${this.config.provider.toUpperCase()}] Success Response`)
      
      // 解析響應
      const text = data.choices?.[0]?.message?.content || 
                   data.text || 
                   data.content || 
                   data.message?.content || 
                   ''
      
      return {
        text: text,
        usage: data.usage,
      }
    } catch (error) {
      console.error(`[${this.config.provider.toUpperCase()}] API Error:`, error)
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}

// 主 AI API 管理器，支持多個提供商和自動切換
export class AIAPIManager {
  private clients: Map<string, OpenAICompatibleClient> = new Map()
  private primaryProvider: string = ''
  private providers: string[] = []

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    const providers: APIConfig[] = []

    console.log('[AI API Manager] Checking environment variables...')
    console.log('[AI API Manager] POE_API_KEY exists:', !!process.env.POE_API_KEY)
    console.log('[AI API Manager] DEEPSEEK_API_KEY exists:', !!process.env.DEEPSEEK_API_KEY)
    console.log('[AI API Manager] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)

    // POE API (第一優先)
    if (process.env.POE_API_KEY) {
      providers.push({
        apiKey: process.env.POE_API_KEY,
        baseUrl: process.env.POE_API_URL || 'https://api.poe.com/v1',
        defaultModel: process.env.POE_BOT_NAME || 'Claude-Sonnet-4.5',
        provider: 'poe',
      })
      console.log('[AI API Manager] Added POE API provider')
    }

    // DeepSeek (第二優先，備用)
    if (process.env.DEEPSEEK_API_KEY) {
      providers.push({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
        defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        provider: 'deepseek',
      })
      console.log('[AI API Manager] Added DeepSeek API provider')
    }

    // OpenAI (第三優先，可選)
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4',
        provider: 'openai',
      })
      console.log('[AI API Manager] Added OpenAI API provider')
    }

    // 創建客戶端
    for (const config of providers) {
      const client = new OpenAICompatibleClient(config)
      this.clients.set(config.provider, client)
      this.providers.push(config.provider)
    }

    // 設置首選提供商
    this.primaryProvider = this.providers[0] || ''
    
    console.log(`[AI API Manager] Initialized with providers: ${this.providers.join(', ')}`)
    console.log(`[AI API Manager] Primary provider: ${this.primaryProvider}`)
  }

  async sendMessage(request: AIRequest): Promise<AIResponse | ReadableStream<Uint8Array>> {
    if (this.providers.length === 0) {
      throw new Error('No AI providers configured. Please set API keys in environment variables.')
    }

    let lastError: Error | null = null
    const startTime = Date.now()
    let responseTime = 0

    // 嘗試所有可用的提供商
    for (const provider of this.providers) {
      const client = this.clients.get(provider)
      if (!client) continue

      try {
        console.log(`[AI API Manager] Trying provider: ${provider}`)
        const result = await client.sendMessage(request)

        // 檢查是否為錯誤響應
        if (typeof result === 'object' && 'error' in result && result.error) {
          throw new Error(result.error)
        }

        // 計算響應時間並追踪性能
        responseTime = Date.now() - startTime
        const tokensUsed = (typeof result === 'object' && result.usage?.total_tokens) ? result.usage.total_tokens : 0

        // 注意：LangSmith tracing 通過環境變量自動啟用
        // 不需要手動調用 traceProviderPerformance
        console.log(`📊 Provider performance: ${provider}, ${responseTime}ms, ${tokensUsed} tokens`)

        // 為響應添加提供商信息
        if (typeof result === 'object') {
          result.provider = provider
          result.model = this.getClientModel(provider)
          result.tokensUsed = tokensUsed
          result.responseTime = responseTime
        }

        console.log(`[AI API Manager] Success with provider: ${provider}`)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const errorTime = Date.now() - startTime
        console.error(`[AI API Manager] Provider ${provider} failed:`, lastError.message)

        // 注意：LangSmith tracing 通過環境變量自動啟用
        // 錯誤也會被自動追踪
        console.log(`❌ Provider error: ${provider}, ${errorTime}ms, ${lastError.message}`)

        // 如果這不是最後一個提供商，繼續嘗試下一個
        if (provider !== this.providers[this.providers.length - 1]) {
          console.log(`[AI API Manager] Switching to next provider...`)
          continue
        }
      }
    }

    // 所有提供商都失敗了
    console.error('[AI API Manager] All providers failed')
    throw lastError || new Error('All AI providers failed')
  }

  getAvailableProviders(): string[] {
    return [...this.providers]
  }

  getPrimaryProvider(): string {
    return this.primaryProvider
  }

  private getClientModel(provider: string): string {
    switch (provider) {
      case 'poe':
        return process.env.POE_BOT_NAME || 'Claude-Sonnet-4.5'
      case 'deepseek':
        return process.env.DEEPSEEK_MODEL || 'deepseek-chat'
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4'
      default:
        return 'unknown'
    }
  }
}

// 懶加載全局實例
let aiAPIManagerInstance: AIAPIManager | null = null

export function getAIAPIManager(): AIAPIManager {
  if (!aiAPIManagerInstance) {
    aiAPIManagerInstance = new AIAPIManager()
  }
  return aiAPIManagerInstance
}

// 導出實例（向後兼容）
export const aiAPIManager = getAIAPIManager()

// 導出便捷函數（向後兼容）
export const poeClient = {
  sendMessage: async (request: any) => {
    return getAIAPIManager().sendMessage(request)
  }
}

// 導出類型（向後兼容）
export type POEMessage = AIMessage
export type POERequest = AIRequest
export type POEResponse = AIResponse
export type POEConfig = APIConfig

