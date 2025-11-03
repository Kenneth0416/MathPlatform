"use client"

import { useState } from "react"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNav } from "@/components/mobile-nav"
import { PostCard } from "@/components/post-card"
import { CreatePostDialog } from "@/components/create-post-dialog"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const posts = [
  {
    id: 1,
    author: {
      name: "小明",
      avatar: "/student-avatar.png",
    },
    title: "二次函数顶点式详解",
    content: "今天终于搞懂了二次函数的顶点式！分享一下我的学习笔记，希望能帮助到同样在学习这个知识点的同学们...",
    image: "/math-quadratic-function-graph.jpg",
    tags: ["代数", "二次函数", "高中数学"],
    likes: 234,
    comments: 45,
    bookmarks: 89,
    timestamp: "2小时前",
  },
  {
    id: 2,
    author: {
      name: "数学小天才",
      avatar: "/girl-student-avatar.png",
    },
    title: "三角函数记忆技巧",
    content: "分享一个超好用的三角函数记忆方法，再也不会混淆sin、cos、tan了！",
    image: "/trigonometry-unit-circle.jpg",
    tags: ["三角函数", "记忆技巧", "高中数学"],
    likes: 567,
    comments: 78,
    bookmarks: 156,
    timestamp: "5小时前",
  },
  {
    id: 3,
    author: {
      name: "学霸笔记",
      avatar: "/boy-student-avatar.png",
    },
    title: "导数应用题解题思路",
    content: "整理了导数应用题的通用解题步骤，包括最值问题、切线问题等常见题型",
    image: "/calculus-derivative-graph.jpg",
    tags: ["微积分", "导数", "解题技巧"],
    likes: 423,
    comments: 92,
    bookmarks: 201,
    timestamp: "1天前",
  },
  {
    id: 4,
    author: {
      name: "数学老师王",
      avatar: "/teacher-avatar.png",
    },
    title: "立体几何证明技巧",
    content: "总结了立体几何中常用的证明方法，包括平行、垂直关系的证明",
    tags: ["几何", "立体几何", "证明"],
    likes: 312,
    comments: 56,
    bookmarks: 134,
    timestamp: "1天前",
  },
  {
    id: 5,
    author: {
      name: "竞赛达人",
      avatar: "/student-glasses-avatar.jpg",
    },
    title: "数列求和方法汇总",
    content: "整理了各种数列求和的方法，包括错位相减、裂项相消等",
    image: "/math-sequence-series.jpg",
    tags: ["数列", "求和", "竞赛"],
    likes: 189,
    comments: 34,
    bookmarks: 78,
    timestamp: "2天前",
  },
  {
    id: 6,
    author: {
      name: "概率小助手",
      avatar: "/student-smile-avatar.jpg",
    },
    title: "排列组合易错点",
    content: "总结了排列组合中容易出错的地方，附带练习题和详解",
    tags: ["概率统计", "排列组合", "易错点"],
    likes: 278,
    comments: 67,
    bookmarks: 112,
    timestamp: "3天前",
  },
]

export default function CommunityPage() {
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set())
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<number>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeFilter, setActiveFilter] = useState("推荐")

  const toggleLike = (postId: number) => {
    setLikedPosts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  const toggleBookmark = (postId: number) => {
    setBookmarkedPosts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden fixed inset-0">
      <MobileHeader
        showSearch
        onSearchClick={() => console.log("Search clicked")}
        onNotificationClick={() => console.log("Notification clicked")}
        onCreateClick={() => setShowCreateDialog(true)}
      />

      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg mx-auto">
          {["推荐", "代数", "几何", "微积分", "概率统计", "竞赛"].map((topic) => (
            <Button
              key={topic}
              variant={activeFilter === topic ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap rounded-full"
              onClick={() => setActiveFilter(topic)}
            >
              {topic}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 pb-20">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={likedPosts.has(post.id)}
                isBookmarked={bookmarkedPosts.has(post.id)}
                onLike={() => toggleLike(post.id)}
                onBookmark={() => toggleBookmark(post.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <Button
        size="icon"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreatePostDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      <MobileNav />
    </div>
  )
}
