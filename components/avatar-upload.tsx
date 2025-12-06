"use client"

import { useState, useRef, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Camera } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  currentAvatar?: string
  username?: string
  onAvatarChange?: (avatarUrl: string | null) => void
  className?: string
}

export function AvatarUpload({
  currentAvatar,
  username,
  onAvatarChange,
  className
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 驗證文件類型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("只支持 JPEG、PNG、GIF 和 WebP 格式的圖片")
      return
    }

    // 驗證文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError("文件大小不能超過 5MB")
      return
    }

    setError(null)

    // 創建預覽
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "上傳失敗")
      }

      const data = await response.json()
      setPreviewUrl(data.avatarUrl)
      onAvatarChange?.(data.avatarUrl)

      // 清空文件輸入
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError(error instanceof Error ? error.message : "上傳失敗")
    } finally {
      setUploading(false)
    }
  }, [onAvatarChange])

  const handleRemove = useCallback(async () => {
    try {
      const response = await fetch("/api/users/avatar", {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "刪除失敗")
      }

      setPreviewUrl(null)
      onAvatarChange?.(null)

      // 清空文件輸入
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Remove error:", error)
      setError(error instanceof Error ? error.message : "刪除失敗")
    }
  }, [onAvatarChange])

  const handleCancel = useCallback(() => {
    setPreviewUrl(currentAvatar || null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [currentAvatar])

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col items-center space-y-4">
        {/* Avatar Preview */}
        <div className="relative group">
          <Avatar className="h-24 w-24">
            <AvatarImage src={previewUrl || undefined} />
            <AvatarFallback className="text-2xl">
              {username?.charAt(0)?.toUpperCase() || "用"}
            </AvatarFallback>
          </Avatar>

          {/* Upload Button Overlay */}
          <Button
            size="sm"
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Controls */}
        <div className="flex flex-col space-y-2">
          {previewUrl !== currentAvatar && (
            <>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      上傳中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      保存頭像
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
              </div>
            </>
          )}

          {currentAvatar && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemove}
              disabled={uploading}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-2" />
              移除頭像
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-destructive text-center max-w-xs">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground text-center max-w-xs">
          支持 JPEG、PNG、GIF、WebP 格式，最大 5MB
        </div>
      </div>
    </div>
  )
}