// POE API 服務層
// 處理與 POE API 的所有交互

export interface POEMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface POERequest {
  messages: POEMessage[]
  bot: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface POEResponse {
  text: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  error?: string
}

export interface POEConfig {
  apiKey: string
  baseUrl: string
  defaultBot: string
  timeout?: number
  retries?: number
}

class POEAPIClient {
  private config: POEConfig

  constructor(config: POEConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config,
    }
  }

  async sendMessage(request: POERequest): Promise<POEResponse | ReadableStream<Uint8Array>> {
    // POE API 的正確端點 - 使用 OpenAI 兼容格式
    const url = `${this.config.baseUrl}/chat/completions`
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    }

    // 完全按照 POE API 標準格式
    const body = {
      model: request.bot || this.config.defaultBot,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens || 2000,
      stream: request.stream || false,
    }

    try {
      console.log('Sending POE API request to:', url)
      console.log('Request body:', JSON.stringify(body, null, 2))
      
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      console.log('POE API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('POE API Error Response:', errorData)
        throw new Error(
          `POE API Error: ${response.status} - ${errorData.message || response.statusText}`
        )
      }

      // 如果是流式請求，直接返回 response.body
      if (request.stream) {
        return response.body!
      }

      const data = await response.json()
      console.log('POE API Success Response:', data)
      
      // 解析響應，支持不同的響應格式
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
      console.error('POE API Error:', error)
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async sendStreamMessage(request: POERequest): Promise<ReadableStream<Uint8Array> | null> {
    const url = `${this.config.baseUrl}/chat/stream`
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    }

    const body = {
      messages: request.messages,
      bot: request.bot || this.config.defaultBot,
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens || 2000,
      stream: true,
    }

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`POE API Error: ${response.status} - ${response.statusText}`)
      }

      return response.body
    } catch (error) {
      console.error('POE Stream API Error:', error)
      return null
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

  // 重試邏輯
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = this.config.retries || 3
  ): Promise<T> {
    try {
      return await requestFn()
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying request, ${retries} attempts left`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待 1 秒
        return this.retryRequest(requestFn, retries - 1)
      }
      throw error
    }
  }
}

// 創建 POE API 客戶端實例
export function createPOEClient(): POEAPIClient {
  const config: POEConfig = {
    apiKey: process.env.POE_API_KEY || '',
    baseUrl: process.env.POE_API_URL || 'https://api.poe.com/v1',
    defaultBot: process.env.POE_BOT_NAME || 'Claude-Sonnet-4.5',
  }

  // 在構建時不檢查 API 密鑰，只在運行時檢查
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !config.apiKey) {
    console.warn('POE_API_KEY is not set. API calls will fail.')
  }

  return new POEAPIClient(config)
}

// 導出默認實例
export const poeClient = createPOEClient()
