"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { MobileNav } from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  ImageIcon,
  Sparkles,
  Menu,
  Settings,
  Globe,
  GraduationCap,
  Download,
  Share2,
  Plus,
  Lightbulb,
  CheckCircle2,
  BarChart3,
  Bookmark,
  AlertCircle,
  FileText,
  Paperclip,
  MessageCircle,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Calculator,
  BookOpen,
  Edit3,
  Search,
  Star,
  Trophy,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MathText } from "@/components/math-renderer"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { CompliancePanel } from "@/components/compliance-panel"
import { parseMathProblem } from "@/lib/math-parser"
import { parseSolution } from "@/lib/solution-parser"
import { conversationManager } from "@/lib/conversation-manager"
import { errorTracker } from "@/lib/error-tracker"
import { progressAnalyzer } from "@/lib/progress-analyzer"
import { getVisualizationPrompt } from "@/lib/prompts/math-prompts"
import { useStreaming } from "@/hooks/use-streaming"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n-context"
import { logger } from "@/lib/logger"
import { chatService, ChatRequest } from "@/lib/chat-service"
import type { Language } from "@/lib/locales"

interface MessageStep {
  id: string
  title?: string // 步驟標題
  content: string
}

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
  steps?: MessageStep[]
  hasAlternative?: boolean
  knowledgePoints?: string[]
  mcpCallInfos?: import('@/types/mcp').MCPCallInfo[]
}

interface Conversation {
  id: string
  title: string
  timestamp: Date
  preview: string
}

type Difficulty = "junior" | "senior"
type Mode = "solve" | "tutor" | "practice" | "check"

const mockConversations: Conversation[] = [
  { id: "1", title: "二次方程求解", timestamp: new Date(Date.now() - 3600000), preview: "如何解 x² + 5x + 6 = 0" },
  { id: "2", title: "三角函数应用", timestamp: new Date(Date.now() - 7200000), preview: "sin²θ + cos²θ = 1 的证明" },
  { id: "3", title: "导数计算", timestamp: new Date(Date.now() - 86400000), preview: "求 f(x) = x³ 的导数" },
]

const knowledgePoints = [
  { name: "二次函数", proficiency: 85, status: "good" },
  { name: "三角函数", proficiency: 72, status: "improving" },
  { name: "导数", proficiency: 60, status: "needs-work" },
  { name: "积分", proficiency: 45, status: "needs-work" },
]

const getQuickPrompts = (t: (key: string) => string, difficulty: Difficulty, mode: Mode) => {
  const juniorPrompts = [
    t('quickPrompt.solveQuadratic'),
    t('quickPrompt.triangleArea'),
    t('quickPrompt.factoring'),
    t('quickPrompt.proportion'),
    t('quickPrompt.distanceFormula'),
    t('quickPrompt.probability'),
  ]

  const seniorPrompts = {
    solve: [
      t('quickPrompt.derivativeGeometry'),
      t('quickPrompt.matrixEquations'),
      t('quickPrompt.definiteIntegral'),
      t('quickPrompt.complexNumbers'),
      t('quickPrompt.vectorSpace'),
      t('quickPrompt.partialDerivative'),
    ],
    tutor: [
      t('quickPrompt.limitConcept'),
      t('quickPrompt.derivativeApplications'),
      t('quickPrompt.integrationMeaning'),
      t('quickPrompt.probabilityApplications'),
      t('quickPrompt.statisticsConcepts'),
      t('quickPrompt.mathModeling'),
    ],
    practice: [
      t('quickPrompt.quadraticApplications'),
      t('quickPrompt.trigonometryScenarios'),
      t('quickPrompt.derivativeProblems'),
      t('quickPrompt.statisticsProblems'),
      t('quickPrompt.geometryProofs'),
      t('quickPrompt.modelingProblems'),
    ],
    check: [
      t('quickPrompt.checkCalculus'),
      t('quickPrompt.verifyTrigonometry'),
      t('quickPrompt.reviewStatistics'),
      t('quickPrompt.analyzeProofs'),
      t('quickPrompt.evaluateModeling'),
      t('quickPrompt.verifyLinearAlgebra'),
    ]
  }

  // 如果是 junior 難度，返回基礎問題
  if (difficulty === "junior") {
    return juniorPrompts
  }

  // Senior 難度根據模式返回不同類型的問題
  return seniorPrompts[mode] || seniorPrompts.solve
}

const getCommandSuggestions = (t: (key: string) => string, hasStartedConversation: boolean) => [
  { cmd: "/hint", desc: t('cmd.hint') },
  { cmd: "/solve", desc: t('cmd.solve') },
  { cmd: "/check", desc: t('cmd.check') },
  { cmd: "/alt", desc: t('cmd.alt') },
  { cmd: "/practice", desc: t('cmd.practice') },
]

export default function ChatbotPage() {
  const { t, language, setLanguage } = useI18n()

  // 判斷是否為歡迎消息
  const isWelcomeMessage = (message: Message): boolean => {
    return message.id === 1 && message.role === "assistant" && message.content === t('chat.welcome')
  }

  // 獲取模式對應的背景顏色
  const getModeBackgroundColor = (mode: Mode): string => {
    switch (mode) {
      case "solve":
        return "bg-blue-500"
      case "tutor":
        return "bg-green-500"
      case "practice":
        return "bg-purple-500"
      case "check":
        return "bg-orange-500"
      default:
        return "bg-primary"
    }
  }

  // 獲取模式對應的圖標
  const getModeIcon = (mode: Mode): React.ComponentType<{ className?: string }> => {
    switch (mode) {
      case "solve":
        return Calculator
      case "tutor":
        return BookOpen
      case "practice":
        return Edit3
      case "check":
        return Search
      default:
        return Sparkles
    }
  }
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: t('chat.welcome'),
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>("senior")
  const [mode, setMode] = useState<Mode>("solve")
  const [showLeftSidebar, setShowLeftSidebar] = useState(false)
  const [hasStartedConversation, setHasStartedConversation] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [activeRightTab, setActiveRightTab] = useState("visualize")
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  // 當語言改變時，更新歡迎消息
  useEffect(() => {
    setMessages(prevMessages =>
      prevMessages.map(message =>
        message.id === 1
          ? { ...message, content: t('chat.welcome') }
          : message
      )
    )
  }, [language])

  // 初始化時始終開始新對話
  useEffect(() => {
    // 每次進入頁面都是新對話，不自動加載歷史對話
    setCurrentConversationId(null)
    // 重置對話狀態為默認值
    setMode('solve')
    setDifficulty('senior')
  }, [])

    const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [lastScrollPosition, setLastScrollPosition] = useState(0)

  const { isStreaming, streamingContent, streamingMCPCallInfos, startStreaming, stopStreaming, clearContent } = useStreaming()

  // 難度映射
  const difficultyMapping = {
    junior: 'K-6' as const,
    senior: 'High' as const
  }

  // 輔助函數：構建 ChatRequest
  const buildChatRequest = (
    messages: Message[],
    newMessage: string,
    customMode?: Mode,
    customInstructions?: string
  ): ChatRequest => {
    return {
      messages: [
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.timestamp.toISOString()
        })),
        {
          role: "user" as const,
          content: newMessage,
          timestamp: new Date().toISOString()
        }
      ],
      mode: (customMode || mode) as 'solve' | 'tutor' | 'practice' | 'check',
      difficulty: difficultyMapping[difficulty],
      language: language as 'zh-TW' | 'zh-CN' | 'en',
      streaming: true,
      userId: currentConversationId,
      sessionId: currentConversationId,
      customInstructions,
      metadata: {
        pageSource: 'chatbot'
      }
    }
  }

  const { toast } = useToast()

  // 智能滾動邏輯：只在用戶沒有手動滾動時自動滾動
  useEffect(() => {
    if (isStreaming && streamingContent && shouldAutoScroll && !isUserScrolling) {
      // 平滑滾動到底部
      scrollToBottom(true)
    }
  }, [streamingContent, isStreaming]) // 移除 shouldAutoScroll 和 isUserScrolling 依賴

  // 檢測用戶滾動行為 - 優化版本
  const handleScroll = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current
      const currentScrollTop = scrollElement.scrollTop
      const scrollHeight = scrollElement.scrollHeight
      const clientHeight = scrollElement.clientHeight
      const distanceFromBottom = scrollHeight - (currentScrollTop + clientHeight)

      // 使用 useRef 來避免不必要的重新渲染
      const wasAutoScroll = shouldAutoScrollRef.current
      const shouldNowAutoScroll = distanceFromBottom <= 100

      // 只有在狀態真正改變時才更新
      if (wasAutoScroll !== shouldNowAutoScroll) {
        shouldAutoScrollRef.current = shouldNowAutoScroll
        setShouldAutoScroll(shouldNowAutoScroll)
        setIsUserScrolling(!shouldNowAutoScroll)
      }

      setLastScrollPosition(currentScrollTop)
    }
  }, [setShouldAutoScroll, setIsUserScrolling])

  // 為 shouldAutoScroll 創建一個 ref 來避免依賴項變化
  const shouldAutoScrollRef = useRef(shouldAutoScroll)

  // 當 shouldAutoScroll 狀態更新時，同步更新 ref
  useEffect(() => {
    shouldAutoScrollRef.current = shouldAutoScroll
  }, [shouldAutoScroll])

  // 滾動行為檢測的節流函數 - 使用 useCallback
  const throttledHandleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(handleScroll, 150) // 增加節流時間
  }, [handleScroll])

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 流式內容開始時隱藏 loading 狀態（只在 isStreaming 變化時執行一次）
  useEffect(() => {
    if (isStreaming) {
      setIsLoading(false)
    }
  }, [isStreaming])

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自動滾動到底部
  const scrollToBottom = (smooth = false) => {
    if (scrollAreaRef.current) {
      if (smooth) {
        scrollAreaRef.current.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: 'smooth'
        })
      } else {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
      }
    }
  }

  useEffect(() => {
    // 只在非流式傳輸時自動滾動，且只在有新消息時滾動
    if (!isStreaming && messages.length > 0 && shouldAutoScroll) {
      const lastMessage = messages[messages.length - 1]
      // 只有當最後一條消息是新的（時間戳很近）時才自動滾動
      const now = new Date()
      const messageTime = lastMessage.timestamp
      const timeDiff = now.getTime() - messageTime.getTime()

      // 如果消息是最近5秒內創建的，才自動滾動
      if (timeDiff < 5000) {
        scrollToBottom()
      }
    }
  }, [messages, isLoading, isStreaming, shouldAutoScroll])

  // 發送消息時重置滾動狀態
  useEffect(() => {
    if (isLoading) {
      setShouldAutoScroll(true)
      setIsUserScrolling(false)
    }
  }, [isLoading])

  const handleSend = async () => {
    if (!input.trim() || isLoading || isStreaming) return

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    clearContent()

    // 標記對話已開始
    if (!hasStartedConversation) {
      setHasStartedConversation(true)
    }

    // 記錄用戶發送消息
    await logger.info('用戶發送消息', {
      component: 'chatbot-page',
      action: 'send_message',
      metadata: {
        mode,
        difficulty: difficultyMapping[difficulty],
        language,
        messageLength: input.length,
        conversationId: currentConversationId
      }
    })

    try {
      // 解析數學問題
      const mathProblem = parseMathProblem(input)

      // 構建 ChatRequest 使用輔助函數
      const chatRequest = buildChatRequest(messages, input)
      chatRequest.metadata!.mathProblem = mathProblem

      // 使用新的 ChatService 進行流式傳輸
      await startStreaming(chatRequest, {
        onComplete: (content, mcpCallInfos) => {
          console.log('🔧 Chatbot: Received MCP call infos in onComplete', mcpCallInfos)
          const parsedSolution = parseSolution(content, language)

          const assistantMessage: Message = {
            id: messages.length + 2,
            role: "assistant",
            content: content,
            timestamp: new Date(),
            steps: parsedSolution.steps.map((step) => ({
              id: step.id,
              title: step.title,
              content: step.content,
            })),
            hasAlternative: true,
            knowledgePoints: parsedSolution.knowledgePoints,
            mcpCallInfos: mcpCallInfos || [],
          }

          setMessages((prev) => [...prev, assistantMessage])
          setIsLoading(false)

          // 保存對話到conversationManager
          const updatedMessages = [...messages, userMessage, assistantMessage]
          const conversationTitle = input.length > 30 ? input.substring(0, 30) + "..." : input

          const difficultyMapping = {
            junior: 'K-6' as const,
            senior: 'High' as const
          }

          const conversationToSave = {
            id: currentConversationId || Date.now().toString(),
            title: conversationTitle,
            timestamp: new Date(),
            preview: input,
            messages: updatedMessages,
            mode: mode,
            difficulty: difficultyMapping[difficulty],
            language: language
          }

          conversationManager.saveConversation(conversationToSave)
          if (!currentConversationId) {
            setCurrentConversationId(conversationToSave.id)
          }

          // 分析對話中的錯誤
          const errors = errorTracker.analyzeConversation(conversationToSave.id, updatedMessages)
          errors.forEach(error => {
            errorTracker.addError(error)
          })

          // 流式傳輸完成後平滑滾動到底部
          setTimeout(() => {
            scrollToBottom(true)
          }, 100)
        },
        onError: (error) => {
          console.error('Streaming error:', error)
          
          const errorMessage: Message = {
            id: messages.length + 2,
            role: "assistant",
            content: `抱歉，處理您的問題時出現錯誤：${error.message}。請檢查您的網絡連接或稍後再試。`,
            timestamp: new Date(),
          }

          setMessages((prev) => [...prev, errorMessage])
          setIsLoading(false)
        }
      })
      
      // 流式傳輸開始時立即隱藏 loading 狀態
      setIsLoading(false)
    } catch (error) {
      console.error('Chat error:', error)
      
      const errorMessage: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: `抱歉，處理您的問題時出現錯誤：${error instanceof Error ? error.message : '未知錯誤'}。請檢查您的網絡連接或稍後再試。`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
      setIsLoading(false)
    }
  }

  const handleVisualize = async () => {
    if (!input.trim() || isLoading || isStreaming) return

    // 添加可視化提示到當前輸入
    const visualizePrompt = `${input}\n\n生成 Mermaid 流程圖展示解題思路`

    // 暫時修改輸入內容並調用 handleSend
    const originalInput = input
    setInput(visualizePrompt)

    // 使用 setTimeout 確保狀態更新完成後調用 handleSend
    setTimeout(() => {
      handleSend()
    }, 10)
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 複製答案功能
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: t('toast.copySuccess'),
        description: t('toast.copySuccessDesc'),
      })
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast({
        title: t('toast.copyError'),
        description: t('toast.copyErrorDesc'),
        variant: "destructive",
      })
    }
  }

  // 生成可視化圖表
  const generateVisualization = async (messageId: number) => {
    const assistantMessage = messages.find(m => m.id === messageId)
    if (!assistantMessage || assistantMessage.role !== 'assistant') return

    // 找到對應用戶問題
    const assistantIndex = messages.findIndex(m => m.id === messageId)
    if (assistantIndex === -1) return

    const userMessagesBeforeAssistant = messages.slice(0, assistantIndex)
    const lastUserMessage = [...userMessagesBeforeAssistant].reverse().find(m => m.role === 'user')

    if (!lastUserMessage) return

    setIsLoading(true)
    clearContent()

    try {
      // 構建可視化請求
      const requestBody = {
        messages: [
          ...messages.slice(0, assistantIndex + 1).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          {
            role: "user" as const,
            content: `基於上述解答生成 Mermaid 流程圖。請按照以下嚴格要求：

${getVisualizationPrompt(language as Language)}

語言要求：請使用 ${language === 'zh-TW' ? '繁體中文' : language === 'zh-CN' ? '简体中文' : 'English'} 作為圖表節點中的文字內容。

基於前面的對話內容，生成一個簡潔清晰的流程圖，只需要返回純 Mermaid 代碼。`,
            timestamp: new Date()
          }
        ],
        mode: 'solve' as Mode,
        difficulty,
        language,
      }

      // 構建完整的 ChatRequest
      const chatRequest: ChatRequest = {
        messages: requestBody.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        mode: requestBody.mode as 'solve' | 'tutor' | 'practice' | 'check',
        difficulty: requestBody.difficulty as 'K-6' | 'Middle' | 'High' | 'College' | 'Contest',
        language: requestBody.language as 'zh-TW' | 'zh-CN' | 'en',
        streaming: true,
        userId: currentConversationId,
        sessionId: currentConversationId,
        metadata: {
          pageSource: 'chatbot',
          visualization: true
        }
      }

      // 使用流式傳輸
      await startStreaming(chatRequest, {
        onComplete: (content, mcpCallInfos) => {
          console.log('🔧 Chatbot: Received MCP call infos in visualization', mcpCallInfos)
          const visualizationMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: `\`\`\`mermaid
${content}
\`\`\``,
            timestamp: new Date(),
            hasAlternative: false,
            knowledgePoints: ['可視化', '流程圖', '解題思路'],
            mcpCallInfos: mcpCallInfos || [],
          }

          // 添加可視化消息
          const updatedMessages = [...messages, visualizationMessage]
          setMessages(updatedMessages)
          setIsLoading(false)

          // 保存到conversationManager
          const conversationTitle = `${t('conversation.visualization')} - ${lastUserMessage.content.length > 30 ? lastUserMessage.content.substring(0, 30) + "..." : lastUserMessage.content}`

          const difficultyMapping = {
            junior: 'K-6' as const,
            senior: 'High' as const
          }

          const conversationToSave = {
            id: currentConversationId || Date.now().toString(),
            title: conversationTitle,
            timestamp: new Date(),
            preview: `可視化：${lastUserMessage.content}`,
            messages: updatedMessages,
            mode: mode,
            difficulty: difficultyMapping[difficulty],
            language: language
          }

          conversationManager.saveConversation(conversationToSave)
          if (!currentConversationId) {
            setCurrentConversationId(conversationToSave.id)
          }

          // 流式傳輸完成後平滑滾動到底部
          setTimeout(() => {
            scrollToBottom(true)
          }, 100)
        },
        onError: (error) => {
          console.error('Visualization generation error:', error)

          const errorMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: `${t('status.error')}: ${error.message}. ${t('status.retryLater')}`,
            timestamp: new Date(),
          }

          // 替換為錯誤消息
          setMessages((prev) => [...prev, errorMessage])
          setIsLoading(false)
        }
      })

      // 流式傳輸開始時立即隱藏 loading 狀態
      setIsLoading(false)
    } catch (error) {
      console.error('Visualization generation error:', error)
      setIsLoading(false)
    }
  }

  // 重新生成答案
  const regenerateAnswer = async (messageId: number) => {
    const assistantMessage = messages.find(m => m.id === messageId)
    if (!assistantMessage || assistantMessage.role !== 'assistant') return

    // 找到對應用戶問題的索引
    const assistantIndex = messages.findIndex(m => m.id === messageId)
    if (assistantIndex === -1) return
    
    // 獲取該助手消息之前的用戶消息
    const userMessagesBeforeAssistant = messages.slice(0, assistantIndex)
    const lastUserMessage = [...userMessagesBeforeAssistant].reverse().find(m => m.role === 'user')
    
    if (!lastUserMessage) return

    setIsLoading(true)
    clearContent()

    try {
      // 重新發送相同的問題
      const requestBody = {
        messages: [
          ...messages.slice(0, assistantIndex).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          {
            role: "user" as const,
            content: lastUserMessage.content,
            timestamp: lastUserMessage.timestamp
          }
        ],
        mode,
        difficulty,
        language,
      }

      // 構建完整的 ChatRequest
      const chatRequest: ChatRequest = {
        messages: requestBody.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        mode: requestBody.mode as 'solve' | 'tutor' | 'practice' | 'check',
        difficulty: requestBody.difficulty as 'K-6' | 'Middle' | 'High' | 'College' | 'Contest',
        language: requestBody.language as 'zh-TW' | 'zh-CN' | 'en',
        streaming: true,
        userId: currentConversationId,
        sessionId: currentConversationId,
        metadata: {
          pageSource: 'chatbot',
          regenerate: true
        }
      }

      // 使用流式傳輸
      await startStreaming(chatRequest, {
        onComplete: (content, mcpCallInfos) => {
          console.log('🔧 Chatbot: Received MCP call infos in alternative solution', mcpCallInfos)
          const parsedSolution = parseSolution(content, language)

          const newAssistantMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: content,
            timestamp: new Date(),
            steps: parsedSolution.steps.map((step) => ({
              id: step.id,
              title: step.title,
              content: step.content,
            })),
            hasAlternative: true,
            knowledgePoints: parsedSolution.knowledgePoints,
            mcpCallInfos: mcpCallInfos || [],
          }

          // 替換對應的助手消息
          setMessages((prev) => {
            const newMessages = [...prev]
            const messageIndex = newMessages.findIndex(m => m.id === messageId)
            if (messageIndex >= 0) {
              newMessages[messageIndex] = newAssistantMessage
            }
            return newMessages
          })
          
          setIsLoading(false)
          
          // 流式傳輸完成後平滑滾動到底部
          setTimeout(() => {
            scrollToBottom(true)
          }, 100)
        },
        onError: (error) => {
          console.error('Regeneration error:', error)
          
          const errorMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: `抱歉，重新生成答案時出現錯誤：${error.message}。請稍後再試。`,
            timestamp: new Date(),
          }

          // 替換為錯誤消息
          setMessages((prev) => {
            const newMessages = [...prev]
            const messageIndex = newMessages.findIndex(m => m.id === messageId)
            if (messageIndex >= 0) {
              newMessages[messageIndex] = errorMessage
            }
            return newMessages
          })
          
          setIsLoading(false)
        }
      })
      
      // 流式傳輸開始時立即隱藏 loading 狀態
      setIsLoading(false)
    } catch (error) {
      console.error('Regeneration error:', error)
      setIsLoading(false)
    }
  }

  // 生成練習題功能
  const generatePractice = async (messageId: number) => {
    const assistantMessage = messages.find(m => m.id === messageId)
    if (!assistantMessage || assistantMessage.role !== 'assistant') return

    // 找到對應用戶問題
    const assistantIndex = messages.findIndex(m => m.id === messageId)
    if (assistantIndex === -1) return
    
    const userMessagesBeforeAssistant = messages.slice(0, assistantIndex)
    const lastUserMessage = [...userMessagesBeforeAssistant].reverse().find(m => m.role === 'user')
    
    if (!lastUserMessage) return

    setIsLoading(true)
    clearContent()

    try {
      // 構建練習題請求
      const requestBody = {
        messages: [
          ...messages.slice(0, assistantIndex + 1).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          {
            role: "user" as const,
            content: "請根據上述問題生成3-5道類似的練習題，每題都要有詳細的解答步驟。",
            timestamp: new Date()
          }
        ],
        mode: 'practice' as Mode,
        difficulty,
        language,
      }

      // 構建完整的 ChatRequest
      const chatRequest: ChatRequest = {
        messages: requestBody.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        mode: requestBody.mode as 'solve' | 'tutor' | 'practice' | 'check',
        difficulty: requestBody.difficulty as 'K-6' | 'Middle' | 'High' | 'College' | 'Contest',
        language: requestBody.language as 'zh-TW' | 'zh-CN' | 'en',
        streaming: true,
        userId: currentConversationId,
        sessionId: currentConversationId,
        metadata: {
          pageSource: 'chatbot',
          practice: true
        }
      }

      // 使用流式傳輸
      await startStreaming(chatRequest, {
        onComplete: (content, mcpCallInfos) => {
          console.log('🔧 Chatbot: Received MCP call infos in practice', mcpCallInfos)
          const parsedSolution = parseSolution(content, language)

          const practiceMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: content,
            timestamp: new Date(),
            steps: parsedSolution.steps.map((step) => ({
              id: step.id,
              title: step.title,
              content: step.content,
            })),
            hasAlternative: false,
            knowledgePoints: parsedSolution.knowledgePoints,
            mcpCallInfos: mcpCallInfos || [],
          }

          // 添加練習題消息
          const updatedMessages = [...messages, practiceMessage]
          setMessages(updatedMessages)
          setIsLoading(false)

          // 保存到conversationManager
          const conversationTitle = `${t('conversation.practice')} - ${lastUserMessage.content.length > 30 ? lastUserMessage.content.substring(0, 30) + "..." : lastUserMessage.content}`

          const difficultyMapping = {
            junior: 'K-6' as const,
            senior: 'High' as const
          }

          const conversationToSave = {
            id: currentConversationId || Date.now().toString(),
            title: conversationTitle,
            timestamp: new Date(),
            preview: `練習題：${lastUserMessage.content}`,
            messages: updatedMessages,
            mode: 'practice' as Mode,
            difficulty: difficultyMapping[difficulty],
            language: language
          }

          conversationManager.saveConversation(conversationToSave)
          if (!currentConversationId) {
            setCurrentConversationId(conversationToSave.id)
          }

          // 流式傳輸完成後平滑滾動到底部
          setTimeout(() => {
            scrollToBottom(true)
          }, 100)
        },
        onError: (error) => {
          console.error('Practice generation error:', error)
          
          const errorMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: `抱歉，生成練習題時出現錯誤：${error.message}。請稍後再試。`,
            timestamp: new Date(),
          }

          setMessages((prev) => [...prev, errorMessage])
          setIsLoading(false)
        }
      })
      
      // 流式傳輸開始時立即隱藏 loading 狀態
      setIsLoading(false)
    } catch (error) {
      console.error('Practice generation error:', error)
      setIsLoading(false)
    }
  }

  // 生成另一種解法
  const generateAlternativeSolution = async (messageId: number) => {
    const assistantMessage = messages.find(m => m.id === messageId)
    if (!assistantMessage || assistantMessage.role !== 'assistant') return

    // 找到對應用戶問題
    const assistantIndex = messages.findIndex(m => m.id === messageId)
    if (assistantIndex === -1) return
    
    const userMessagesBeforeAssistant = messages.slice(0, assistantIndex)
    const lastUserMessage = [...userMessagesBeforeAssistant].reverse().find(m => m.role === 'user')
    
    if (!lastUserMessage) return

    setIsLoading(true)
    clearContent()

    try {
      // 構建請求另一種解法的消息
      const requestBody = {
        messages: [
          ...messages.slice(0, assistantIndex + 1).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          {
            role: "user" as const,
            content: "請提供另一種不同的解題方法和思路。",
            timestamp: new Date()
          }
        ],
        mode,
        difficulty,
        language,
      }

      // 構建完整的 ChatRequest
      const chatRequest: ChatRequest = {
        messages: requestBody.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        mode: requestBody.mode as 'solve' | 'tutor' | 'practice' | 'check',
        difficulty: requestBody.difficulty as 'K-6' | 'Middle' | 'High' | 'College' | 'Contest',
        language: requestBody.language as 'zh-TW' | 'zh-CN' | 'en',
        streaming: true,
        userId: currentConversationId,
        sessionId: currentConversationId,
        metadata: {
          pageSource: 'chatbot',
          alternativeSolution: true
        }
      }

      // 使用流式傳輸
      await startStreaming(chatRequest, {
        onComplete: (content, mcpCallInfos) => {
          console.log('🔧 Chatbot: Received MCP call infos in alternative method', mcpCallInfos)
          const parsedSolution = parseSolution(content, language)

          const alternativeMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: content,
            timestamp: new Date(),
            steps: parsedSolution.steps.map((step) => ({
              id: step.id,
              title: step.title,
              content: step.content,
            })),
            hasAlternative: false,
            mcpCallInfos: mcpCallInfos || [],
            knowledgePoints: parsedSolution.knowledgePoints,
          }

          // 添加另一種解法消息
          const updatedMessages = [...messages.slice(0, assistantIndex + 1), alternativeMessage]
          setMessages(updatedMessages)
          setIsLoading(false)

          // 保存到conversationManager
          const conversationTitle = `${t('conversation.alternative')} - ${lastUserMessage.content.length > 30 ? lastUserMessage.content.substring(0, 30) + "..." : lastUserMessage.content}`

          const difficultyMapping = {
            junior: 'K-6' as const,
            senior: 'High' as const
          }

          const conversationToSave = {
            id: currentConversationId || Date.now().toString(),
            title: conversationTitle,
            timestamp: new Date(),
            preview: `${t('conversation.alternative')}: ${lastUserMessage.content}`,
            messages: updatedMessages,
            mode: mode,
            difficulty: difficultyMapping[difficulty],
            language: language
          }

          conversationManager.saveConversation(conversationToSave)
          if (!currentConversationId) {
            setCurrentConversationId(conversationToSave.id)
          }

          // 流式傳輸完成後平滑滾動到底部
          setTimeout(() => {
            scrollToBottom(true)
          }, 100)
        },
        onError: (error) => {
          console.error('Alternative solution error:', error)
          
          const errorMessage: Message = {
            id: Date.now(),
            role: "assistant",
            content: `${t('status.error')}: ${error.message}. ${t('status.retryLater')}`,
            timestamp: new Date(),
          }

          setMessages((prev) => [...prev, errorMessage])
          setIsLoading(false)
        }
      })
      
      // 流式傳輸開始時立即隱藏 loading 狀態
      setIsLoading(false)
    } catch (error) {
      console.error('Alternative solution error:', error)
      setIsLoading(false)
    }
  }

  const getLanguageLabel = (lang: Language) => {
    switch (lang) {
      case "zh-TW":
        return t('lang.traditionalChinese')
      case "zh-CN":
        return t('lang.simplifiedChinese')
      case "en":
        return t('lang.english')
    }
  }

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case "junior":
        return t('difficulty.junior')
      case "senior":
        return t('difficulty.senior')
    }
  }

  const getModeLabel = (m: Mode) => {
    switch (m) {
      case "solve":
        return t('mode.solve')
      case "tutor":
        return t('mode.tutor')
      case "practice":
        return t('mode.practice')
      case "check":
        return t('mode.check')
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden fixed inset-0">
      <div className="border-b bg-background fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2">
            <Sheet open={showLeftSidebar} onOpenChange={setShowLeftSidebar}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>{t('sidebar.learningCenter')}</SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="conversations" className="w-full h-full flex flex-col">
                  <TabsList className="w-full grid grid-cols-3 h-8">
                  <TabsTrigger value="conversations" className="text-xs">{t('sidebar.conversations')}</TabsTrigger>
                  <TabsTrigger value="errors" className="text-xs">{t('sidebar.errors')}</TabsTrigger>
                  <TabsTrigger value="progress" className="text-xs">{t('sidebar.progress')}</TabsTrigger>
                </TabsList>
                  <TabsContent value="conversations" className="p-4 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">{t('conversation.title')}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          // Start new conversation
                          setCurrentConversationId(null)
                          setMessages([{
                            id: 1,
                            role: "assistant",
                            content: t('chat.welcome'),
                            timestamp: new Date(),
                          }])
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t('conversation.new')}
                      </Button>
                    </div>
                    {typeof window !== 'undefined' && (() => {
                      try {
                        const conversations = conversationManager.getAllConversations()
                        return conversations.slice(0, 10).map((conv) => (
                          <Card key={conv.id} className="p-3 cursor-pointer hover:bg-accent transition-colors">
                            <div className="flex items-start justify-between">
                              <div
                                className="flex-1"
                                onClick={() => {
                                  // Load conversation
                                  setCurrentConversationId(conv.id)
                                  setMessages(conv.messages)
                                  setMode(conv.mode)
                                  setDifficulty(conv.difficulty === 'K-6' || conv.difficulty === 'Middle' ? 'junior' : 'senior')
                                  setLanguage(conv.language)
                                  setShowLeftSidebar(false)
                                }}
                              >
                                <h4 className="font-medium text-sm mb-1">{conv.title}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-1">{conv.preview}</p>
                                <span className="text-xs text-muted-foreground mt-1 block">
                                  {conv.timestamp.toLocaleDateString("zh-CN")}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 ml-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  conversationManager.deleteConversation(conv.id)
                                  // Force re-render by updating state
                                  setCurrentConversationId(prev => prev === conv.id ? null : prev)
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          </Card>
                        ))
                      } catch (error) {
                        console.error('Failed to load conversations:', error)
                        return null
                      }
                    })()}

                    {typeof window !== 'undefined' && (() => {
                      try {
                        const conversations = conversationManager.getAllConversations()
                        return conversations.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('conversation.noConversations')}</p>
                          </div>
                        )
                      } catch (error) {
                        console.error('Failed to check conversations empty:', error)
                        return null
                      }
                    })()}
                  </TabsContent>
                  <TabsContent value="errors" className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">{t('error.title')}</h4>
                        <Badge variant="outline" className="text-xs">
                          {(() => {
                            try {
                              if (typeof window === 'undefined') return 0
                              return errorTracker.getAllErrors().length
                            } catch (error) {
                              console.error('Failed to load error count:', error)
                              return 0
                            }
                          })()} {t('error.total')}
                        </Badge>
                      </div>

                      {(() => {
                        try {
                          const errors = typeof window !== 'undefined' ? errorTracker.getAllErrors() : []
                          const errorCategories = errorTracker.getErrorCategories()

                          return errors.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('error.noErrors')}</p>
                          </div>
                        ) : (
                          errors.slice(0, 5).map((error) => {
                            const category = errorCategories.find(cat => cat.id === error.category)
                            return (
                              <Card key={error.id} className="p-3">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">{category?.name || '錯誤'}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">{error.userMistake}</p>
                                    <div className="flex gap-1 mt-2">
                                      {error.knowledgePoints.slice(0, 2).map((point, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {point}
                                        </Badge>
                                      ))}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-xs text-muted-foreground">
                                        {(() => {
                                          const date = error.timestamp ? new Date(error.timestamp) : new Date();
                                          return date instanceof Date && !isNaN(date.getTime())
                                            ? date.toLocaleDateString("zh-CN")
                                            : new Date().toLocaleDateString("zh-CN");
                                        })()}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-6"
                                        onClick={() => {
                                          // 加載包含該錯誤的對話
                                          const conversation = conversationManager.getAllConversations()
                                            .find(conv => conv.id === error.conversationId)
                                          if (conversation) {
                                            setCurrentConversationId(conversation.id)
                                            setMessages(conversation.messages)
                                            setMode(conversation.mode)
                                            setDifficulty(conversation.difficulty === 'K-6' || conversation.difficulty === 'Middle' ? 'junior' : 'senior')
                                            setLanguage(conversation.language)
                                            setShowLeftSidebar(false)
                                          }
                                        }}
                                      >
                                        {t('error.review')}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            )
                          })
                        )
                        } catch (error) {
                          console.error('Failed to load errors:', error)
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">無法加載錯誤記錄</p>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  </TabsContent>
                  <TabsContent value="progress" className="p-4">
                    <div className="space-y-4">
                      {(() => {
                        try {
                          if (typeof window === 'undefined') return null
                          const progress = progressAnalyzer.analyzeProgress()
                          const suggestions = progressAnalyzer.getLearningSuggestions(progress, language, mode)

                        return (
                          <>
                            {/* 總體統計 */}
                            <div className="grid grid-cols-2 gap-2">
                              <Card className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs font-medium">{t('progress.studyTime')}</span>
                                </div>
                                <div className="text-lg font-semibold">{Math.round(progress.totalStudyTime)}</div>
                                <div className="text-xs text-muted-foreground">{t('general.minutes')}</div>
                              </Card>

                              <Card className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Target className="h-3 w-3 text-green-500" />
                                  <span className="text-xs font-medium">{t('progress.totalProblems')}</span>
                                </div>
                                <div className="text-lg font-semibold">{progress.totalProblems}</div>
                                <div className="text-xs text-muted-foreground">{t('general.problems')}</div>
                              </Card>

                              <Card className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <TrendingUp className="h-3 w-3 text-purple-500" />
                                  <span className="text-xs font-medium">{t('progress.accuracyRate')}</span>
                                </div>
                                <div className="text-lg font-semibold">{progress.overallAccuracy}%</div>
                                <div className="text-xs text-muted-foreground">{t('general.accuracy')}</div>
                              </Card>

                              <Card className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="h-3 w-3 text-orange-500" />
                                  <span className="text-xs font-medium">{t('progress.currentStreak')}</span>
                                </div>
                                <div className="text-lg font-semibold">{progress.currentStreak}</div>
                                <div className="text-xs text-muted-foreground">{t('general.days')}</div>
                              </Card>
                            </div>

                            {/* 知識點掌握度 */}
                            <div>
                              <h4 className="font-medium text-sm mb-3">{t('progress.knowledgePoints')}</h4>
                              <div className="space-y-3">
                                {progress.knowledgePoints.slice(0, 5).map((point) => (
                                  <div key={point.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span>{point.name}</span>
                                      <span className="text-muted-foreground">{point.masteryLevel}%</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${
                                          point.masteryLevel >= 80
                                            ? "bg-green-500"
                                            : point.masteryLevel >= 60
                                              ? "bg-yellow-500"
                                              : "bg-red-500"
                                        }`}
                                        style={{ width: `${point.masteryLevel}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                      <span>{point.problemCount} {t('general.problems')}</span>
                                      <span>{point.category}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 學習建議 */}
                            <Card className="p-3 bg-primary/5 border-primary/20">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                                <div>
                                  <h4 className="font-medium text-sm">{t('progress.suggestions')}</h4>
                                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    {suggestions.map((suggestion, index) => (
                                      <li key={index}>• {suggestion}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </Card>
                          </>
                        )
                        } catch (error) {
                          console.error('Failed to load progress:', error)
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">無法加載進度數據</p>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>

            <h1 className="font-semibold text-lg">{t('nav.chat')}</h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">{getLanguageLabel(language)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t('lang.select')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLanguage("zh-TW")}>{t('lang.traditionalChinese')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("zh-CN")}>{t('lang.simplifiedChinese')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")}>{t('lang.english')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Difficulty Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">{getDifficultyLabel(difficulty)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t('difficulty.select')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDifficulty("junior")}>{t('difficulty.junior')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficulty("senior")}>{t('difficulty.senior')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mode Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">{getModeLabel(mode)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t('mode.select')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMode("solve")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('mode.solve')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("tutor")}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {t('mode.tutor')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("practice")}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('mode.practice')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("check")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('mode.check')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


            {/* Compliance Button */}
            <CompliancePanel />

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('nav.newConversation')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  {t('nav.exportConversation')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('nav.share')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('nav.settings')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mode indicator */}
        <div className="px-4 pb-2">
          <Badge className={`${getModeBackgroundColor(mode)} text-white text-xs`}>
            {getModeLabel(mode)} · {getDifficultyLabel(difficulty)}
          </Badge>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden pt-[88px]">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col max-w-screen-lg mx-auto w-full px-2 sm:px-4">
          {/* 消息滾動區域 */}
          <div
            className="flex-1 overflow-y-auto px-4 pb-32"
            ref={scrollAreaRef}
            onScroll={throttledHandleScroll}
          >
            <div className="py-3 space-y-3 pb-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                  {message.role === "assistant" && (() => {
                    const ModeIcon = getModeIcon(mode)
                    return (
                      <Avatar className={`h-8 w-8 shrink-0 ${getModeBackgroundColor(mode)}`}>
                        <AvatarFallback className={`${getModeBackgroundColor(mode)} text-white`}>
                          <ModeIcon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )
                  })()}
                  <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] ${message.role === "user" ? "flex flex-col items-end" : ""}`}>
                    <div
                      className={`p-2.5 ${message.role === "user" ? "bg-primary text-primary-foreground rounded-lg" : "bg-background rounded-lg border"}`}
                    >
                             <div className="text-sm leading-relaxed">
                               <MarkdownRenderer
                                 content={message.content}
                                 mcpCallInfo={message.mcpCallInfos}
                                 onRetry={() => {
                                   // 如果是可視化消息，則重新生成可視化
                                   if (message.content.includes('```mermaid')) {
                                     generateVisualization(message.id)
                                   }
                                 }}
                               />
                             </div>

                      {message.steps && !isWelcomeMessage(message) && (
                        <div className="mt-3 space-y-3">
                          {message.steps.map((step) => (
                            <div key={step.id} className="p-2">
                              {step.title && (
                                <div className="text-xs font-medium mb-1 text-muted-foreground">
                                  {step.title}
                                </div>
                              )}
                              <div className="text-sm leading-relaxed">
                                <MarkdownRenderer content={step.content} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <span className="text-xs opacity-70" suppressHydrationWarning>
                        {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {message.role === "assistant" && !isWelcomeMessage(message) && (
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-transparent"
                          onClick={() => copyToClipboard(message.content)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {t('action.copy')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-transparent"
                          onClick={() => regenerateAnswer(message.id)}
                          disabled={isLoading}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          {t('action.regenerate')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                          <Lightbulb className="h-3 w-3 mr-1" />
                          {t('action.hint')}
                        </Button>
                        {message.hasAlternative && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs bg-transparent"
                            onClick={() => generateAlternativeSolution(message.id)}
                            disabled={isLoading || isStreaming}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {t('action.alternative')}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-transparent"
                          onClick={() => generateVisualization(message.id)}
                          disabled={isLoading || isStreaming}
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          {t('action.visualize')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-transparent"
                          onClick={() => generatePractice(message.id)}
                          disabled={isLoading || isStreaming}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {t('action.practice')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                          <Bookmark className="h-3 w-3 mr-1" />
                          {t('action.bookmark')}
                        </Button>
                      </div>
                    )}

                    {message.knowledgePoints && message.knowledgePoints.length > 0 && !isWelcomeMessage(message) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {message.knowledgePoints.map((point) => (
                          <Badge key={point} variant="secondary" className="text-xs">
                            {point}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback>我</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
                     {isLoading && (() => {
                       const ModeIcon = getModeIcon(mode)
                       return (
                         <div className="flex gap-3">
                           <Avatar className={`h-8 w-8 shrink-0 ${getModeBackgroundColor(mode)}`}>
                             <AvatarFallback className={`${getModeBackgroundColor(mode)} text-white`}>
                               <ModeIcon className="h-4 w-4" />
                             </AvatarFallback>
                           </Avatar>
                           <Card className="max-w-[80%] p-2.5 bg-card">
                             <div className="flex gap-1">
                               <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                               <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                               <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                             </div>
                             <div className="text-sm text-muted-foreground ml-2">{t('chat.generating')}</div>
                           </Card>
                         </div>
                       )
                     })()}

                     {/* 流式內容顯示 */}
                     {isStreaming && streamingContent && (() => {
                       const ModeIcon = getModeIcon(mode)
                       return (
                         <div className="flex gap-3">
                           <Avatar className={`h-8 w-8 shrink-0 ${getModeBackgroundColor(mode)}`}>
                             <AvatarFallback className={`${getModeBackgroundColor(mode)} text-white`}>
                               <ModeIcon className="h-4 w-4" />
                             </AvatarFallback>
                           </Avatar>
                           <Card className="max-w-[80%] p-2.5 bg-card">
                             <div className="text-sm leading-relaxed">
                               <MarkdownRenderer content={streamingContent} />
                             </div>
                             <div className="flex items-center gap-1 mt-2">
                               <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                               <span className="text-xs text-muted-foreground">{t('chat.generating')}</span>
                             </div>
                           </Card>
                         </div>
                       )
                     })()}

                     {/* 快速提示區域 - 移到滾動區域內部 */}
                     {messages.length === 1 && (
                       <div className="px-4 pb-6">
                         <p className="text-sm text-muted-foreground mb-2">{t('chat.tryThese')}</p>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                           {getQuickPrompts(t, difficulty, mode).slice(0, 4).map((prompt) => (
                             <Button
                               key={prompt}
                               variant="outline"
                               size="sm"
                               className="h-auto py-1.5 px-2.5 text-xs whitespace-normal text-left justify-start bg-transparent"
                               onClick={() => handleQuickPrompt(prompt)}
                             >
                               {prompt}
                             </Button>
                           ))}
                         </div>
                       </div>
                     )}
            </div>

            {/* 滾動控制按鈕 */}
            {isStreaming && !shouldAutoScroll && (
              <div className="fixed bottom-24 right-6 z-30 md:bottom-8 md:right-8">
                <Button
                  onClick={() => {
                    setShouldAutoScroll(true)
                    setIsUserScrolling(false)
                    scrollToBottom(true)
                  }}
                  size="sm"
                  className="shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                  title={t('action.scrollToBottom')}
                >
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {t('action.scrollToBottom')}
                  </span>
                </Button>
              </div>
            )}

            {/* 自動滾動狀態指示器 */}
            {isStreaming && shouldAutoScroll && (
              <div className="fixed bottom-24 right-6 z-30 md:bottom-8 md:right-8">
                <div className="bg-muted/80 text-muted-foreground px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                  {t('status.autoScrollOn')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 輸入區域 - 固定在底部，獨立於滾動區域 */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-2 z-40 md:bottom-4">
        <div className="max-w-screen-lg mx-auto">
          {input.startsWith("/") && (
            <div className="mb-2 p-2 bg-accent/50 rounded-lg">
              <p className="text-xs font-medium mb-1">{t('cmd.suggestions')}</p>
              <div className="flex flex-wrap gap-1">
                {getCommandSuggestions(t, hasStartedConversation)
                  .filter((cmd) => cmd.cmd.startsWith(input.toLowerCase()))
                  .map((cmd) => (
                    <Button
                      key={cmd.cmd}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setInput(cmd.cmd + " ")}
                    >
                      {cmd.cmd} - {cmd.desc}
                    </Button>
                  ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ImageIcon className="h-5 w-5" />
            </Button>
            {hasStartedConversation && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleVisualize}
                disabled={!input.trim() || isLoading}
                title={t('action.visualize')}
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder={t('chat.placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[40px] max-h-[100px] resize-none"
                rows={1}
              />
            </div>
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading} className="shrink-0">
              <Send className="h-5 w-5" />
            </Button>
          </div>
          </div>
      </div>

      {showRightPanel && (
        <div className="w-80 md:w-96 lg:w-[400px] border-l bg-background overflow-hidden flex flex-col">
          <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex-1 flex flex-col">
            <TabsList className={`w-full grid rounded-none border-b ${hasStartedConversation ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="visualize" className="text-xs">
                {t('sidebar.visualize')}
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="text-xs">
                {t('sidebar.knowledge')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="visualize" className="flex-1 p-4 mt-0">
              <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('visual.title')}</p>
                  <p className="text-xs mt-1">{t('visual.desc')}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="knowledge" className="flex-1 p-4 mt-0 overflow-auto">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">{t('knowledge.currentProblem')}</h4>
                    <div className="space-y-2">
                      <Card className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="font-medium text-sm">二次方程</h5>
                          <Badge variant="secondary" className="text-xs">
                            {t('knowledge.proficient')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">标准形式：ax² + bx + c = 0</p>
                      </Card>
                      <Card className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="font-medium text-sm">因式分解</h5>
                          <Badge variant="secondary" className="text-xs">
                            {t('knowledge.good')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">将多项式分解为因式的乘积</p>
                      </Card>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">{t('knowledge.commonErrors')}</h4>
                    <Card className="p-3 bg-destructive/5 border-destructive/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{t('error.sign')}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t('error.signDesc')}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <MobileNav />
    </div>
  )
}
