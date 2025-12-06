/**
 * 統一的日誌管理系統
 * 支援結構化日誌、LangSmith 集成和不同級別的輸出
 */

import { Client as LangSmithClient } from "langsmith"

// 日誌級別
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE'
}

// 日誌上下文
export interface LogContext {
  userId?: string
  sessionId?: string
  requestId?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
}

// 結構化日誌項目
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error
  duration?: number
  tags?: string[]
}

// Chat 專用的日誌上下文
export interface ChatLogContext extends LogContext {
  userMessage?: string
  aiResponse?: string
  mode?: 'solve' | 'tutor' | 'practice' | 'check'
  difficulty?: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language?: 'zh-TW' | 'zh-CN' | 'en'
  provider?: 'poe' | 'deepseek' | 'openai'
  tokensUsed?: number
  responseTime?: number
  mcpCalls?: number
}

// LangSmith 集成配置
interface LangSmithConfig {
  enabled: boolean
  client?: LangSmithClient
  projectName: string
}

class Logger {
  private static instance: Logger
  private langSmithConfig: LangSmithConfig = {
    enabled: false,
    projectName: 'dse-math-tutoring'
  }

  private constructor() {
    this.initializeLangSmith()
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * 初始化 LangSmith 客戶端
   */
  private async initializeLangSmith(): Promise<void> {
    if (!process.env.LANGCHAIN_API_KEY || process.env.LANGCHAIN_TRACING_V2 !== 'true') {
      console.log('📝 LangSmith tracking disabled (missing env vars)')
      return
    }

    try {
      const { Client } = await import("langsmith")
      this.langSmithConfig.client = new Client({
        apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
        apiKey: process.env.LANGCHAIN_API_KEY,
      })
      this.langSmithConfig.enabled = true
      this.langSmithConfig.projectName = process.env.LANGCHAIN_PROJECT || 'dse-math-tutoring'

      console.log(`✅ LangSmith client initialized for project: ${this.langSmithConfig.projectName}`)
      console.log('🔄 LangSmith auto-tracing is enabled - all LangChain operations will be automatically traced')
    } catch (error) {
      console.warn('⚠️ Failed to initialize LangSmith client:', error)
      this.langSmithConfig.enabled = false
    }
  }

  /**
   * 創建標準化的日誌條目
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      tags: this.generateTags(level, context)
    }
  }

  /**
   * 生成日誌標籤
   */
  private generateTags(level: LogLevel, context?: LogContext): string[] {
    const tags = [level.toLowerCase()]

    if (context?.component) tags.push(`component:${context.component}`)
    if (context?.action) tags.push(`action:${context.action}`)
    if (context?.metadata?.mode) tags.push(`mode:${context.metadata.mode}`)
    if (context?.metadata?.difficulty) tags.push(`difficulty:${context.metadata.difficulty}`)
    if (context?.metadata?.provider) tags.push(`provider:${context.metadata.provider}`)

    return tags
  }

  /**
   * 格式化日誌輸出
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.substring(11, 19) // HH:MM:SS
    const level = entry.level.padEnd(5)
    const component = entry.context?.component ? `[${entry.context.component}]` : ''
    const action = entry.context?.action ? `[${entry.context.action}]` : ''
    const tags = entry.tags?.slice(1).join(', ') // 移除 level 標籤

    let message = `${timestamp} ${level} ${component}${action} ${entry.message}`
    if (tags) message += ` | ${tags}`

    if (entry.duration) {
      message += ` (${entry.duration}ms)`
    }

    if (entry.context?.requestId) {
      message += ` [${entry.context.requestId}]`
    }

    return message
  }

  /**
   * 記錄到 LangSmith
   */
  private async logToLangSmith(entry: LogEntry): Promise<void> {
    if (!this.langSmithConfig.enabled || !this.langSmithConfig.client) {
      return
    }

    try {
      // 只記錄重要的事件到 LangSmith
      if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN ||
          (entry.context?.component && ['chat', 'api', 'ai'].includes(entry.context.component))) {

        // 使用自動追蹤，手動記錄只作為備用
        console.log('LangSmith auto-tracing enabled - data will be automatically captured')

        // 可選：手動創建一個簡單的事件記錄
        // 這主要用於調試和驗證
        if (entry.level === LogLevel.ERROR && entry.context?.action === 'langsmith_test') {
          const { v4: uuidv4 } = await import("uuid")
          const runId = uuidv4()

          try {
            await this.langSmithConfig.client.createRun({
              id: runId,
              name: `${entry.context?.component || 'system'} - ${entry.context?.action || 'log'}`,
              run_type: "chain",
              inputs: {
                level: entry.level,
                message: entry.message,
                context: entry.context,
                timestamp: entry.timestamp
              },
              outputs: entry.error ? {
                error: entry.error
              } : {
                status: 'logged'
              },
              tags: entry.tags || [],
              extra: {
                metadata: {
                  ...entry.context?.metadata,
                  log_type: 'structured',
                  application: 'dse-math-tutoring'
                }
              },
              start_time: Date.now(),
              end_time: Date.now()
            })

            console.log(`✅ Manual LangSmith logging: ${runId}`)
          } catch (manualError) {
            console.warn('Manual LangSmith logging failed:', manualError)
          }
        }
      }
    } catch (error) {
      console.warn('LangSmith client error:', error)
    }
  }

  /**
   * 通用日誌方法
   */
  private async log(level: LogLevel, message: string, context?: LogContext, error?: Error): Promise<void> {
    const entry = this.createLogEntry(level, message, context, error)

    // 控制台輸出
    switch (level) {
      case LogLevel.ERROR:
        console.error(this.formatLogEntry(entry))
        if (error) console.error(error)
        break
      case LogLevel.WARN:
        console.warn(this.formatLogEntry(entry))
        break
      case LogLevel.INFO:
        console.info(this.formatLogEntry(entry))
        break
      case LogLevel.DEBUG:
        console.debug(this.formatLogEntry(entry))
        break
      case LogLevel.TRACE:
        console.trace(this.formatLogEntry(entry))
        break
    }

    // LangSmith 記錄
    await this.logToLangSmith(entry)
  }

  /**
   * Chat 專用的日誌方法
   */
  public async logChatStart(context: ChatLogContext): Promise<void> {
    await this.log(LogLevel.INFO, 'Chat session started', {
      component: 'chat',
      action: 'start',
      metadata: {
        mode: context.mode,
        difficulty: context.difficulty,
        language: context.language,
        provider: context.provider
      },
      ...context
    })
  }

  public async logChatResponse(context: ChatLogContext): Promise<void> {
    await this.log(LogLevel.INFO, 'Chat response completed', {
      component: 'chat',
      action: 'response',
      metadata: {
        mode: context.mode,
        difficulty: context.difficulty,
        language: context.language,
        provider: context.provider,
        tokensUsed: context.tokensUsed,
        responseTime: context.responseTime,
        mcpCalls: context.mcpCalls
      },
      ...context
    })
  }

  public async logChatError(error: Error, context: ChatLogContext): Promise<void> {
    await this.log(LogLevel.ERROR, 'Chat session error', {
      component: 'chat',
      action: 'error',
      metadata: {
        mode: context.mode,
        difficulty: context.difficulty,
        language: context.language,
        provider: context.provider
      },
      ...context
    }, error)
  }

  public async logMCPCall(toolName: string, input: any, output: any, duration: number, context?: LogContext): Promise<void> {
    await this.log(LogLevel.DEBUG, `MCP tool executed: ${toolName}`, {
      component: 'mcp',
      action: 'tool_call',
      metadata: {
        tool: toolName,
        input,
        output,
        duration
      },
      ...context
    })
  }

  public async logAPIRequest(method: string, endpoint: string, duration: number, status: number, context?: LogContext): Promise<void> {
    await this.log(LogLevel.INFO, `API ${method} ${endpoint}`, {
      component: 'api',
      action: 'request',
      metadata: {
        method,
        endpoint,
        status,
        duration
      },
      ...context
    })
  }

  public async logPerformance(operation: string, duration: number, metadata?: Record<string, any>, context?: LogContext): Promise<void> {
    await this.log(LogLevel.INFO, `Performance: ${operation}`, {
      component: 'performance',
      action: 'measurement',
      metadata: {
        operation,
        duration,
        ...metadata
      },
      ...context
    })
  }

  // 通用日誌方法
  public async error(message: string, context?: LogContext, error?: Error): Promise<void> {
    await this.log(LogLevel.ERROR, message, context, error)
  }

  public async warn(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.WARN, message, context)
  }

  public async info(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.INFO, message, context)
  }

  public async debug(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.DEBUG, message, context)
  }

  public async trace(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.TRACE, message, context)
  }

  /**
   * 獲取配置狀態
   */
  public getConfig() {
    return {
      langSmith: this.langSmithConfig
    }
  }
}

// 導出單例實例
export const logger = Logger.getInstance()

// 導出類型
export type { LogEntry, ChatLogContext }