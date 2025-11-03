"use client"

import { useState } from "react"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNav } from "@/components/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Settings,
  Heart,
  Bookmark,
  FileText,
  Award,
  TrendingUp,
  ChevronRight,
  Bell,
  Moon,
  Globe,
  HelpCircle,
  LogOut,
  Edit,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface UserStats {
  posts: number
  likes: number
  followers: number
  following: number
}

interface Achievement {
  id: number
  title: string
  description: string
  icon: string
  unlocked: boolean
  date?: string
}

const userStats: UserStats = {
  posts: 23,
  likes: 1247,
  followers: 456,
  following: 189,
}

const achievements: Achievement[] = [
  {
    id: 1,
    title: "初学者",
    description: "完成第一个教程",
    icon: "🎓",
    unlocked: true,
    date: "2024-01-15",
  },
  {
    id: 2,
    title: "勤奋学习",
    description: "连续学习7天",
    icon: "🔥",
    unlocked: true,
    date: "2024-01-22",
  },
  {
    id: 3,
    title: "社区贡献者",
    description: "发布10篇帖子",
    icon: "✍️",
    unlocked: true,
    date: "2024-02-01",
  },
  {
    id: 4,
    title: "数学达人",
    description: "完成5个高级教程",
    icon: "🏆",
    unlocked: false,
  },
  {
    id: 5,
    title: "人气之星",
    description: "获得1000个赞",
    icon: "⭐",
    unlocked: true,
    date: "2024-02-10",
  },
  {
    id: 6,
    title: "学习大师",
    description: "完成所有教程",
    icon: "👑",
    unlocked: false,
  },
]

const myPosts = [
  {
    id: 1,
    title: "二次函数顶点式详解",
    likes: 234,
    comments: 45,
    date: "2天前",
  },
  {
    id: 2,
    title: "三角函数记忆技巧分享",
    likes: 189,
    comments: 32,
    date: "5天前",
  },
  {
    id: 3,
    title: "导数应用题解题思路",
    likes: 156,
    comments: 28,
    date: "1周前",
  },
]

export default function ProfilePage() {
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [username, setUsername] = useState("数学学习者")
  const [bio, setBio] = useState("热爱数学，喜欢分享学习心得")
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className="min-h-screen pb-16 bg-muted/30">
      <MobileHeader title="我的" />

      <ScrollArea className="h-[calc(100vh-7rem)]">
        <div className="max-w-screen-sm mx-auto">
          {/* Profile Header */}
          <Card className="m-4 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder.svg?height=80&width=80" />
                  <AvatarFallback className="text-2xl">我</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold">{username}</h2>
                    <Badge variant="secondary">Lv.5</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{bio}</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setShowEditProfile(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      编辑资料
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold">{userStats.posts}</div>
                  <div className="text-xs text-muted-foreground">帖子</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{userStats.likes}</div>
                  <div className="text-xs text-muted-foreground">获赞</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{userStats.followers}</div>
                  <div className="text-xs text-muted-foreground">粉丝</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{userStats.following}</div>
                  <div className="text-xs text-muted-foreground">关注</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Progress */}
          <Card className="mx-4 mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                学习进度
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>本周学习时长</span>
                  <span className="font-semibold">5小时32分</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "65%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>已完成教程</span>
                  <span className="font-semibold">8/24</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "33%" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Content */}
          <Tabs defaultValue="posts" className="mx-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="posts">
                <FileText className="h-4 w-4 mr-1" />
                我的帖子
              </TabsTrigger>
              <TabsTrigger value="liked">
                <Heart className="h-4 w-4 mr-1" />
                点赞
              </TabsTrigger>
              <TabsTrigger value="achievements">
                <Award className="h-4 w-4 mr-1" />
                成就
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-4 space-y-3">
              {myPosts.map((post) => (
                <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{post.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.likes}
                          </span>
                          <span>{post.comments} 评论</span>
                          <span>{post.date}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="liked" className="mt-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <Bookmark className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">暂无点赞内容</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="mt-4 space-y-3">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className={achievement.unlocked ? "" : "opacity-50"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{achievement.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">{achievement.title}</h3>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        {achievement.unlocked && achievement.date && (
                          <p className="text-xs text-primary mt-1">解锁于 {achievement.date}</p>
                        )}
                      </div>
                      {achievement.unlocked && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          已解锁
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑资料</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="bio">个人简介</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-2 min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>
              取消
            </Button>
            <Button onClick={() => setShowEditProfile(false)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">通知</p>
                  <p className="text-xs text-muted-foreground">接收新消息通知</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">深色模式</p>
                  <p className="text-xs text-muted-foreground">切换应用主题</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <Separator />

            <Button variant="ghost" className="w-full justify-start" size="lg">
              <Globe className="h-5 w-5 mr-3" />
              <span>语言设置</span>
              <ChevronRight className="h-5 w-5 ml-auto" />
            </Button>

            <Button variant="ghost" className="w-full justify-start" size="lg">
              <HelpCircle className="h-5 w-5 mr-3" />
              <span>帮助与反馈</span>
              <ChevronRight className="h-5 w-5 ml-auto" />
            </Button>

            <Separator />

            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" size="lg">
              <LogOut className="h-5 w-5 mr-3" />
              <span>退出登录</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  )
}
