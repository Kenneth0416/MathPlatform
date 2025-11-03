// 對話管理功能
// 處理對話歷史的保存、加載和管理

export interface Conversation {
  id: string
  title: string
  timestamp: Date
  preview: string
  messages: Message[]
  mode: 'solve' | 'tutor' | 'practice' | 'check' | 'board'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
}

export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  steps?: MessageStep[]
  hasAlternative?: boolean
  knowledgePoints?: string[]
}

export interface MessageStep {
  id: string
  content: string
  isExpanded: boolean
  isHidden: boolean
}

export class ConversationManager {
  private storageKey = 'math-learning-conversations'
  private maxConversations = 50

  // 保存對話
  saveConversation(conversation: Conversation): void {
    try {
      const conversations = this.getAllConversations()
      
      // 更新現有對話或添加新對話
      const existingIndex = conversations.findIndex(c => c.id === conversation.id)
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation
      } else {
        conversations.unshift(conversation)
      }

      // 限制對話數量
      if (conversations.length > this.maxConversations) {
        conversations.splice(this.maxConversations)
      }

      localStorage.setItem(this.storageKey, JSON.stringify(conversations))
    } catch (error) {
      console.error('Failed to save conversation:', error)
    }
  }

  // 獲取所有對話
  getAllConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return []

      const conversations = JSON.parse(stored)
      return conversations.map((conv: any) => ({
        ...conv,
        timestamp: new Date(conv.timestamp),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }))
    } catch (error) {
      console.error('Failed to load conversations:', error)
      return []
    }
  }

  // 獲取單個對話
  getConversation(id: string): Conversation | null {
    const conversations = this.getAllConversations()
    return conversations.find(c => c.id === id) || null
  }

  // 刪除對話
  deleteConversation(id: string): void {
    try {
      const conversations = this.getAllConversations()
      const filtered = conversations.filter(c => c.id !== id)
      localStorage.setItem(this.storageKey, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  // 清空所有對話
  clearAllConversations(): void {
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.error('Failed to clear conversations:', error)
    }
  }

  // 創建新對話
  createConversation(
    messages: Message[],
    mode: 'solve' | 'tutor' | 'practice' | 'check' | 'board',
    difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest',
    language: 'zh-TW' | 'zh-CN' | 'en'
  ): Conversation {
    const id = this.generateId()
    const title = this.generateTitle(messages, mode, language)
    const preview = this.generatePreview(messages)
    
    return {
      id,
      title,
      timestamp: new Date(),
      preview,
      messages,
      mode,
      difficulty,
      language,
    }
  }

  // 更新對話標題
  updateConversationTitle(id: string, title: string): void {
    const conversation = this.getConversation(id)
    if (conversation) {
      conversation.title = title
      this.saveConversation(conversation)
    }
  }

  // 添加消息到對話
  addMessageToConversation(id: string, message: Message): void {
    const conversation = this.getConversation(id)
    if (conversation) {
      conversation.messages.push(message)
      conversation.preview = this.generatePreview(conversation.messages)
      this.saveConversation(conversation)
    }
  }

  // 搜索對話
  searchConversations(query: string): Conversation[] {
    const conversations = this.getAllConversations()
    const lowerQuery = query.toLowerCase()
    
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(lowerQuery) ||
      conv.preview.toLowerCase().includes(lowerQuery) ||
      conv.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      )
    )
  }

  // 按模式過濾對話
  filterByMode(mode: 'solve' | 'tutor' | 'practice' | 'check' | 'board'): Conversation[] {
    const conversations = this.getAllConversations()
    return conversations.filter(conv => conv.mode === mode)
  }

  // 按難度過濾對話
  filterByDifficulty(difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'): Conversation[] {
    const conversations = this.getAllConversations()
    return conversations.filter(conv => conv.difficulty === difficulty)
  }

  // 導出對話
  exportConversation(id: string): string {
    const conversation = this.getConversation(id)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    const exportData = {
      ...conversation,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }

    return JSON.stringify(exportData, null, 2)
  }

  // 導入對話
  importConversation(data: string): Conversation {
    try {
      const imported = JSON.parse(data)
      
      // 驗證數據結構
      if (!imported.id || !imported.title || !imported.messages) {
        throw new Error('Invalid conversation data')
      }

      // 生成新 ID 避免衝突
      const conversation: Conversation = {
        ...imported,
        id: this.generateId(),
        timestamp: new Date(),
        messages: imported.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }

      this.saveConversation(conversation)
      return conversation
    } catch (error) {
      throw new Error(`Failed to import conversation: ${error}`)
    }
  }

  // 生成唯一 ID
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 生成對話標題
  private generateTitle(
    messages: Message[], 
    mode: string, 
    language: string
  ): string {
    const firstUserMessage = messages.find(msg => msg.role === 'user')
    if (!firstUserMessage) {
      return this.getDefaultTitle(mode, language)
    }

    const content = firstUserMessage.content
    const maxLength = 30
    
    if (content.length <= maxLength) {
      return content
    }

    // 嘗試提取關鍵詞
    const keywords = this.extractKeywords(content)
    if (keywords.length > 0) {
      return keywords.slice(0, 3).join(' ') + '...'
    }

    return content.substring(0, maxLength) + '...'
  }

  // 生成對話預覽
  private generatePreview(messages: Message[]): string {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return ''

    const content = lastMessage.content
    const maxLength = 100
    
    if (content.length <= maxLength) {
      return content
    }

    return content.substring(0, maxLength) + '...'
  }

  // 提取關鍵詞
  private extractKeywords(text: string): string[] {
    const keywords: string[] = []
    
    // 數學關鍵詞
    const mathKeywords = [
      '二次方程', '一次方程', '三角函數', '導數', '積分', '幾何', '概率', '統計',
      'quadratic', 'linear', 'trigonometry', 'derivative', 'integral', 'geometry'
    ]

    for (const keyword of mathKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        keywords.push(keyword)
      }
    }

    return keywords
  }

  // 獲取默認標題
  private getDefaultTitle(mode: string, language: string): string {
    const titles = {
      'zh-TW': {
        solve: '數學解題',
        tutor: '數學輔導',
        practice: '練習題',
        check: '作業檢查',
        board: '白板討論'
      },
      'zh-CN': {
        solve: '数学解题',
        tutor: '数学辅导',
        practice: '练习题',
        check: '作业检查',
        board: '白板讨论'
      },
      'en': {
        solve: 'Math Solving',
        tutor: 'Math Tutoring',
        practice: 'Practice Problems',
        check: 'Homework Check',
        board: 'Whiteboard Discussion'
      }
    }

    return titles[language as keyof typeof titles]?.[mode as keyof typeof titles['zh-TW']] || 'New Conversation'
  }

  // 獲取對話統計
  getConversationStats(): {
    total: number
    byMode: Record<string, number>
    byDifficulty: Record<string, number>
    totalMessages: number
  } {
    const conversations = this.getAllConversations()
    
    const stats = {
      total: conversations.length,
      byMode: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
      totalMessages: 0
    }

    conversations.forEach(conv => {
      stats.byMode[conv.mode] = (stats.byMode[conv.mode] || 0) + 1
      stats.byDifficulty[conv.difficulty] = (stats.byDifficulty[conv.difficulty] || 0) + 1
      stats.totalMessages += conv.messages.length
    })

    return stats
  }
}

// 導出單例實例
export const conversationManager = new ConversationManager()

// 導出便捷函數
export function saveConversation(conversation: Conversation): void {
  conversationManager.saveConversation(conversation)
}

export function getAllConversations(): Conversation[] {
  return conversationManager.getAllConversations()
}

export function getConversation(id: string): Conversation | null {
  return conversationManager.getConversation(id)
}

export function deleteConversation(id: string): void {
  conversationManager.deleteConversation(id)
}

export function searchConversations(query: string): Conversation[] {
  return conversationManager.searchConversations(query)
}
