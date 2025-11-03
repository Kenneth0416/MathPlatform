"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
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
  PenTool,
  Grid3x3,
  FileText,
  Paperclip,
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
import { parseMathProblem } from "@/lib/math-parser"
import { parseSolution } from "@/lib/solution-parser"
import { conversationManager } from "@/lib/conversation-manager"
import { useStreaming } from "@/hooks/use-streaming"

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
}

interface Conversation {
  id: string
  title: string
  timestamp: Date
  preview: string
}

type Language = "zh-TW" | "zh-CN" | "en"
type Difficulty = "K-6" | "Middle" | "High" | "College" | "Contest"
type Mode = "solve" | "tutor" | "practice" | "check" | "board"

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

const quickPrompts = [
  "如何解二次方程？",
  "三角函数的应用",
  "导数的几何意义",
  "排列组合怎么算？",
  "积分的基本方法",
  "向量的运算规则",
]

const commandSuggestions = [
  { cmd: "/hint", desc: "获取提示" },
  { cmd: "/solve", desc: "直接求解" },
  { cmd: "/check", desc: "检查步骤" },
  { cmd: "/alt", desc: "另一种解法" },
  { cmd: "/visualize", desc: "图形化展示" },
  { cmd: "/practice", desc: "生成练习题" },
]

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "你好！我是你的数学学习助手。我可以帮你解答数学问题、提供逐步提示、生成练习题。有什么我可以帮助你的吗？",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<Language>("zh-CN")
  const [difficulty, setDifficulty] = useState<Difficulty>("High")
  const [mode, setMode] = useState<Mode>("solve")
  const [showLeftSidebar, setShowLeftSidebar] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [activeRightTab, setActiveRightTab] = useState("whiteboard")
  const [whiteboardContent, setWhiteboardContent] = useState("")
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  
  const { isStreaming, streamingContent, startStreaming, stopStreaming, clearContent } = useStreaming()

  // 流式內容滾動效果
  useEffect(() => {
    if (isStreaming && streamingContent) {
      // 流式內容開始時隱藏 loading 狀態
      setIsLoading(false)
      // 平滑滾動到底部
      setTimeout(() => {
        scrollToBottom(true)
      }, 50)
    }
  }, [streamingContent, isStreaming])

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

    try {
      // 解析數學問題
      const mathProblem = parseMathProblem(input)
      
      // 構建 API 請求
      const requestBody = {
        messages: [
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          {
            role: "user" as const,
            content: input,
            timestamp: new Date()
          }
        ],
        mode,
        difficulty,
        language,
      }

      // 使用流式傳輸
      await startStreaming('/api/chat/stream', requestBody, {
        onComplete: (content) => {
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
          }

          setMessages((prev) => [...prev, assistantMessage])
          setIsLoading(false)
          
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
      // 可以在這裡添加 toast 通知
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  // 重新生成答案
  const regenerateAnswer = async (messageId: number) => {
    const message = messages.find(m => m.id === messageId)
    if (!message || message.role !== 'user') return

    setIsLoading(true)
    try {
      // 重新發送相同的問題
      const requestBody = {
        messages: [
          ...messages.slice(0, messages.findIndex(m => m.id === messageId)).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          {
            role: "user" as const,
            content: message.content,
            timestamp: message.timestamp
          }
        ],
        mode,
        difficulty,
        language,
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const parsedSolution = parseSolution(data.text, language)
      
      const assistantMessage: Message = {
        id: Date.now(),
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
        steps: parsedSolution.steps.map((step) => ({
          id: step.id,
          title: step.title,
          content: step.content,
        })),
        hasAlternative: true,
        knowledgePoints: parsedSolution.knowledgePoints,
      }

      // 替換最後一個助手消息
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastAssistantIndex = newMessages.findLastIndex(m => m.role === 'assistant')
        if (lastAssistantIndex >= 0) {
          newMessages[lastAssistantIndex] = assistantMessage
        } else {
          newMessages.push(assistantMessage)
        }
        return newMessages
      })
    } catch (error) {
      console.error('Regeneration error:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const getLanguageLabel = (lang: Language) => {
    switch (lang) {
      case "zh-TW":
        return "繁體中文"
      case "zh-CN":
        return "简体中文"
      case "en":
        return "English"
    }
  }

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case "K-6":
        return "小学"
      case "Middle":
        return "初中"
      case "High":
        return "高中"
      case "College":
        return "大学"
      case "Contest":
        return "竞赛"
    }
  }

  const getModeLabel = (m: Mode) => {
    switch (m) {
      case "solve":
        return "解题模式"
      case "tutor":
        return "辅导模式"
      case "practice":
        return "练习生成"
      case "check":
        return "批改验证"
      case "board":
        return "白板模式"
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
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>学习中心</SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="conversations" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="conversations">对话</TabsTrigger>
                    <TabsTrigger value="errors">错题</TabsTrigger>
                    <TabsTrigger value="progress">进度</TabsTrigger>
                  </TabsList>
                  <TabsContent value="conversations" className="p-4 space-y-2">
                    {mockConversations.map((conv) => (
                      <Card key={conv.id} className="p-3 cursor-pointer hover:bg-accent transition-colors">
                        <h4 className="font-medium text-sm mb-1">{conv.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{conv.preview}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {conv.timestamp.toLocaleDateString("zh-CN")}
                        </span>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="errors" className="p-4">
                    <div className="space-y-3">
                      <Card className="p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">因式分解错误</h4>
                            <p className="text-xs text-muted-foreground mt-1">x² + 5x + 6 分解时符号错误</p>
                            <div className="flex gap-1 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                二次方程
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                因式分解
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">三角函数混淆</h4>
                            <p className="text-xs text-muted-foreground mt-1">sin 和 cos 的定义记混</p>
                            <div className="flex gap-1 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                三角函数
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="progress" className="p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-3">知识点掌握度</h4>
                        <div className="space-y-3">
                          {knowledgePoints.map((point) => (
                            <div key={point.name}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{point.name}</span>
                                <span className="text-muted-foreground">{point.proficiency}%</span>
                              </div>
                              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    point.status === "good"
                                      ? "bg-green-500"
                                      : point.status === "improving"
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${point.proficiency}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Card className="p-3 bg-primary/5 border-primary/20">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <h4 className="font-medium text-sm">学习建议</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              建议加强积分和导数的练习，可以从基础题开始逐步提升。
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>

            <h1 className="font-semibold text-lg">AI 对话</h1>
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
                <DropdownMenuLabel>选择语言</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLanguage("zh-TW")}>繁體中文</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("zh-CN")}>简体中文</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")}>English</DropdownMenuItem>
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
                <DropdownMenuLabel>选择难度</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDifficulty("K-6")}>小学 (K-6)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficulty("Middle")}>初中</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficulty("High")}>高中</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficulty("College")}>大学</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficulty("Contest")}>竞赛</DropdownMenuItem>
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
                <DropdownMenuLabel>选择模式</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMode("solve")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  解题模式
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("tutor")}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  辅导模式
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("practice")}>
                  <FileText className="h-4 w-4 mr-2" />
                  练习生成
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("check")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  批改验证
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("board")}>
                  <PenTool className="h-4 w-4 mr-2" />
                  白板模式
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


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
                  新对话
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  导出对话
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4 mr-2" />
                  分享
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setShowRightPanel(!showRightPanel)}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mode indicator */}
        <div className="px-4 pb-2">
          <Badge variant="secondary" className="text-xs">
            {getModeLabel(mode)} · {getDifficultyLabel(difficulty)}
          </Badge>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden pt-[88px]">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col max-w-screen-lg mx-auto w-full px-2 sm:px-4">
          {/* 消息滾動區域 */}
          <div className="flex-1 overflow-y-auto px-4 pb-32" ref={scrollAreaRef}>
            <div className="py-3 space-y-3 pb-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 shrink-0 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Sparkles className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] ${message.role === "user" ? "flex flex-col items-end" : ""}`}>
                    <Card
                      className={`p-2.5 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}
                    >
                             <div className="text-sm leading-relaxed">
                               <MarkdownRenderer content={message.content} />
                             </div>

                      {message.steps && (
                        <div className="mt-2 space-y-2">
                          {message.steps.map((step) => (
                            <div key={step.id} className="border rounded-lg p-2.5 bg-muted/30">
                              {step.title && (
                                <div className="text-xs font-medium mb-1.5 text-muted-foreground">
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

                      <span className="text-xs opacity-70 mt-1.5 block">
                        {message.timestamp.toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </Card>

                    {message.role === "assistant" && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs bg-transparent"
                          onClick={() => copyToClipboard(message.content)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          複製
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs bg-transparent"
                          onClick={() => regenerateAnswer(message.id)}
                          disabled={isLoading}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          重新生成
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                          <Lightbulb className="h-3 w-3 mr-1" />
                          提示
                        </Button>
                        {message.hasAlternative && (
                          <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                            <Sparkles className="h-3 w-3 mr-1" />
                            另一种解法
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          图形化
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                          <FileText className="h-3 w-3 mr-1" />
                          生成练习
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                          <Bookmark className="h-3 w-3 mr-1" />
                          收藏
                        </Button>
                      </div>
                    )}

                    {message.knowledgePoints && message.knowledgePoints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
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
                     {isLoading && (
                       <div className="flex gap-3">
                         <Avatar className="h-8 w-8 shrink-0 bg-primary">
                           <AvatarFallback className="bg-primary text-primary-foreground">
                             <Sparkles className="h-4 w-4" />
                           </AvatarFallback>
                         </Avatar>
                         <Card className="max-w-[80%] p-2.5 bg-card">
                           <div className="flex gap-1">
                             <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                             <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                             <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                           </div>
                         </Card>
                       </div>
                     )}

                     {/* 流式內容顯示 */}
                     {isStreaming && streamingContent && (
                       <div className="flex gap-3">
                         <Avatar className="h-8 w-8 shrink-0 bg-primary">
                           <AvatarFallback className="bg-primary text-primary-foreground">
                             <Sparkles className="h-4 w-4" />
                           </AvatarFallback>
                         </Avatar>
                         <Card className="max-w-[80%] p-2.5 bg-card">
                           <div className="text-sm leading-relaxed">
                             <MarkdownRenderer content={streamingContent} />
                           </div>
                           <div className="flex items-center gap-1 mt-2">
                             <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                             <span className="text-xs text-muted-foreground">正在生成...</span>
                           </div>
                         </Card>
                       </div>
                     )}

                     {/* 快速提示區域 - 移到滾動區域內部 */}
                     {messages.length === 1 && (
                       <div className="px-4 pb-6">
                         <p className="text-sm text-muted-foreground mb-2">试试这些问题：</p>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                           {quickPrompts.slice(0, 4).map((prompt) => (
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
          </div>
        </div>
      </div>

      {/* 輸入區域 - 固定在底部，獨立於滾動區域 */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-3 z-40">
        <div className="max-w-screen-lg mx-auto">
          {input.startsWith("/") && (
            <div className="mb-2 p-2 bg-accent/50 rounded-lg">
              <p className="text-xs font-medium mb-1">命令建议：</p>
              <div className="flex flex-wrap gap-1">
                {commandSuggestions
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
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="h-5 w-5" />
            </Button>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="输入你的数学问题或使用 / 命令..."
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
          <p className="text-xs text-muted-foreground mt-1.5 text-center">按 Enter 发送，Shift + Enter 换行</p>
        </div>
      </div>

      {showRightPanel && (
        <div className="w-80 md:w-96 lg:w-[400px] border-l bg-background overflow-hidden flex flex-col">
          <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex-1 flex flex-col">
            <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
              <TabsTrigger value="whiteboard" className="text-xs">
                白板
              </TabsTrigger>
              <TabsTrigger value="visualize" className="text-xs">
                图形
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="text-xs">
                知识点
              </TabsTrigger>
            </TabsList>
            <TabsContent value="whiteboard" className="flex-1 p-4 mt-0">
              <div className="space-y-3">
                <div className="flex gap-1 flex-wrap">
                  {["∑", "∫", "√", "π", "θ", "α", "β", "∞", "≈", "≠", "≤", "≥"].map((symbol) => (
                    <Button
                      key={symbol}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-transparent"
                      onClick={() => setWhiteboardContent((prev) => prev + symbol)}
                    >
                      {symbol}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="在这里草稿推演..."
                  value={whiteboardContent}
                  onChange={(e) => setWhiteboardContent(e.target.value)}
                  className="min-h-[300px] font-mono"
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs bg-transparent">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    检查步骤
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs bg-transparent">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI 接续
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="visualize" className="flex-1 p-4 mt-0">
              <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">图形化视窗</p>
                  <p className="text-xs mt-1">点击消息中的"图形化"按钮</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="knowledge" className="flex-1 p-4 mt-0 overflow-auto">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">本题涉及知识点</h4>
                    <div className="space-y-2">
                      <Card className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="font-medium text-sm">二次方程</h5>
                          <Badge variant="secondary" className="text-xs">
                            熟练
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">标准形式：ax² + bx + c = 0</p>
                      </Card>
                      <Card className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="font-medium text-sm">因式分解</h5>
                          <Badge variant="secondary" className="text-xs">
                            良好
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">将多项式分解为因式的乘积</p>
                      </Card>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">常见错误</h4>
                    <Card className="p-3 bg-destructive/5 border-destructive/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">符号错误</p>
                          <p className="text-xs text-muted-foreground mt-1">注意因式分解时的正负号</p>
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
