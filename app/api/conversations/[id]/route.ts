import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

const createMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  steps: z.string().optional(),
  knowledgePoints: z.string().optional(),
  visualizations: z.string().optional(),
})

// GET single conversation with messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { timestamp: "asc" }
        },
        _count: {
          select: { messages: true }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // Parse JSON fields
    const messages = conversation.messages.map(msg => ({
      ...msg,
      steps: msg.steps ? JSON.parse(msg.steps) : null,
      knowledgePoints: msg.knowledgePoints ? JSON.parse(msg.knowledgePoints) : [],
      visualizations: msg.visualizations ? JSON.parse(msg.visualizations) : null,
    }))

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages
      }
    })

  } catch (error) {
    console.error("Get conversation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT update conversation
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title } = updateConversationSchema.parse(body)

    const conversation = await prisma.conversation.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        ...(title && { title }),
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({
      message: "Conversation updated successfully",
      conversation
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update conversation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.conversation.delete({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    return NextResponse.json({
      message: "Conversation deleted successfully"
    })

  } catch (error) {
    console.error("Delete conversation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST add message to conversation
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { role, content, steps, knowledgePoints, visualizations } = createMessageSchema.parse(body)

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId: params.id,
        role,
        content,
        steps: steps ? JSON.stringify(steps) : null,
        knowledgePoints: knowledgePoints ? JSON.stringify(knowledgePoints) : null,
        visualizations: visualizations ? JSON.stringify(visualizations) : null,
      }
    })

    // Update conversation message count and updated timestamp
    await prisma.conversation.update({
      where: { id: params.id },
      data: {
        messageCount: { increment: 1 },
        updatedAt: new Date(),
      }
    })

    // Update user stats
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalMessages: { increment: 1 },
      }
    })

    return NextResponse.json({
      message: "Message added successfully",
      message: {
        ...message,
        steps: steps ? JSON.parse(steps) : null,
        knowledgePoints: knowledgePoints ? JSON.parse(knowledgePoints) : [],
        visualizations: visualizations ? JSON.parse(visualizations) : null,
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Add message error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}