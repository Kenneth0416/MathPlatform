import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  language: z.enum(["zh-TW", "zh-CN", "en"]).optional(),
  notifications: z.boolean().optional(),
  darkMode: z.boolean().optional(),
})

// GET user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        language: true,
        notifications: true,
        darkMode: true,
        createdAt: true,
        totalStudyTime: true,
        totalMessages: true,
        streak: true,
        _count: {
          select: {
            conversations: true,
            achievements: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT update user profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { username, avatar, bio, language, notifications, darkMode } = updateProfileSchema.parse(body)

    // Check if username is already taken (if updating)
    if (username && username !== session.user.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 }
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(username !== undefined && { username }),
        ...(avatar !== undefined && { avatar }),
        ...(bio !== undefined && { bio }),
        ...(language !== undefined && { language }),
        ...(notifications !== undefined && { notifications }),
        ...(darkMode !== undefined && { darkMode }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        language: true,
        notifications: true,
        darkMode: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update profile error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}