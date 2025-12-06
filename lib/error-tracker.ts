import type { Message } from "@/lib/conversation-manager"

export interface ErrorRecord {
  id: string
  conversationId: string
  timestamp: Date
  userQuestion: string
  correctAnswer: string
  userMistake: string
  category: string
  knowledgePoints: string[]
  difficulty: 'junior' | 'senior'
  isResolved: boolean
  resolvedAt?: Date
  attempts: number
}

export interface ErrorCategory {
  id: string
  name: string
  description: string
  examples: string[]
  suggestions: string[]
}

export class ErrorTracker {
  private static instance: ErrorTracker
  private storageKey = 'math-learning-errors'

  private constructor() {}

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker()
    }
    return ErrorTracker.instance
  }

  // 錯誤類型定義
  private errorCategories: ErrorCategory[] = [
    {
      id: 'sign_error',
      name: '符號錯誤',
      description: '計算過程中正負號處理錯誤',
      examples: ['因式分解符號錯誤', '移項符號忘記改變', '不等式方向錯誤'],
      suggestions: ['注意每一步的符號變化', '建立符號檢查習慣', '多做符號練習']
    },
    {
      id: 'calculation_error',
      name: '計算錯誤',
      description: '基本計算過程中的錯誤',
      examples: ['加減乘除錯誤', '分數運算錯誤', '小數點錯誤'],
      suggestions: ['仔細檢查每一步計算', '使用草稿紙驗算', '練習基本運算']
    },
    {
      id: 'formula_error',
      name: '公式錯誤',
      description: '數學公式使用錯誤',
      examples: ['二次公式記錯', '三角函數公式混淆', '導數公式錯誤'],
      suggestions: ['建立公式記憶表', '理解公式推導過程', '多做公式應用題']
    },
    {
      id: 'concept_error',
      name: '概念錯誤',
      description: '數學概念理解錯誤',
      examples: ['函數概念混淆', '數列類型判斷錯誤', '幾何概念錯誤'],
      suggestions: ['重新學習基礎概念', '做概念辨析題', '尋求老師解釋']
    },
    {
      id: 'method_error',
      name: '方法錯誤',
      description: '解題方法選擇或應用錯誤',
      examples: ['解題步驟缺失', '方法選擇不當', '邏輯推理錯誤'],
      suggestions: ['學習標準解題步驟', '分析題目類型', '練習多種解題方法']
    }
  ]

  // 分析對話中的錯誤
  analyzeConversation(conversationId: string, messages: Message[]): ErrorRecord[] {
    const errors: ErrorRecord[] = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]

      if (message.role === 'assistant') {
        const error = this.detectError(conversationId, messages, i)
        if (error) {
          errors.push(error)
        }
      }
    }

    return errors
  }

  // 檢測單個錯誤
  private detectError(conversationId: string, messages: Message[], assistantMessageIndex: number): ErrorRecord | null {
    const assistantMessage = messages[assistantMessageIndex]
    const userMessage = messages[assistantMessageIndex - 1]

    if (!userMessage || assistantMessage.role !== 'assistant') {
      return null
    }

    // 檢查是否包含錯誤指示詞
    const errorIndicators = [
      '錯誤', '不對', '錯了', '應該是', '注意', '這裡有問題',
      'error', 'wrong', 'incorrect', 'mistake', '注意符號'
    ]

    const hasError = errorIndicators.some(indicator =>
      assistantMessage.content.toLowerCase().includes(indicator.toLowerCase())
    )

    if (!hasError) {
      return null
    }

    // 提取錯誤信息
    const category = this.categorizeError(userMessage.content, assistantMessage.content)
    const knowledgePoints = this.extractKnowledgePoints(assistantMessage.content)

    return {
      id: `${conversationId}_${assistantMessageIndex}`,
      conversationId,
      timestamp: assistantMessage.timestamp,
      userQuestion: userMessage.content,
      correctAnswer: this.extractCorrectAnswer(assistantMessage.content),
      userMistake: this.extractMistake(assistantMessage.content),
      category,
      knowledgePoints,
      difficulty: 'junior', // 可以根據內容動態判斷
      isResolved: false,
      attempts: 1
    }
  }

  // 錯誤分類
  private categorizeError(userQuestion: string, assistantResponse: string): string {
    const content = (userQuestion + ' ' + assistantResponse).toLowerCase()

    if (content.includes('符號') || content.includes('正負') || content.includes('sign')) {
      return 'sign_error'
    }
    if (content.includes('計算') || content.includes('運算') || content.includes('calculation')) {
      return 'calculation_error'
    }
    if (content.includes('公式') || content.includes('formula')) {
      return 'formula_error'
    }
    if (content.includes('概念') || content.includes('concept')) {
      return 'concept_error'
    }

    return 'method_error'
  }

  // 提取知識點
  private extractKnowledgePoints(content: string): string[] {
    const knowledgePointPatterns = [
      '二次函數', '三角函數', '導數', '積分', '幾何', '代數',
      '概率', '統計', '數列', '方程', '不等式', '函數',
      'quadratic', 'trigonometry', 'derivative', 'integral', 'geometry'
    ]

    const foundPoints: string[] = []
    const lowerContent = content.toLowerCase()

    knowledgePointPatterns.forEach(point => {
      if (lowerContent.includes(point.toLowerCase())) {
        foundPoints.push(point)
      }
    })

    return [...new Set(foundPoints)]
  }

  // 提取正確答案
  private extractCorrectAnswer(content: string): string {
    const answerPatterns = [
      /正確答案是[:：]\s*([^。\n]+)/,
      /答案為[:：]\s*([^。\n]+)/,
      /應該是[:：]\s*([^。\n]+)/,
      /the answer is[:：]\s*([^.\n]+)/
    ]

    for (const pattern of answerPatterns) {
      const match = content.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return '請查看詳細解答'
  }

  // 提取錯誤描述
  private extractMistake(content: string): string {
    const mistakePatterns = [
      /你的錯誤[:：]\s*([^。\n]+)/,
      /錯誤在於[:：]\s*([^。\n]+)/,
      /問題是[:：]\s*([^。\n]+)/,
      /mistake[:：]\s*([^.\n]+)/
    ]

    for (const pattern of mistakePatterns) {
      const match = content.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return '計算過程中的錯誤'
  }

  // 獲取所有錯誤記錄
  getAllErrors(): ErrorRecord[] {
    try {
      if (typeof window === 'undefined') return []
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data, (key, value) => {
        if (key.endsWith('At') || key.endsWith('Time')) {
          return new Date(value)
        }
        return value
      }) : []
    } catch (error) {
      console.error('Error loading errors:', error)
      return []
    }
  }

  // 保存錯誤記錄
  saveErrors(errors: ErrorRecord[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(errors))
    } catch (error) {
      console.error('Error saving errors:', error)
    }
  }

  // 添加錯誤記錄
  addError(error: ErrorRecord): void {
    const errors = this.getAllErrors()
    errors.unshift(error)

    // 限制保存的錯誤數量
    if (errors.length > 100) {
      errors.splice(100)
    }

    this.saveErrors(errors)
  }

  // 標記錯誤為已解決
  resolveError(errorId: string): void {
    const errors = this.getAllErrors()
    const error = errors.find(e => e.id === errorId)

    if (error) {
      error.isResolved = true
      error.resolvedAt = new Date()
      this.saveErrors(errors)
    }
  }

  // 獲取錯誤統計
  getErrorStats(): {
    total: number
    unresolved: number
    byCategory: Record<string, number>
    byKnowledgePoint: Record<string, number>
    recentErrors: ErrorRecord[]
  } {
    const allErrors = this.getAllErrors()
    const unresolved = allErrors.filter(e => !e.isResolved)

    const byCategory: Record<string, number> = {}
    const byKnowledgePoint: Record<string, number> = {}

    allErrors.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1

      error.knowledgePoints.forEach(point => {
        byKnowledgePoint[point] = (byKnowledgePoint[point] || 0) + 1
      })
    })

    return {
      total: allErrors.length,
      unresolved: unresolved.length,
      byCategory,
      byKnowledgePoint,
      recentErrors: allErrors.slice(0, 10)
    }
  }

  // 獲取錯誤類別信息
  getErrorCategories(): ErrorCategory[] {
    return this.errorCategories
  }

  // 獲取練習建議
  getPracticeSuggestions(error: ErrorRecord): string[] {
    const category = this.errorCategories.find(cat => cat.id === error.category)
    return category ? category.suggestions : ['多做相關練習題', '複習基礎知識']
  }
}

export const errorTracker = ErrorTracker.getInstance()