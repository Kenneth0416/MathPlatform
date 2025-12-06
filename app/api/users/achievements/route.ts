import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET user achievements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        achievement: {
          select: {
            id: true,
            title: true,
            description: true,
            icon: true,
            category: true,
            points: true,
          },
        },
      },
      orderBy: {
        unlockedAt: "desc",
      },
    })

    // Get all available achievements for comparison
    const allAchievements = await prisma.achievement.findMany({
      orderBy: [
        { category: "asc" },
        { points: "desc" },
      ],
    })

    // Format the response
    const unlockedAchievementIds = new Set(userAchievements.map(ua => ua.achievementId))

    const formattedAchievements = allAchievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id)

      return {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        points: achievement.points,
        unlocked: userAchievement ? true : false,
        unlockedAt: userAchievement?.unlockedAt,
      }
    })

    // Get achievement statistics
    const stats = {
      totalUnlocked: userAchievements.length,
      totalAvailable: allAchievements.length,
      totalPoints: userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0),
      recentUnlocks: userAchievements.slice(0, 5).map(ua => ({
        id: ua.achievementId,
        title: ua.achievement.title,
        icon: ua.achievement.icon,
        unlockedAt: ua.unlockedAt,
      })),
    }

    return NextResponse.json({
      achievements: formattedAchievements,
      stats,
    })

  } catch (error) {
    console.error("Get achievements error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}