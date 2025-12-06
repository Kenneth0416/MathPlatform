"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
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
  MessageSquare,
  Plus,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useI18n } from "@/lib/i18n-context"
import { AvatarUpload } from "@/components/avatar-upload"
import type { Language } from "@/lib/locales"
import Link from "next/link"

interface UserProfile {
  id: string
  email: string
  username: string
  avatar?: string
  bio?: string
  language: string
  notifications: boolean
  darkMode: boolean
  createdAt: string
  totalStudyTime: number
  totalMessages: number
  streak: number
  _count: {
    conversations: number
    userAchievements: number
  }
}

export default function ProfilePage() {
  const { t, language, setLanguage } = useI18n()
  const { user, isAuthenticated } = useAuth()
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLanguageSettings, setShowLanguageSettings] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小时${mins > 0 ? mins + '分' : ''}`
  }

  // 獲取用戶資料
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated) return

      try {
        setLoading(true)
        const response = await fetch("/api/users/profile")

        if (!response.ok) {
          throw new Error("Failed to fetch profile")
        }

        const data = await response.json()
        setUserProfile(data.user)
        setUsername(data.user.username || "")
        setBio(data.user.bio || "")
        setAvatarUrl(data.user.avatar)
        setNotifications(data.user.notifications !== false)
        setDarkMode(data.user.darkMode || false)
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [isAuthenticated])

  return (
    <div className="min-h-screen pb-16 bg-muted/30">
      <MobileHeader title={t('profile.title')} />
      <ScrollArea className="h-[calc(100vh-7rem)]">
        <div className="max-w-screen-sm mx-auto">
          {loading ? (
            <Card className="m-4 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">加载中...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              <Card className="m-4 mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarUrl || userProfile?.avatar} />
                      <AvatarFallback className="text-2xl">
                        {userProfile?.username?.charAt(0)?.toUpperCase() || "用"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-xl font-bold">
                          {userProfile?.username || "用户"}
                        </h2>
                        <Badge variant="secondary">Lv.5</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {bio || "热爱数学，喜欢分享学习心得"}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setShowEditProfile(true)}>
                          <Edit className="h-4 w-4 mr-1" />
                          {t('profile.editProfile')}
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
                      <div className="text-xl font-bold">
                        {userProfile?._count.conversations}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('profile.posts')}</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">
                        {userProfile?.totalMessages}
                      </div>
                      <div className="text-xs text-muted-foreground">消息</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">
                        {userProfile?.streak}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('progress.currentStreak')}</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">
                        {Math.floor((userProfile?.totalStudyTime || 0) / 60)}h
                      </div>
                      <div className="text-xs text-muted-foreground">{t('progress.studyTime')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mx-4 mb-4">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t('profile.learningProgress')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>{t('profile.totalStudyTime')}</span>
                      <span className="font-semibold">
                        {formatStudyTime(userProfile?.totalStudyTime || 0)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ((userProfile?.totalStudyTime || 0) / (100 * 60)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="posts" className="mx-4">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="posts">
                    <FileText className="h-4 w-4 mr-1" />
                    {t('profile.myPosts')}
                  </TabsTrigger>
                  <TabsTrigger value="liked">
                    <Heart className="h-4 w-4 mr-1" />
                    {t('profile.liked')}
                  </TabsTrigger>
                  <TabsTrigger value="achievements">
                    <Award className="h-4 w-4 mr-1" />
                    {t('profile.achievements')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="mt-4 space-y-3">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">{t('conversation.noConversations')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('empty.noConversations')}
                      </p>
                      <Button asChild>
                        <Link href="/chatbot">{t('conversation.new')}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="liked" className="mt-4">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Bookmark className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t('profile.noLikedContent')}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="achievements" className="mt-4 space-y-3">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Award className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">還沒有成就</h3>
                      <p className="text-muted-foreground mb-4">
                        開始學習解鎖你的第一個成就！
                      </p>
                      <Button asChild>
                        <Link href="/tutorials">開始學習</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('profile.editProfile')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>頭像</Label>
              <div className="mt-2">
                <AvatarUpload
                  currentAvatar={avatarUrl || userProfile?.avatar}
                  username={userProfile?.username}
                  onAvatarChange={handleAvatarChange}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">{t('profile.username')}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="請輸入用戶名"
                />
              </div>
              <div>
                <Label htmlFor="bio">{t('profile.bio')}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="介紹一下自己..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>
              {t('profile.cancel')}
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? t('status.loading') : t('profile.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  )

  function handleAvatarChange(newAvatarUrl: string | null) {
    setAvatarUrl(newAvatarUrl)
    if (userProfile) {
      setUserProfile(prev => prev ? { ...prev, avatar: newAvatarUrl || undefined } : null)
    }
  }

  function handleSaveProfile() {
    if (!userProfile) return

    setSaving(true)
    fetch("/api/users/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        bio: bio.trim(),
        language,
        notifications,
        darkMode,
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to update profile")
        }
        return response.json()
      })
      .then(data => {
        setUserProfile(prev => prev ? { ...prev, ...data.user } : null)
        setShowEditProfile(false)
      })
      .catch(error => {
        console.error("Error updating profile:", error)
        alert(error instanceof Error ? error.message : "更新失敗")
      })
      .finally(() => {
        setSaving(false)
      })
  }
}