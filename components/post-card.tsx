"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Post {
  id: number
  author: {
    name: string
    avatar: string
  }
  title: string
  content: string
  image?: string
  tags: string[]
  likes: number
  comments: number
  bookmarks: number
  timestamp: string
}

interface Comment {
  id: number
  author: {
    name: string
    avatar: string
  }
  content: string
  timestamp: string
  likes: number
}

interface PostCardProps {
  post: Post
  isLiked: boolean
  isBookmarked: boolean
  onLike: () => void
  onBookmark: () => void
}

export function PostCard({ post, isLiked, isBookmarked, onLike, onBookmark }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      author: { name: "学习达人", avatar: "/placeholder.svg?height=40&width=40" },
      content: "讲得太好了！终于理解了这个概念",
      timestamp: "2小时前",
      likes: 12,
    },
    {
      id: 2,
      author: { name: "数学爱好者", avatar: "/placeholder.svg?height=40&width=40" },
      content: "能再详细解释一下第三步吗？",
      timestamp: "1小时前",
      likes: 5,
    },
  ])

  const handleAddComment = () => {
    if (commentText.trim()) {
      const newComment: Comment = {
        id: comments.length + 1,
        author: { name: "我", avatar: "/placeholder.svg?height=40&width=40" },
        content: commentText,
        timestamp: "刚刚",
        likes: 0,
      }
      setComments([...comments, newComment])
      setCommentText("")
    }
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        {post.image && (
          <div className="relative aspect-square">
            <img src={post.image || "/placeholder.svg"} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2">{post.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{post.content}</p>

          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={post.author.avatar || "/placeholder.svg"} />
                <AvatarFallback>{post.author.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{post.author.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{post.timestamp}</span>
          </div>

          <Separator className="mb-3" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onLike}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-primary text-primary" : ""}`} />
                <span>{post.likes}</span>
              </button>
              <button
                onClick={() => setShowComments(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{post.comments}</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onBookmark} className="text-muted-foreground hover:text-primary transition-colors">
                <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-primary text-primary" : ""}`} />
              </button>
              <button className="text-muted-foreground hover:text-primary transition-colors">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[80vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>评论 ({comments.length})</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 px-4 max-h-[50vh]">
            <div className="space-y-4 py-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.author.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.author.name}</span>
                      <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-foreground mb-2">{comment.content}</p>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Heart className="h-3 w-3" />
                      <span>{comment.likes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="写下你的评论..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[60px] resize-none"
              />
              <Button onClick={handleAddComment} className="shrink-0">
                发送
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
