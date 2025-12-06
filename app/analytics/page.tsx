"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Clock, MessageSquare, TrendingUp, Award, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n-context"

interface Analytics {
  userStats: {
    studyTimeHours: number
    totalQuestions: number
    joinDate: string
  }
  conversationsByMode: Array<{ mode: string; count: number }>
  conversationsByDifficulty: Array<{ difficulty: string; count: number }>
  studyStreak: {
    current: number
    longest: number
    lastStudyDate?: string
  }
  dailyActivity: Array<{ date: string; count: number }>
  hourlyActivity: Array<{ hour: string; count: number }>
  insights: string[]
  period: string
}

export default function AnalyticsPage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const { t } = useI18n()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [user, period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?period=${period}`)
      if (!response.ok) throw new Error("Failed to fetch analytics")

      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (error) {
      console.error("Analytics error:", error)
      toast({
        title: "載入失敗",
        description: "無法載入學習分析數據",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">無法載入分析數據</h2>
          <Button onClick={fetchAnalytics}>重試</Button>
        </div>
      </div>
    )
  }

  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      solve: "解題模式",
      tutor: "輔導模式",
      practice: "練習生成",
      check: "批改驗證"
    }
    return labels[mode] || mode
  }

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      "K-6": "小學",
      "Middle": "初中",
      "High": "高中",
      "College": "大學",
      "Contest": "競賽"
    }
    return labels[difficulty] || difficulty
  }

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      week: "本週",
      month: "本月",
      year: "今年"
    }
    return labels[period] || period
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">學習分析</h1>
          <p className="text-muted-foreground">
            歡迎回來，{user?.username}！這是您的學習數據分析。
          </p>
        </div>
        <div className="flex gap-2">
          {["week", "month", "year"].map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {getPeriodLabel(p)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">學習時長</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userStats.studyTimeHours}h</div>
            <p className="text-xs text-muted-foreground">
              {getPeriodLabel(period)}累計學習時間
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">練習題數</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userStats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              {getPeriodLabel(period)}完成題目
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">連續天數</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.studyStreak.current}</div>
            <p className="text-xs text-muted-foreground">
              最長連續 {analytics.studyStreak.longest} 天
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">加入天數</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor((Date.now() - new Date(analytics.userStats.joinDate).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <p className="text-xs text-muted-foreground">
              使用平台天數
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mode Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>學習模式分布</CardTitle>
            <CardDescription>
              您在不同學習模式下的使用情況
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.conversationsByMode.map((item) => (
                <div key={item.mode} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getModeLabel(item.mode)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(item.count / Math.max(...analytics.conversationsByMode.map(m => m.count))) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>難度分布</CardTitle>
            <CardDescription>
              您在不同難度等級下的練習情況
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.conversationsByDifficulty.map((item) => (
                <div key={item.difficulty} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getDifficultyLabel(item.difficulty)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(item.count / Math.max(...analytics.conversationsByDifficulty.map(m => m.count))) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            學習洞察
          </CardTitle>
          <CardDescription>
            基於您的學習數據生成的個人化建議
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <BarChart3 className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}