// 標準穩定的 LangSmith 配置
// 使用官方推薦的最佳實踐

import { Client as LangSmithClient } from "langsmith"

// 全局 LangSmith 客戶端
let langsmithClient: LangSmithClient | null = null

// 標準的 LangSmith 環境變量
const LANGSMITH_CONFIG = {
  apiKey: process.env.LANGCHAIN_API_KEY,
  endpoint: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
  project: process.env.LANGCHAIN_PROJECT || "dse-math-tutoring",
  tracing: process.env.LANGCHAIN_TRACING_V2 === "true"
}

/**
 * 初始化 LangSmith 客戶端 - 使用標準方法
 */
export function initializeLangSmith(): LangSmithClient | null {
  if (langsmithClient) {
    return langsmithClient
  }

  // 檢查必要環境變量
  if (!LANGSMITH_CONFIG.apiKey) {
    console.warn("⚠️ LANGCHAIN_API_KEY not found. LangSmith tracking disabled.")
    return null
  }

  if (!LANGSMITH_CONFIG.tracing) {
    console.log("ℹ️ LANGCHAIN_TRACING_V2 is not enabled. LangSmith tracking disabled.")
    return null
  }

  try {
    // 使用標準的 LangSmith 客戶端初始化
    langsmithClient = new LangSmithClient({
      apiUrl: LANGSMITH_CONFIG.endpoint,
      apiKey: LANGSMITH_CONFIG.apiKey,
    })

    console.log(`✅ LangSmith client initialized for project: ${LANGSMITH_CONFIG.project}`)
    return langsmithClient

  } catch (error) {
    console.error("❌ Failed to initialize LangSmith client:", error)
    return null
  }
}

/**
 * 獲取 LangSmith 客戶端
 */
export function getLangSmithClient(): LangSmithClient | null {
  return langsmithClient || initializeLangSmith()
}

/**
 * 標準的 Run 創建函數
 */
export async function createLangSmithRun(params: {
  name: string
  inputs: Record<string, any>
  outputs?: Record<string, any>
  tags?: string[]
  metadata?: Record<string, any>
  runType?: "chain" | "llm" | "tool" | "retriever"
}): Promise<string> {
  const client = getLangSmithClient()
  if (!client) {
    console.warn("⚠️ LangSmith client not available, skipping run creation")
    return ""
  }

  try {
    const { v4: uuidv4 } = await import("uuid")
    const runId = uuidv4()

    // 使用標準的 createRun 方法
    await client.createRun({
      id: runId,
      name: params.name,
      run_type: params.runType || "chain",
      inputs: params.inputs,
      outputs: params.outputs,
      tags: params.tags || [],
      extra: {
        metadata: {
          ...params.metadata,
          project: LANGSMITH_CONFIG.project,
          timestamp: new Date().toISOString()
        }
      },
      start_time: Date.now(),
      end_time: params.outputs ? Date.now() : undefined
    })

    console.log(`✅ LangSmith run created: ${params.name} (${runId})`)
    return runId

  } catch (error) {
    console.error(`❌ Failed to create LangSmith run: ${params.name}`, error)
    return ""
  }
}

/**
 * 追踪 Chat 交互 - 標準方法
 */
export async function traceChatInteraction(params: {
  userMessage: string
  aiResponse: string
  metadata: {
    mode: string
    difficulty: string
    language: string
    provider?: string
    responseTime?: number
    tokensUsed?: number
    success?: boolean
  }
}): Promise<void> {
  const client = getLangSmithClient()
  if (!client) {
    return // 靜默失敗，不影響主要功能
  }

  try {
    const runId = await createLangSmithRun({
      name: `Math Chat - ${params.metadata.mode}`,
      inputs: {
        user_message: params.userMessage,
        mode: params.metadata.mode,
        difficulty: params.metadata.difficulty,
        language: params.metadata.language,
        timestamp: new Date().toISOString()
      },
      outputs: {
        ai_response: params.aiResponse.substring(0, 1000), // 限制長度
        provider: params.metadata.provider,
        response_time_ms: params.metadata.responseTime,
        tokens_used: params.metadata.tokensUsed,
        success: params.metadata.success,
        completed_at: new Date().toISOString()
      },
      tags: [
        "math_chat",
        `mode:${params.metadata.mode}`,
        `difficulty:${params.metadata.difficulty}`,
        `language:${params.metadata.language}`,
        params.metadata.provider ? `provider:${params.metadata.provider}` : "",
        params.metadata.success ? "success:true" : "success:false"
      ].filter(Boolean),
      metadata: {
        application: "dse-math-tutoring",
        interaction_type: "chat",
        message_length: params.userMessage.length,
        response_length: params.aiResponse.length,
        ...params.metadata
      },
      runType: "chain"
    })

    if (runId) {
      console.log(`✅ Chat interaction traced: ${runId}`)
    }

  } catch (error) {
    console.error("❌ Failed to trace chat interaction:", error)
  }
}

/**
 * 追踪 AI 提供商性能 - 標準方法
 */
export async function traceProviderPerformance(params: {
  provider: string
  responseTime: number
  tokensUsed: number
  success: boolean
  error?: string
}): Promise<void> {
  const client = getLangSmithClient()
  if (!client) {
    return
  }

  try {
    const runId = await createLangSmithRun({
      name: `AI Provider Performance - ${params.provider}`,
      inputs: {
        provider: params.provider,
        timestamp: new Date().toISOString()
      },
      outputs: {
        response_time_ms: params.responseTime,
        tokens_used: params.tokensUsed,
        success: params.success,
        error: params.error
      },
      tags: [
        "provider_performance",
        `provider:${params.provider}`,
        params.success ? "success:true" : "success:false"
      ],
      metadata: {
        application: "dse-math-tutoring",
        module: "ai_api_manager",
        performance_metrics: true
      },
      runType: "chain"
    })

    if (runId) {
      console.log(`✅ Provider performance traced: ${params.provider} (${runId})`)
    }

  } catch (error) {
    console.error(`❌ Failed to trace provider performance: ${params.provider}`, error)
  }
}

/**
 * 檢查 LangSmith 是否可用
 */
export function isLangSmithEnabled(): boolean {
  return !!(
    LANGSMITH_CONFIG.apiKey &&
    LANGSMITH_CONFIG.tracing &&
    langsmithClient !== null
  )
}

/**
 * 自動初始化
 */
export function autoInitializeLangSmith(): LangSmithClient | null {
  if (!LANGSMITH_CONFIG.apiKey || !LANGSMITH_CONFIG.tracing) {
    console.log("ℹ️ LangSmith tracking is disabled (missing API key or tracing)")
    return null
  }

  return initializeLangSmith()
}

// 導出配置
export { LANGSMITH_CONFIG }

// 在模塊加載時自動初始化
if (typeof window === "undefined") {
  // 只在服務器端初始化
  autoInitializeLangSmith()
}