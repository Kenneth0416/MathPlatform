// LangChain Auto-Tracing Implementation
// 使用 LangChain 原生组件实现自动追踪

import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages"
import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { CallbackManager } from "@langchain/core/callbacks/manager"
import { LangChainTracer } from "langchain/callbacks"
import { Client } from "langsmith"

// Custom LLM wrapper for POE API that's compatible with LangChain tracing
export class CustomChatModel extends BaseChatModel {
  lc_namespace = ["langchain", "chat_models", "custom"]

  lc_serializable = true

  private provider: string
  private apiKey: string
  private baseUrl: string
  private modelName: string

  constructor(config: {
    provider: string
    apiKey: string
    baseUrl: string
    modelName: string
  }) {
    super(config)
    this.provider = config.provider
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this.modelName = config.modelName
  }

  async _generate(
    messages: any[],
    options?: this["ParsedCallOptions"]
  ): Promise<any> {
    // 檢查是否使用代理路由
    const isProxy = this.baseUrl.includes('/api/poe')
    const url = isProxy ? this.baseUrl : `${this.baseUrl}/chat/completions`
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    
    // 代理路由不需要 Authorization header
    if (!isProxy) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.modelName,
        messages: messages.map(msg => ({
          role: msg._getType(),
          content: msg.content
        })),
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        stream: false,
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    return {
      generations: [{
        message: new AIMessage(content),
        text: content
      }]
    }
  }

  async *_stream(
    messages: any[],
    options?: this["ParsedCallOptions"]
  ): AsyncGenerator<any> {
    // 檢查是否使用代理路由
    const isProxy = this.baseUrl.includes('/api/poe')
    const url = isProxy ? this.baseUrl : `${this.baseUrl}/chat/completions`
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    
    // 代理路由不需要 Authorization header
    if (!isProxy) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.modelName,
        messages: messages.map(msg => ({
          role: msg._getType(),
          content: msg.content
        })),
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        stream: true,
      }),
    })

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.choices?.[0]?.delta?.content) {
              yield {
                generations: [{
                  text: data.choices[0].delta.content
                }]
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  _llmType(): string {
    return "custom_chat"
  }

  _modelType(): string {
    return "chat"
  }
}

// 创建 LangChain 兼容的模型实例
export function createLangChainModel() {
  // 优先使用 POE
  if (process.env.POE_API_KEY) {
    // 構建代理 URL - 在服務器端使用完整 URL
    const baseUrl = typeof window === 'undefined'
      ? (process.env.NEXT_PUBLIC_APP_URL || 
         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'))
      : window.location.origin
    const proxyUrl = `${baseUrl}/api/poe`
    
    return new CustomChatModel({
      provider: "poe",
      apiKey: "dummy-key", // 不需要真實 key，代理會處理
      baseUrl: proxyUrl,
      modelName: process.env.POE_BOT_NAME || "Claude-Sonnet-4.5"
    })
  }

  // 备用 DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    return new CustomChatModel({
      provider: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1",
      modelName: process.env.DEEPSEEK_MODEL || "deepseek-chat"
    })
  }

  // 如果有 OpenAI，使用标准的 OpenAI 集成
  if (process.env.OPENAI_API_KEY) {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL || "gpt-4",
      temperature: 0.7,
      maxTokens: 2000
    })
  }

  throw new Error("No AI provider configured")
}

// 自动追踪的聊天函数
export async function createTracedChat({
  messages,
  mode = "solve",
  difficulty = "High",
  language = "en",
  temperature = 0.7,
  max_tokens = 2000
}: {
  messages: Array<{ role: string; content: string }>
  mode?: string
  difficulty?: string
  language?: string
  temperature?: number
  max_tokens?: number
}) {
  try {
    // 创建 LangChain 模型实例
    const model = createLangChainModel()

    // 创建回调管理器，这会自动使用环境变量中的 LangSmith 配置
    const callbackManager = new CallbackManager()

    // 转换消息格式
    const langchainMessages = messages.map(msg => {
      if (msg.role === "system") {
        return new SystemMessage(msg.content)
      } else if (msg.role === "user") {
        return new HumanMessage(msg.content)
      } else if (msg.role === "assistant") {
        return new AIMessage(msg.content)
      }
      return new HumanMessage(msg.content)
    })

    // 调用模型，LangChain 会自动创建追踪
    const response = await model.invoke(langchainMessages, {
      temperature,
      max_tokens,
      callbacks: callbackManager.handlers,
      tags: [`mode:${mode}`, `difficulty:${difficulty}`, `language:${language}`],
      metadata: {
        mode,
        difficulty,
        language,
        provider: "langchain_auto_tracing"
      }
    })

    console.log(`✅ LangChain auto-tracing completed for ${mode} mode`)
    return response

  } catch (error) {
    console.error("❌ LangChain auto-tracing failed:", error)
    throw error
  }
}

// 流式自动追踪版本
export async function createTracedChatStream({
  messages,
  mode = "solve",
  difficulty = "High",
  language = "en",
  temperature = 0.7,
  max_tokens = 2000
}: {
  messages: Array<{ role: string; content: string }>
  mode?: string
  difficulty?: string
  language?: string
  temperature?: number
  max_tokens?: number
}) {
  try {
    // 创建 LangChain 模型实例
    const model = createLangChainModel()

    // 创建回调管理器
    const callbackManager = new CallbackManager()

    // 转换消息格式
    const langchainMessages = messages.map(msg => {
      if (msg.role === "system") {
        return new SystemMessage(msg.content)
      } else if (msg.role === "user") {
        return new HumanMessage(msg.content)
      } else if (msg.role === "assistant") {
        return new AIMessage(msg.content)
      }
      return new HumanMessage(msg.content)
    })

    // 调用流式模型，LangChain 会自动创建追踪
    const langchainStream = await model.stream(langchainMessages, {
      temperature,
      max_tokens,
      callbacks: callbackManager.handlers,
      tags: [`mode:${mode}`, `difficulty:${difficulty}`, `language:${language}`, "streaming"],
      metadata: {
        mode,
        difficulty,
        language,
        provider: "langchain_auto_tracing_stream"
      }
    })

    console.log(`✅ LangChain auto-tracing stream started for ${mode} mode`)

    // 将 LangChain 流转换为 SSE 格式的 ReadableStream
    const encoder = new TextEncoder()
    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of langchainStream) {
            // LangChain 流返回的是 { generations: [{ text: "..." }] } 格式
            let content = ''

            if (chunk && chunk.generations && chunk.generations.length > 0) {
              content = chunk.generations[0].text || ''
            } else if (chunk && typeof chunk === 'object' && 'content' in chunk) {
              content = chunk.content || ''
            } else if (chunk && typeof chunk === 'object' && 'text' in chunk) {
              content = chunk.text || ''
            } else if (typeof chunk === 'string') {
              content = chunk
            }

            if (content) {
              // 格式化为 SSE 格式
              const sseData = `data: ${JSON.stringify({
                choices: [{
                  delta: {
                    content: content
                  }
                }]
              })}\n\n`

              controller.enqueue(encoder.encode(sseData))
            }
          }

          // 发送结束标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

        } catch (error) {
          console.error('Error in LangChain stream conversion:', error)
          controller.error(error)
        }
      }
    })

    return sseStream

  } catch (error) {
    console.error("❌ LangChain auto-tracing stream failed:", error)
    throw error
  }
}

// 测试自动追踪的便捷函数
export async function testLangSmithAutoTracing() {
  console.log("🧪 Testing LangSmith auto-tracing...")

  try {
    // 测试1: 简单聊天
    await createTracedChat({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What is 2 + 2?" }
      ],
      mode: "test",
      difficulty: "easy"
    })

    // 测试2: 数学问题
    await createTracedChat({
      messages: [
        { role: "system", content: "You are a math tutor." },
        { role: "user", content: "Solve: x + 3 = 10" }
      ],
      mode: "solve",
      difficulty: "middle"
    })

    console.log("✅ LangSmith auto-tracing test completed successfully!")
    console.log("📊 Check your LangSmith dashboard for traces")

  } catch (error) {
    console.error("❌ LangSmith auto-tracing test failed:", error)
  }
}