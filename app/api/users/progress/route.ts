import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET user tutorial progress
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userProgress = await prisma.userProgress.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        tutorial: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            difficulty: true,
            duration: true,
            lessons: true,
            rating: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        lastAccess: "desc",
      },
    })

    // Get overall statistics
    const stats = await prisma.userProgress.aggregate({
      where: {
        userId: session.user.id,
      },
      _avg: {
        percentage: true,
      },
      _sum: {
        completed: true,
        total: true,
      },
      _count: {
        id: true,
      },
    })

    // Count completed tutorials
    const completedCount = await prisma.userProgress.count({
      where: {
        userId: session.user.id,
        percentage: 100,
      },
    })

    // Get recently accessed tutorials
    const recentTutorials = userProgress.slice(0, 3)

    // Format the response
    const formattedProgress = userProgress.map(progress => ({
      id: progress.id,
      tutorial: progress.tutorial,
      completed: progress.completed,
      total: progress.total,
      percentage: progress.percentage,
      lastAccess: progress.lastAccess,
      completedAt: progress.completedAt,
      isCompleted: progress.percentage >= 100,
    }))

    return NextResponse.json({
      progress: formattedProgress,
      stats: {
        totalTutorials: stats._count.id,
        completedTutorials: completedCount,
        inProgressTutorials: stats._count.id - completedCount,
        averageProgress: Math.round(stats._avg.percentage || 0),
        totalLessonsCompleted: stats._sum.completed || 0,
        totalLessons: stats._sum.total || 0,
      },
      recentTutorials,
    })

  } catch (error) {
    console.error("Get tutorial progress error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}