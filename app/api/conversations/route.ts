import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createConversationSchema = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(["solve", "tutor", "practice", "check"]),
  difficulty: z.enum(["K-6", "Middle", "High", "College", "Contest"]),
  language: z.enum(["zh-TW", "zh-CN", "en"]),
})

// GET user conversations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const mode = searchParams.get("mode")
    const difficulty = searchParams.get("difficulty")
    const search = searchParams.get("search")

    const where: any = {
      userId: session.user.id,
      ...(mode && { mode }),
      ...(difficulty && { difficulty }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { messages: { some: { content: { contains: search, mode: "insensitive" } } } }
        ]
      })
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
            take: 1, // Only get first message for preview
            select: {
              content: true,
              timestamp: true,
            }
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where })
    ])

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error("Get conversations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST create new conversation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, mode, difficulty, language } = createConversationSchema.parse(body)

    const conversation = await prisma.conversation.create({
      data: {
        title,
        userId: session.user.id,
        mode,
        difficulty,
        language,
      },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    })

    return NextResponse.json({
      message: "Conversation created successfully",
      conversation
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Create conversation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}