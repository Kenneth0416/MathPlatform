import type { Conversation, Message } from "@/lib/conversation-manager"
import { errorTracker } from "./error-tracker"

export interface KnowledgePointProgress {
  name: string
  category: string
  masteryLevel: number // 0-100
  problemCount: number
  correctCount: number
  timeSpent: number // in minutes
  lastPracticed: Date
  trend: 'improving' | 'stable' | 'declining'
  recentSessions: number
}

export interface StudySession {
  id: string
  date: Date
  duration: number // in minutes
  topic: string
  problemCount: number
  difficulty: 'junior' | 'senior'
  knowledgePoints: string[]
}

export interface ProgressStats {
  totalStudyTime: number
  totalSessions: number
  averageSessionDuration: number
  totalProblems: number
  overallAccuracy: number
  currentStreak: number
  longestStreak: number
  weeklyStats: WeeklyStats[]
  knowledgePoints: KnowledgePointProgress[]
  learningTrend: 'improving' | 'stable' | 'declining'
}

export interface WeeklyStats {
  week: string
  studyTime: number
  sessions: number
  problems: number
  accuracy: number
  newKnowledgePoints: number
}

export class ProgressAnalyzer {
  private static instance: ProgressAnalyzer
  private storageKey = 'math-learning-progress'

  private constructor() {}

  static getInstance(): ProgressAnalyzer {
    if (!ProgressAnalyzer.instance) {
      ProgressAnalyzer.instance = new ProgressAnalyzer()
    }
    return ProgressAnalyzer.instance
  }

  // 分析用戶進度
  analyzeProgress(): ProgressStats {
    const conversations = this.getAllConversations()
    const errors = errorTracker.getAllErrors()

    // 計算基本統計
    const totalStudyTime = this.calculateTotalStudyTime(conversations)
    const totalSessions = conversations.length
    const averageSessionDuration = totalSessions > 0 ? totalStudyTime / totalSessions : 0
    const totalProblems = this.countProblems(conversations)
    const overallAccuracy = this.calculateAccuracy(conversations, errors)

    // 計算知識點進度
    const knowledgePoints = this.analyzeKnowledgePoints(conversations, errors)

    // 計算週統計
    const weeklyStats = this.calculateWeeklyStats(conversations)

    // 計算學習趨勢
    const learningTrend = this.calculateLearningTrend(conversations)

    return {
      totalStudyTime,
      totalSessions,
      averageSessionDuration,
      totalProblems,
      overallAccuracy,
      currentStreak: this.calculateCurrentStreak(conversations),
      longestStreak: this.calculateLongestStreak(conversations),
      weeklyStats,
      knowledgePoints,
      learningTrend
    }
  }

  // 獲取所有對話
  private getAllConversations(): Conversation[] {
    try {
      if (typeof window === 'undefined') return []
      const data = localStorage.getItem('math-learning-conversations')
      return data ? JSON.parse(data, (key, value) => {
        if (key.endsWith('At') || key.endsWith('Time')) {
          return new Date(value)
        }
        return value
      }) : []
    } catch (error) {
      console.error('Error loading conversations:', error)
      return []
    }
  }

  // 計算總學習時間
  private calculateTotalStudyTime(conversations: Conversation[]): number {
    return conversations.reduce((total, conv) => {
      if (conv.messages.length < 2) return total

      const startTime = this.ensureDate(conv.messages[0].timestamp)
      const endTime = this.ensureDate(conv.messages[conv.messages.length - 1].timestamp)
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // 分鐘

      return total + Math.min(duration, 60) // 假設每次對話最多60分鐘
    }, 0)
  }

  // 確保值是Date對象
  private ensureDate(date: any): Date {
    if (date instanceof Date) {
      return date
    }
    if (typeof date === 'string' || typeof date === 'number') {
      return new Date(date)
    }
    return new Date() // 默認返回當前時間
  }

  // 統計問題數量
  private countProblems(conversations: Conversation[]): number {
    return conversations.reduce((total, conv) => {
      const userMessages = conv.messages.filter(msg => msg.role === 'user')
      return total + userMessages.length
    }, 0)
  }

  // 計算準確率
  private calculateAccuracy(conversations: Conversation[], errors: any[]): number {
    const totalProblems = this.countProblems(conversations)
    if (totalProblems === 0) return 0

    const totalErrors = errors.filter(error => !error.isResolved).length
    return Math.max(0, Math.round(((totalProblems - totalErrors) / totalProblems) * 100))
  }

  // 分析知識點進度
  private analyzeKnowledgePoints(conversations: Conversation[], errors: any[]): KnowledgePointProgress[] {
    const knowledgePointMap = new Map<string, KnowledgePointProgress>()

    conversations.forEach(conv => {
      conv.knowledgePoints?.forEach(point => {
        if (!knowledgePointMap.has(point)) {
          knowledgePointMap.set(point, {
            name: point,
            category: this.categorizeKnowledgePoint(point),
            masteryLevel: 0,
            problemCount: 0,
            correctCount: 0,
            timeSpent: 0,
            lastPracticed: conv.timestamp,
            trend: 'stable',
            recentSessions: 0
          })
        }

        const progress = knowledgePointMap.get(point)!
        progress.problemCount += conv.messages.filter(msg => msg.role === 'user').length
        progress.lastPracticed = new Date(Math.max(this.ensureDate(progress.lastPracticed).getTime(), this.ensureDate(conv.timestamp).getTime()))
        progress.timeSpent += Math.min(60, (this.ensureDate(conv.messages[conv.messages.length - 1].timestamp).getTime() - this.ensureDate(conv.messages[0].timestamp).getTime()) / (1000 * 60))
        progress.recentSessions += 1
      })
    })

    // 根據錯誤調整掌握度
    errors.forEach(error => {
      error.knowledgePoints?.forEach(point => {
        if (knowledgePointMap.has(point)) {
          const progress = knowledgePointMap.get(point)!
          if (!error.isResolved) {
            progress.masteryLevel = Math.max(0, progress.masteryLevel - 5)
          }
        }
      })
    })

    // 計算最終掌握度
    knowledgePointMap.forEach(progress => {
      if (progress.problemCount > 0) {
        // 基礎分數基於問題數量和練習時間
        const baseScore = Math.min(50, progress.problemCount * 5 + progress.timeSpent / 2)

        // 根據最近會話調整
        const recentBonus = Math.min(30, progress.recentSessions * 10)

        // 根據錯誤率調整
        const errorCount = errors.filter(e =>
          e.knowledgePoints?.includes(progress.name) && !e.isResolved
        ).length
        const errorPenalty = Math.min(30, errorCount * 10)

        progress.masteryLevel = Math.max(0, Math.min(100, baseScore + recentBonus - errorPenalty))
      }

      // 計算趨勢
      progress.trend = this.calculateTrend(progress, conversations, errors)
    })

    return Array.from(knowledgePointMap.values()).sort((a, b) => b.masteryLevel - a.masteryLevel)
  }

  // 知識點分類
  private categorizeKnowledgePoint(point: string): string {
    const categories = {
      "代數": ["二次函數", "一次方程", "不等式", "函數", "多項式"],
      "幾何": ["三角函數", "幾何", "圓", "三角形", "角度"],
      "微積分": ["導數", "積分", "極限", "微分"],
      "概率統計": ["概率", "統計", "組合", "排列"],
    }

    for (const [category, points] of Object.entries(categories)) {
      if (points.some(p => point.includes(p))) {
        return category
      }
    }

    return "其他"
  }

  // 計算趨勢
  private calculateTrend(progress: KnowledgePointProgress, conversations: Conversation[], errors: any[]): 'improving' | 'stable' | 'declining' {
    // 簡化的趨勢計算
    const recentSessions = conversations.filter(conv =>
      conv.knowledgePoints?.includes(progress.name) &&
      (Date.now() - this.ensureDate(conv.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000 // 最近7天
    )

    if (recentSessions.length >= 3) {
      const recentErrors = errors.filter(e =>
        e.knowledgePoints?.includes(progress.name) &&
        !e.isResolved &&
        (Date.now() - this.ensureDate(e.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
      )

      if (recentErrors.length === 0) return 'improving'
      if (recentErrors.length > recentSessions.length) return 'declining'
    }

    return 'stable'
  }

  // 計算週統計
  private calculateWeeklyStats(conversations: Conversation[]): WeeklyStats[] {
    const weeklyMap = new Map<string, WeeklyStats>()

    conversations.forEach(conv => {
      const weekKey = this.getWeekKey(conv.timestamp)

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: weekKey,
          studyTime: 0,
          sessions: 0,
          problems: 0,
          accuracy: 0,
          newKnowledgePoints: 0
        })
      }

      const stats = weeklyMap.get(weekKey)!
      stats.sessions += 1
      stats.problems += conv.messages.filter(msg => msg.role === 'user').length
      stats.studyTime += Math.min(60, (this.ensureDate(conv.messages[conv.messages.length - 1].timestamp).getTime() - this.ensureDate(conv.messages[0].timestamp).getTime()) / (1000 * 60))
    })

    return Array.from(weeklyMap.values()).sort((a, b) => a.week.localeCompare(b.week)).slice(-8)
  }

  // 獲取週鍵值
  private getWeekKey(date: Date): string {
    const dateObj = this.ensureDate(date)
    const startOfYear = new Date(dateObj.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((dateObj.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    return `${dateObj.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
  }

  // 計算學習趨勢
  private calculateLearningTrend(conversations: Conversation[]): 'improving' | 'stable' | 'declining' {
    if (conversations.length < 3) return 'stable'

    const recent = conversations.slice(0, 3)
    const older = conversations.slice(3, 6)

    const recentErrors = recent.reduce((sum, conv) => {
      return sum + errorTracker.getAllErrors().filter(e => e.conversationId === conv.id && !e.isResolved).length
    }, 0)

    const olderErrors = older.reduce((sum, conv) => {
      return sum + errorTracker.getAllErrors().filter(e => e.conversationId === conv.id && !e.isResolved).length
    }, 0)

    if (recentErrors < olderErrors) return 'improving'
    if (recentErrors > olderErrors) return 'declining'
    return 'stable'
  }

  // 計算當前連續學習天數
  private calculateCurrentStreak(conversations: Conversation[]): number {
    if (conversations.length === 0) return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let streak = 0
    let currentDate = new Date(today)

    // 檢查是否有今天的学习记录
    const todayConversations = conversations.filter(conv => {
      const convDate = this.ensureDate(conv.timestamp)
      convDate.setHours(0, 0, 0, 0)
      return convDate.getTime() === today.getTime()
    })

    if (todayConversations.length === 0) {
      // 如果今天没有学习，检查昨天
      currentDate.setDate(currentDate.getDate() - 1)
    }

    while (streak < 365) { // 最多检查一年
      const dateToCheck = new Date(currentDate)
      dateToCheck.setHours(0, 0, 0, 0)

      const hasStudyOnDate = conversations.some(conv => {
        const convDate = this.ensureDate(conv.timestamp)
        convDate.setHours(0, 0, 0, 0)
        return convDate.getTime() === dateToCheck.getTime()
      })

      if (hasStudyOnDate) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  // 計算最長連續學習天數
  private calculateLongestStreak(conversations: Conversation[]): number {
    if (conversations.length === 0) return 0

    const studyDates = new Set<string>()
    conversations.forEach(conv => {
      const dateKey = this.ensureDate(conv.timestamp).toISOString().split('T')[0]
      studyDates.add(dateKey)
    })

    const sortedDates = Array.from(studyDates).sort()
    let maxStreak = 0
    let currentStreak = 0
    let lastDate = null

    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr)

      if (lastDate) {
        const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          currentStreak++
        } else {
          maxStreak = Math.max(maxStreak, currentStreak)
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }

      lastDate = currentDate
    }

    return Math.max(maxStreak, currentStreak)
  }

  // 獲取學習建議（支持多語言和動態內容）
  getLearningSuggestions(
    progress: ProgressStats,
    language: 'zh-TW' | 'zh-CN' | 'en' = 'zh-TW',
    mode?: 'solve' | 'tutor' | 'practice' | 'check'
  ): string[] {
    const suggestions: string[] = []

    // 獲取翻譯函數
    const t = (key: string): string => {
      const translations = {
        'zh-TW': {
          'suggestions.dailyHabit': '保持每天學習的習慣，哪怕只有15分鐘',
          'suggestions.extendSession': '建議延長單次學習時間，深度學習效果更好',
          'suggestions.consolidateFoundation': '建議先鞏固基礎，多做基礎練習題',
          'suggestions.focusWeakPoints': '重點關注薄弱環節：',
          'suggestions.goodProgress': '學習狀況良好！可以嘗試更有挑戰性的題目',
          'suggestions.improveAccuracy': '建議專注於提高準確率，仔細檢查步驟',
          'suggestions.consistentPractice': '保持練習的穩定性，定期複習已學知識點',
          'suggestions.challengeYourself': '可以嘗試更高難度的題目來提升能力',
        },
        'zh-CN': {
          'suggestions.dailyHabit': '保持每天学习的习惯，哪怕只有15分钟',
          'suggestions.extendSession': '建议延长单次学习时间，深度学习效果更好',
          'suggestions.consolidateFoundation': '建议先巩固基础，多做基础练习题',
          'suggestions.focusWeakPoints': '重点关注薄弱环节：',
          'suggestions.goodProgress': '学习状况良好！可以尝试更有挑战性的题目',
          'suggestions.improveAccuracy': '建议专注于提高准确率，仔细检查步骤',
          'suggestions.consistentPractice': '保持练习的稳定性，定期复习已学知识点',
          'suggestions.challengeYourself': '可以尝试更高难度的题目来提升能力',
        },
        'en': {
          'suggestions.dailyHabit': 'Maintain a daily learning habit, even if just for 15 minutes',
          'suggestions.extendSession': 'Consider extending single study sessions for deeper learning',
          'suggestions.consolidateFoundation': 'Focus on consolidating fundamentals with more basic practice',
          'suggestions.focusWeakPoints': 'Pay special attention to weak areas: ',
          'suggestions.goodProgress': 'Great progress! Try more challenging problems to advance',
          'suggestions.improveAccuracy': 'Focus on improving accuracy, double-check your steps',
          'suggestions.consistentPractice': 'Maintain consistent practice and regularly review learned concepts',
          'suggestions.challengeYourself': 'Try higher difficulty problems to enhance your skills',
        }
      }
      return translations[language]?.[key] || key
    }

    // 基於學習數據生成建議
    if (progress.overallAccuracy < 70) {
      suggestions.push(t('suggestions.consolidateFoundation'))
    }

    if (progress.currentStreak < 3) {
      suggestions.push(t('suggestions.dailyHabit'))
    }

    // 找出薄弱知識點
    const weakPoints = progress.knowledgePoints.filter(kp => kp.masteryLevel < 60)
    if (weakPoints.length > 0) {
      const weakPointsText = weakPoints.slice(0, 2).map(kp => kp.name).join('、')
      suggestions.push(t('suggestions.focusWeakPoints') + weakPointsText)
    }

    if (progress.averageSessionDuration < 10) {
      suggestions.push(t('suggestions.extendSession'))
    }

    // 基於模式添加特定建議
    if (mode) {
      switch (mode) {
        case 'solve':
          if (progress.overallAccuracy < 80) {
            suggestions.push(t('suggestions.improveAccuracy'))
          }
          break
        case 'tutor':
          suggestions.push(t('suggestions.consistentPractice'))
          break
        case 'practice':
          if (progress.overallAccuracy > 85) {
            suggestions.push(t('suggestions.challengeYourself'))
          }
          break
        case 'check':
          if (progress.averageSessionDuration > 20 && progress.overallAccuracy < 75) {
            suggestions.push(t('suggestions.consolidateFoundation'))
          }
          break
      }
    }

    // 如果沒有特定建議，給出一般性鼓勵
    if (suggestions.length === 0) {
      suggestions.push(t('suggestions.goodProgress'))
    }

    return suggestions
  }
}

export const progressAnalyzer = ProgressAnalyzer.getInstance()