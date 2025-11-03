"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, X } from "lucide-react"

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const availableTags = [
  "代数",
  "几何",
  "微积分",
  "三角函数",
  "概率统计",
  "数论",
  "解题技巧",
  "学习方法",
  "竞赛",
  "高中数学",
]

export function CreatePostDialog({ open, onOpenChange }: CreatePostDialogProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 3)))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    // Handle post creation
    console.log({ title, content, selectedTags, imagePreview })
    // Reset form
    setTitle("")
    setContent("")
    setSelectedTags([])
    setImagePreview(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>发布新帖子</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} className="text-base" />
          </div>

          <div>
            <Textarea
              placeholder="分享你的学习心得、解题思路或问题..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview || "/placeholder.svg"}
                alt="Preview"
                className="w-full rounded-lg max-h-[200px] object-cover"
              />
              <Button
                size="icon-sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={() => setImagePreview(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div>
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ImageIcon className="h-4 w-4" />
                <span>添加图片</span>
              </div>
              <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">选择标签 (最多3个)</p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim()}>
            发布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
