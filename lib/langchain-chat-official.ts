// 使用 LangChain 官方實現的聊天服務
// 通過環境變量自動獲得 LangSmith 追蹤支持

import { ChatOpenAI } from "@langchain/openai"
import { buildMathPrompt, PromptConfig } from "./prompts/math-prompts"

export interface OfficialChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  mode: 'solve' | 'tutor' | 'practice' | 'check'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
  temperature?: number
  maxTokens?: number
}

export interface OfficialChatResponse {
  text: string
  provider: string
  model: string
  tokensUsed?: number
  responseTime: number
}

export class OfficialLangChainChatService {
  private model: ChatOpenAI | null = null

  constructor() {
    this.initializeModel()
  }

  private initializeModel() {
    // 優先使用 OpenAI，如果沒有則使用 DeepSeek
    if (process.env.OPENAI_API_KEY) {
      this.model = new ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        openAIApiKey: process.env.OPENAI_API_KEY,
      })
      console.log('✅ Initialized OpenAI GPT-4 model')
    } else if (process.env.DEEPSEEK_API_KEY) {
      this.model = new ChatOpenAI({
        modelName: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 2000,
        openAIApiKey: process.env.DEEPSEEK_API_KEY,
        configuration: {
          baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
        },
      })
      console.log('✅ Initialized DeepSeek model')
    } else {
      console.warn('⚠️ No AI API keys configured')
    }
  }

  async chat(request: OfficialChatRequest): Promise<OfficialChatResponse> {
    if (!this.model) {
      throw new Error('No AI model configured')
    }

    const startTime = Date.now()

    try {
      // 構建系統提示詞
      const promptConfig: PromptConfig = {
        mode: request.mode,
        difficulty: request.difficulty,
        language: request.language
      }
      const systemPrompt = buildMathPrompt(promptConfig)

      // 過濾掉已有的 system 消息，避免重複注入
      const userAndAssistantMessages = request.messages.filter(
        msg => msg.role !== 'system'
      )

      // 準備消息
      const messages = [
        { role: 'system', content: systemPrompt },
        ...userAndAssistantMessages
      ]

      // 執行調用 - LangSmith 會自動追蹤（通過環境變量）
      const result = await this.model.invoke(messages, {
        tags: [
          'math-chat',
          `mode:${request.mode}`,
          `difficulty:${request.difficulty}`,
          `language:${request.language}`
        ],
        metadata: {
          application: 'dse-math-tutoring',
          endpoint: '/api/chat',
          streaming: false,
          messageCount: request.messages.length
        }
      })

      const responseTime = Date.now() - startTime

      return {
        text: result.content as string,
        provider: this.model.modelName.includes('gpt') ? 'openai' : 'deepseek',
        model: this.model.modelName,
        responseTime,
        tokensUsed: 0 // LangSmith 會自動追蹤使用情況
      }

    } catch (error) {
      console.error('Official LangChain chat error:', error)
      throw error
    }
  }

  isReady(): boolean {
    return this.model !== null
  }

  getModelName(): string {
    return this.model?.modelName || 'unknown'
  }
}

// 全局實例
export const officialLangChainChat = new OfficialLangChainChatService()
