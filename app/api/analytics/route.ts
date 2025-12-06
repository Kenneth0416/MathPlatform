import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get("period") || "month" // week, month, year

    // Get user's learning analytics
    const [
      userStats,
      conversationsByMode,
      conversationsByDifficulty,
      recentActivity,
      studyStreak,
      totalConversations,
      learningSessions
    ] = await Promise.all([
      // User basic stats
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          totalStudyTime: true,
          totalMessages: true,
          streak: true,
          createdAt: true,
        }
      }),

      // Conversations by mode
      prisma.conversation.groupBy({
        by: ["mode"],
        where: {
          userId: session.user.id,
          createdAt: {
            gte: getPeriodStart(period)
          }
        },
        _count: {
          mode: true
        }
      }),

      // Conversations by difficulty
      prisma.conversation.groupBy({
        by: ["difficulty"],
        where: {
          userId: session.user.id,
          createdAt: {
            gte: getPeriodStart(period)
          }
        },
        _count: {
          difficulty: true
        }
      }),

      // Recent activity (last 7 days)
      prisma.conversation.findMany({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          createdAt: true,
          mode: true,
          difficulty: true,
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      }),

      // Study streak
      prisma.studyStreak.findUnique({
        where: { userId: session.user.id },
        select: {
          currentStreak: true,
          longestStreak: true,
          lastStudyDate: true,
        }
      }),

      // Total conversations
      prisma.conversation.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: getPeriodStart(period)
          }
        }
      }),

      // Learning sessions
      prisma.learningSession.findMany({
        where: {
          userId: session.user.id,
          startTime: {
            gte: getPeriodStart(period)
          }
        },
        select: {
          startTime: true,
          endTime: true,
          duration: true,
          mode: true,
          difficulty: true,
        },
        orderBy: { startTime: "desc" }
      })
    ])

    // Calculate daily activity for the last 30 days
    const dailyActivity = await calculateDailyActivity(session.user.id, period)

    // Calculate most active hours
    const hourlyActivity = await calculateHourlyActivity(session.user.id, period)

    // Calculate learning insights
    const insights = generateLearningInsights({
      userStats,
      conversationsByMode,
      conversationsByDifficulty,
      learningSessions,
      studyStreak,
      period
    })

    const analytics = {
      userStats: {
        ...userStats,
        joinDate: userStats?.createdAt,
        studyTimeMinutes: userStats?.totalStudyTime || 0,
        studyTimeHours: Math.round((userStats?.totalStudyTime || 0) / 60 * 10) / 10,
        totalQuestions: totalConversations,
      },
      conversationsByMode: conversationsByMode.map(item => ({
        mode: item.mode,
        count: item._count.mode
      })),
      conversationsByDifficulty: conversationsByDifficulty.map(item => ({
        difficulty: item.difficulty,
        count: item._count.difficulty
      })),
      recentActivity,
      studyStreak: {
        current: studyStreak?.currentStreak || 0,
        longest: studyStreak?.longestStreak || 0,
        lastStudyDate: studyStreak?.lastStudyDate,
      },
      dailyActivity,
      hourlyActivity,
      learningSessions: learningSessions.map(session => ({
        date: session.startTime,
        duration: session.duration,
        mode: session.mode,
        difficulty: session.difficulty,
      })),
      insights,
      period,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ analytics })

  } catch (error) {
    console.error("Get analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function getPeriodStart(period: string): Date {
  const now = new Date()
  switch (period) {
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case "year":
      return new Date(now.getFullYear(), 0, 1)
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

async function calculateDailyActivity(userId: string, period: string) {
  const days = period === "week" ? 7 : period === "month" ? 30 : 365
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      _count: { select: { messages: true } }
    }
  })

  // Group by day
  const dailyMap = new Map<string, number>()
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateKey = date.toISOString().split('T')[0]
    dailyMap.set(dateKey, 0)
  }

  conversations.forEach(conv => {
    const dateKey = conv.createdAt.toISOString().split('T')[0]
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + conv._count.messages)
  })

  return Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count
  }))
}

async function calculateHourlyActivity(userId: string, period: string) {
  const startDate = getPeriodStart(period)

  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true
    }
  })

  // Group by hour (0-23)
  const hourlyMap = new Array(24).fill(0)
  conversations.forEach(conv => {
    const hour = conv.createdAt.getHours()
    hourlyMap[hour]++
  })

  return hourlyMap.map((count, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    count
  }))
}

function generateLearningInsights(data: any): string[] {
  const insights: string[] = []

  // Most used mode
  if (data.conversationsByMode.length > 0) {
    const topMode = data.conversationsByMode.reduce((prev: any, current: any) =>
      prev.count > current.count ? prev : current
    )
    insights.push(`您最常使用${getModeLabel(topMode.mode)}，已練習 ${topMode.count} 次`)
  }

  // Preferred difficulty
  if (data.conversationsByDifficulty.length > 0) {
    const topDifficulty = data.conversationsByDifficulty.reduce((prev: any, current: any) =>
      prev.count > current.count ? prev : current
    )
    insights.push(`您偏好的難度等級是${getDifficultyLabel(topDifficulty.difficulty)}`)
  }

  // Study streak insights
  if (data.studyStreak.current > 0) {
    insights.push(`您已連續學習 ${data.studyStreak.current} 天，保持這個勢頭！`)
  }

  // Total time insights
  if (data.userStats?.totalStudyTime > 0) {
    const hours = Math.round(data.userStats.totalStudyTime / 60 * 10) / 10
    insights.push(`累計學習時間已達 ${hours} 小時`)
  }

  return insights
}

function getModeLabel(mode: string): string {
  const modeLabels: Record<string, string> = {
    solve: "解題模式",
    tutor: "輔導模式",
    practice: "練習生成",
    check: "批改驗證"
  }
  return modeLabels[mode] || mode
}

function getDifficultyLabel(difficulty: string): string {
  const difficultyLabels: Record<string, string> = {
    "K-6": "小學",
    "Middle": "初中",
    "High": "高中",
    "College": "大學",
    "Contest": "競賽"
  }
  return difficultyLabels[difficulty] || difficulty
}