import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("avatar") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 驗證文件類型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed"
      }, { status: 400 })
    }

    // 驗證文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "File too large. Maximum size is 5MB"
      }, { status: 400 })
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()
    const filename = `avatar-${timestamp}-${randomString}.${extension}`

    // 確保上傳目錄存在
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars")
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // 目錄已存在，忽略錯誤
    }

    // 保存文件
    const filePath = path.join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 構建文件 URL
    const avatarUrl = `/uploads/avatars/${filename}`

    // 更新用戶頭像
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        username: true,
        avatar: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      message: "Avatar uploaded successfully",
      user: updatedUser,
      avatarUrl
    })

  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 獲取當前用戶的頭像
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true }
    })

    if (!currentUser?.avatar) {
      return NextResponse.json({ error: "No avatar to delete" }, { status: 400 })
    }

    // 如果頭像存在，嘗試刪除文件
    if (currentUser.avatar.startsWith("/uploads/avatars/")) {
      try {
        const filePath = path.join(process.cwd(), "public", currentUser.avatar)
        const fs = await import("fs/promises")
        await fs.unlink(filePath)
      } catch (error) {
        // 文件不存在，繼續
        console.log("Avatar file not found, continuing...")
      }
    }

    // 更新用戶資料，移除頭像
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: null },
      select: {
        id: true,
        username: true,
        avatar: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      message: "Avatar deleted successfully",
      user: updatedUser
    })

  } catch (error) {
    console.error("Avatar deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}