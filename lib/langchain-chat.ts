/**
 * 標準化 LangChain Chat 系統
 * 提供可重用的 Chat Chain 組件，支援數學工具集成和 LangSmith 追蹤
 */

import {
  ChatOpenAI,
  BaseLanguageModel,
  HumanMessage,
  AIMessage,
  SystemMessage
} from "@langchain/openai"
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate
} from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { Runnable, RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables"
import { RunnableWithMessageHistory } from "@langchain/core/runnables"
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history"
import { BaseCallbackHandler } from "@langchain/core/callbacks/base"
import { logger, ChatLogContext } from "./logger"
import { buildMathPrompt, PromptConfig } from "./prompts/math-prompts"

// Chat 配置接口
export interface ChatConfig {
  model: string
  temperature?: number
  maxTokens?: number
  provider: 'openai' | 'anthropic' | 'poe' | 'deepseek'
  streaming?: boolean
  mode: 'solve' | 'tutor' | 'practice' | 'check'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
  userId?: string
  sessionId?: string
}

// Chat 選項接口
export interface ChatOptions {
  systemPrompt?: string
  useHistory?: boolean
  customInstructions?: string
  metadata?: Record<string, any>
}

// Chat 結果接口
export interface ChatResult {
  response: string
  responseTime: number
  tokensUsed?: number
  metadata?: Record<string, any>
  toolCalls?: any[]
}

// Chat 追蹤回調處理器
class ChatCallbackHandler extends BaseCallbackHandler {
  private startTime: number
  private context: ChatLogContext
  private onToolCall?: (tool: string, input: any, output: any, duration: number) => void

  constructor(context: ChatLogContext, onToolCall?: (tool: string, input: any, output: any, duration: number) => void) {
    super()
    this.startTime = Date.now()
    this.context = context
    this.onToolCall = onToolCall
  }

  async handleChainStart(inputs: any, runId: string) {
    await logger.logChatStart(this.context)
  }

  async handleLLMStart(outputs: string[], runId: string) {
    // LLM 開始執行
  }

  async handleLLMEnd(outputs: any, runId: string) {
    // LLM 執行完成
  }

  async handleToolStart(tool: string, input: any, runId: string) {
    // 工具開始執行
  }

  async handleToolEnd(tool: string, output: any, runId: string) {
    const duration = Date.now() - this.startTime
    await this.onToolCall?.(tool, input, output, duration)
    await logger.logMCPCall(tool, input, output, duration, {
      component: 'langchain',
      action: 'tool_completion',
      ...this.context
    })
  }

  async handleChainEnd(outputs: any, runId: string) {
    const responseTime = Date.now() - this.startTime
    const response = typeof outputs?.text === 'string' ? outputs.text : JSON.stringify(outputs)

    await logger.logChatResponse({
      ...this.context,
      aiResponse: response,
      responseTime
    })
  }

  async handleChainError(error: Error, runId: string) {
    const responseTime = Date.now() - this.startTime
    await logger.logChatError(error, {
      ...this.context,
      responseTime
    })
  }
}

/**
 * 數學提示模板生成器
 */
class MathPromptGenerator {
  static generateSystemPrompt(config: ChatConfig, customInstructions?: string): string {
    // 使用完整的提示詞系統
    const promptConfig: PromptConfig = {
      mode: config.mode,
      difficulty: config.difficulty,
      language: config.language
    }

    // 獲取完整的數學提示詞
    const basePrompt = buildMathPrompt(promptConfig)

    // 如果有自定義指示，添加到提示詞末尾
    return customInstructions ? `${basePrompt}\n\n${customInstructions}` : basePrompt
  }
}

/**
 * LangChain Chat 服務類
 */
export class LangChainChatService {
  private models: Record<string, BaseLanguageModel>
  private promptTemplates: Record<string, ChatPromptTemplate>
  private defaultMessageHistory: InMemoryChatMessageHistory

  constructor() {
    this.promptTemplates = {}
    this.initializeModels()
    this.initializePromptTemplates()
    this.defaultMessageHistory = new InMemoryChatMessageHistory()
  }

  /**
   * 初始化語言模型
   */
  private initializeModels(): void {
    this.models = {}

    // OpenAI GPT-4 (如果配置了 API Key)
    if (process.env.OPENAI_API_KEY) {
      this.models['gpt-4'] = new ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        streaming: true,
        openAIApiKey: process.env.OPENAI_API_KEY,
      })
    }

    // POE Claude (使用 OpenAI 兼容格式)
    // 使用 Next.js 代理路由避免 CORS 問題
    if (process.env.POE_API_KEY) {
      // 構建代理 URL - 在服務器端使用完整 URL
      const baseUrl = typeof window === 'undefined'
        ? (process.env.NEXT_PUBLIC_APP_URL || 
           (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'))
        : window.location.origin
      const proxyUrl = `${baseUrl}/api/poe`
      
      this.models['poe-claude'] = new ChatOpenAI({
        modelName: process.env.POE_BOT_NAME || 'Claude-Sonnet-4.5',
        temperature: 0.7,
        maxTokens: 2000,
        streaming: true,
        // 不需要 API key，因為代理會處理
        apiKey: 'dummy-key', // LangChain 需要一個值，但代理會忽略它
        configuration: {
          baseURL: proxyUrl,
        }
      })
    }

    // DeepSeek (使用 OpenAI 兼容格式)
    if (process.env.DEEPSEEK_API_KEY) {
      this.models['deepseek'] = new ChatOpenAI({
        modelName: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 2000,
        streaming: true,
        apiKey: process.env.DEEPSEEK_API_KEY,
        configuration: {
          baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
        }
      })
    }

    // Anthropic Claude (如果配置了 OpenAI API Key)
    if (process.env.OPENAI_API_KEY) {
      this.models['claude-3.5-sonnet'] = new ChatOpenAI({
        modelName: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 2000,
        streaming: true,
        openAIApiKey: process.env.OPENAI_API_KEY,
      })
    }
  }

  /**
   * 初始化提示模板
   */
  private initializePromptTemplates(): void {
    // 基礎 Chat 模板
    this.promptTemplates.basic = ChatPromptTemplate.fromMessages([
      ["system", "{system_prompt}"],
      ["human", "{input}"],
    ])

    // 數學專用模板
    this.promptTemplates.math = ChatPromptTemplate.fromMessages([
      ["system", "{system_prompt}"],
      ["human", "{input}"],
    ])
  }

  /**
   * 創建聊天鏈
   */
  private createChatChain(
    model: BaseLanguageModel,
    promptTemplate: ChatPromptTemplate,
    options: ChatOptions = {}
  ): Runnable<any, any> {
    const chain = promptTemplate.pipe(model)

    // 添加歷史記錄（如果啟用）
    if (options.useHistory) {
      return chain.withConfigurable({
        configurable: ["messages", "chat_history"],
        messages: (input: any) => input.messages,
        chat_history: new RunnablePassthrough()
      })
    }

    return chain
  }

  /**
   * 選擇合適的模型
   */
  private selectModel(config: ChatConfig): BaseLanguageModel {
    // 根據配置的 provider 和 model 選擇
    if (config.provider === 'openai' && config.model.startsWith('gpt-') && process.env.OPENAI_API_KEY) {
      return this.models['gpt-4']
    }

    if (config.provider === 'anthropic' && config.model.includes('claude')) {
      // 如果沒有真正的 Anthropic API key，嘗試使用 POE Claude
      if (this.models['claude-3.5-sonnet']) {
        return this.models['claude-3.5-sonnet']
      } else {
        return this.models['poe-claude']
      }
    }

    if (config.provider === 'poe') {
      return this.models['poe-claude']
    }

    if (config.provider === 'deepseek') {
      return this.models['deepseek']
    }

    // 添加模型存在性檢查和錯誤處理
    const selectedModel = this.models[config.provider === 'poe' ? 'poe-claude' :
                              config.provider === 'anthropic' ? 'claude-3.5-sonnet' :
                              config.provider === 'deepseek' ? 'deepseek' :
                              config.provider === 'openai' ? 'gpt-4' : 'gpt-4']

    if (!selectedModel) {
      console.error(`[LangChain Chat] Model not found for provider: ${config.provider}, model: ${config.model}`)
      console.error(`[LangChain Chat] Available models:`, Object.keys(this.models))
      throw new Error(`Model not initialized for provider: ${config.provider}`)
    }

    // 如果沒有配置 OpenAI 但默認是 gpt-4，嘗試使用 POE
    if (!process.env.OPENAI_API_KEY && config.provider === 'openai') {
      return this.models['poe-claude']
    }

    // 返回選中的模型
    return selectedModel
  }

  /**
   * 執行聊天
   */
  async chat(
    input: string,
    config: ChatConfig,
    options: ChatOptions = {}
  ): Promise<ChatResult> {
    const startTime = Date.now()
    const context: ChatLogContext = {
      userId: config.userId,
      sessionId: config.sessionId,
      userMessage: input,
      mode: config.mode,
      difficulty: config.difficulty,
      language: config.language,
      provider: config.provider,
      metadata: options.metadata
    }

    try {
      // 選擇模型和模板
      const model = this.selectModel(config)
      const systemPrompt = MathPromptGenerator.generateSystemPrompt(config, options.systemPrompt)

      const promptTemplate = this.promptTemplates.math
      const chain = this.createChatChain(model, promptTemplate, options)

      // 創建回調處理器
      const callbacks = [
        new ChatCallbackHandler(context, undefined)
      ]

      // 創建輸入
      const chainInput = {
        system_prompt: systemPrompt,
        input: input
      }

      // 執行鏈
      const result = await chain.invoke(chainInput, {
        callbacks
      })

      // 計算響應時間
      const responseTime = Date.now() - startTime

      // 格式化結果
      const response = typeof result === 'string' ? result : result.content || result.text || ''

      return {
        response,
        responseTime,
        metadata: {
          config,
          options,
          timestamp: new Date().toISOString()
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
   * 流式聊天
   */
  async *chatStream(
    input: string,
    config: ChatConfig,
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const startTime = Date.now()
    const context: ChatLogContext = {
      userId: config.userId,
      sessionId: config.sessionId,
      userMessage: input,
      mode: config.mode,
      difficulty: config.difficulty,
      language: config.language,
      provider: config.provider,
      metadata: options.metadata
    }

    try {
      const model = this.selectModel(config)
      const systemPrompt = MathPromptGenerator.generateSystemPrompt(config, options.systemPrompt)

      const promptTemplate = this.promptTemplates.math

      // 創建流式鏈
      const streamChain = promptTemplate.pipe(model)

      // 創建輸入
      const chainInput = {
        system_prompt: systemPrompt,
        input: input
      }

      // 流式執行
      const stream = await streamChain.stream(chainInput)

      for await (const chunk of stream) {
        const content = chunk.content || chunk
        if (typeof content === 'string') {
          yield content
        }
      }

      // 完成回調
      const responseTime = Date.now() - startTime
      await logger.logChatResponse({
        ...context,
        responseTime
      })

    } catch (error) {
      await logger.logChatError(error as Error, {
        ...context,
        responseTime: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * 獲取服務狀態
   */
  getStatus() {
    return {
      availableModels: Object.keys(this.models),
      langSmithEnabled: logger.getConfig().langSmith.enabled
    }
  }
}

// 導出實例
export const langchainChat = new LangChainChatService()

// 導出類型
export type { ChatConfig, ChatOptions, ChatResult, ChatLogContext }