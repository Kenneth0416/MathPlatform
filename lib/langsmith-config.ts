// LangSmith 配置和追踪模块
// 为DSE数学学习平台提供监控和分析功能

import { Client, Run } from "langsmith"
import { initializeLangSmith as initStandard, createLangSmithRun, traceChatInteraction as traceChatStandard, traceProviderPerformance as tracePerformanceStandard } from "./langsmith-standard"

// LangSmith 客户端实例
let langsmithClient: Client | null = null

// 初始化 LangSmith 客户端
export function initializeLangSmith(): Client | null {
  // 使用標準的初始化方法
  const standardClient = initStandard()
  if (!standardClient) {
    return null
  }

  // 保持向後兼容性
  langsmithClient = standardClient as any
  console.log('✅ LangSmith client initialized (standard method)')
  return langsmithClient
}

// 获取 LangSmith 客户端
export function getLangsmithClient(): Client {
  if (!langsmithClient) {
    throw new Error('LangSmith client not initialized. Call initializeLangSmith() first.')
  }
  return langsmithClient
}

// 追踪标签接口
export interface ChatTraceTags {
  mode: 'solve' | 'tutor' | 'practice' | 'check'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
  provider?: 'poe' | 'deepseek' | 'openai'
  contentFiltered?: boolean
  messageType?: 'user' | 'assistant' | 'system'
  hasVisualization?: boolean
  error?: boolean
}

// AI 追踪元数据接口
export interface AIMetadata {
  tokensUsed?: number
  responseTime?: number
  model?: string
  temperature?: number
  maxTokens?: number
  streamMode?: boolean
}

// 学习分析接口
export interface LearningAnalytics {
  knowledgePoints?: string[]
  problemType?: string
  stepsGenerated?: number
  hasMermaidDiagram?: boolean
  difficultyRating?: 'easy' | 'medium' | 'hard'
  topicCategory?: string
}

// 追踪聊天交互
export async function traceChatInteraction(
  runId: string,
  tags: ChatTraceTags,
  metadata: AIMetadata & LearningAnalytics,
  input: string,
  output: string,
  error?: Error
): Promise<void> {
  try {
    const client = getLangsmithClient()

    // 创建标签列表
    const tagList = [
      `mode:${tags.mode}`,
      `difficulty:${tags.difficulty}`,
      `language:${tags.language}`,
      tags.provider ? `provider:${tags.provider}` : '',
      tags.contentFiltered ? 'content_filtered:true' : '',
      tags.hasVisualization ? 'has_visualization:true' : '',
      tags.error ? 'error:true' : ''
    ].filter(Boolean)

    // 创建元数据
    const traceMetadata = {
      ...metadata,
      problemType: tags.problemType || 'unknown',
      timestamp: new Date().toISOString(),
      runType: 'chat',
      application: 'dse-math-tutoring'
    }

    // 更新追踪
    await client.updateRun(
      runId,
      {
        tags: tagList,
        metadata: traceMetadata,
        name: `Math Chat - ${tags.mode}`,
        input: input.substring(0, 1000), // 限制输入长度
        output: output.substring(0, 1000), // 限制输出长度
        end_time: Date.now(),
        error: error ? error.message : undefined
      }
    )

    console.log('Chat interaction traced successfully:', { runId, tags: tagList })

  } catch (error) {
    console.error('Failed to trace chat interaction:', error)
    // 不抛出错误，避免影响主要功能
  }
}

// 追踪内容过滤事件
export async function traceContentFilterEvent(
  input: string,
  filteredContent: string[],
  language: string,
  contentType: 'explicit' | 'violence' | 'hate' | 'general'
): Promise<void> {
  try {
    const client = getLangsmithClient()

    // 创建内容过滤专用追踪
    const runId = crypto.randomUUID()

    await client.createRun({
      id: runId,
      name: 'Content Filter Event',
      run_type: 'chain',
      inputs: {
        input_length: input.length,
        language: language,
        detected_content: filteredContent,
        content_type: contentType
      },
      outputs: {
        action: 'blocked',
        message: 'Inappropriate content detected and filtered'
      },
      tags: [
        'content_filter',
        `content_type:${contentType}`,
        `language:${language}`
      ],
      extra: {
        metadata: {
          timestamp: new Date().toISOString(),
          application: 'dse-math-tutoring',
          module: 'content_filtering'
        }
      },
      start_time: Date.now(),
      end_time: Date.now()
    })

    console.log('Content filter event traced:', { runId, contentType, language })

  } catch (error) {
    console.error('Failed to trace content filter event:', error)
  }
}

// 追踪 AI 提供商性能
export async function traceProviderPerformance(
  provider: 'poe' | 'deepseek' | 'openai',
  responseTime: number,
  tokensUsed: number,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const client = getLangsmithClient()

    // 生成有效的 UUID
    const runId = crypto.randomUUID()

    await client.createRun({
      id: runId,
      name: `AI Provider Performance - ${provider}`,
      run_type: 'chain',
      inputs: {
        provider: provider,
        timestamp: new Date().toISOString()
      },
      outputs: {
        response_time_ms: responseTime,
        tokens_used: tokensUsed,
        success: success,
        error: error
      },
      tags: [
        'provider_performance',
        `provider:${provider}`,
        success ? 'success:true' : 'success:false'
      ],
      extra: {
        metadata: {
          application: 'dse-math-tutoring',
          module: 'ai_api_manager'
        }
      },
      start_time: Date.now(),
      end_time: Date.now()
    })

    console.log('Provider performance traced:', { provider, responseTime, tokensUsed, success })

  } catch (error) {
    console.error('Failed to trace provider performance:', error)
  }
}

// 检查 LangSmith 是否可用
export function isLangSmithEnabled(): boolean {
  return !!(
    process.env.LANGCHAIN_API_KEY &&
    process.env.LANGCHAIN_TRACING_V2 === 'true'
  )
}

// 自动初始化（如果环境配置正确）
export function autoInitializeLangSmith(): Client | null {
  if (!isLangSmithEnabled()) {
    console.log('LangSmith tracking is disabled')
    return null
  }

  try {
    return initializeLangSmith()
  } catch (error) {
    console.error('Failed to initialize LangSmith:', error)
    return null
  }
}

// 为了兼容性，也导出别名
export const autoInitializeLangsmith = autoInitializeLangSmith

// 导出配置常量
export const LANGSMITH_CONFIG = {
  PROJECT_NAME: process.env.LANGCHAIN_PROJECT || 'dse-math-tutoring',
  MAX_INPUT_LENGTH: 1000,
  MAX_OUTPUT_LENGTH: 1000,
  DEFAULT_TAGS: ['dse-math', 'hong-kong', 'learning-platform']
} as const