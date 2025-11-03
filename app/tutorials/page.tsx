"use client"

import { useState } from "react"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNav } from "@/components/mobile-nav"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlayCircle, Clock, BookOpen, ChevronRight, Star } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface Tutorial {
  id: number
  title: string
  description: string
  category: string
  difficulty: "初级" | "中级" | "高级"
  duration: string
  lessons: number
  rating: number
  thumbnail: string
  progress?: number
}

interface Lesson {
  id: number
  title: string
  duration: string
  completed: boolean
}

const tutorials: Tutorial[] = [
  {
    id: 1,
    title: "二次函数完全攻略",
    description: "从基础概念到高级应用，全面掌握二次函数",
    category: "代数",
    difficulty: "中级",
    duration: "2小时30分",
    lessons: 12,
    rating: 4.8,
    thumbnail: "/tutorial-quadratic.jpg",
    progress: 45,
  },
  {
    id: 2,
    title: "三角函数入门",
    description: "理解三角函数的定义、性质和基本应用",
    category: "三角函数",
    difficulty: "初级",
    duration: "1小时45分",
    lessons: 8,
    rating: 4.9,
    thumbnail: "/tutorial-trig.jpg",
  },
  {
    id: 3,
    title: "导数与微积分基础",
    description: "掌握导数的概念、计算方法和实际应用",
    category: "微积分",
    difficulty: "中级",
    duration: "3小时15分",
    lessons: 15,
    rating: 4.7,
    thumbnail: "/tutorial-calculus.jpg",
    progress: 20,
  },
  {
    id: 4,
    title: "立体几何解题技巧",
    description: "学习空间几何的证明方法和解题策略",
    category: "几何",
    difficulty: "高级",
    duration: "2小时",
    lessons: 10,
    rating: 4.6,
    thumbnail: "/tutorial-geometry.jpg",
  },
  {
    id: 5,
    title: "排列组合与概率",
    description: "掌握计数原理和概率计算的基本方法",
    category: "概率统计",
    difficulty: "中级",
    duration: "2小时20分",
    lessons: 11,
    rating: 4.8,
    thumbnail: "/tutorial-probability.jpg",
  },
  {
    id: 6,
    title: "数列求和方法汇总",
    description: "学习各种数列求和技巧，包括错位相减、裂项相消等",
    category: "数列",
    difficulty: "中级",
    duration: "1小时50分",
    lessons: 9,
    rating: 4.7,
    thumbnail: "/tutorial-sequence.jpg",
  },
]

const lessonsList: Lesson[] = [
  { id: 1, title: "1. 二次函数的定义与图像", duration: "12分钟", completed: true },
  { id: 2, title: "2. 二次函数的顶点式", duration: "15分钟", completed: true },
  { id: 3, title: "3. 二次函数的一般式", duration: "13分钟", completed: true },
  { id: 4, title: "4. 二次函数的交点式", duration: "14分钟", completed: true },
  { id: 5, title: "5. 二次函数的对称性", duration: "11分钟", completed: true },
  { id: 6, title: "6. 二次函数的最值问题", duration: "16分钟", completed: false },
  { id: 7, title: "7. 二次函数与一元二次方程", duration: "13分钟", completed: false },
  { id: 8, title: "8. 二次函数的应用题", duration: "18分钟", completed: false },
  { id: 9, title: "9. 二次函数的综合练习（一）", duration: "20分钟", completed: false },
  { id: 10, title: "10. 二次函数的综合练习（二）", duration: "20分钟", completed: false },
  { id: 11, title: "11. 二次函数的竞赛题型", duration: "22分钟", completed: false },
  { id: 12, title: "12. 总结与提升", duration: "16分钟", completed: false },
]

export default function TutorialsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null)

  const filteredTutorials = activeTab === "all" ? tutorials : tutorials.filter((t) => t.category === activeTab)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "初级":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "中级":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "高级":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      default:
        return ""
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden fixed inset-0">
      <MobileHeader title="教程" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-screen-sm mx-auto w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <div className="sticky top-0 z-30 bg-background border-b border-border">
              <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto">
                <ScrollArea className="w-full">
                  <div className="flex px-4 py-3 gap-2">
                    <TabsTrigger value="all" className="rounded-full">
                      全部
                    </TabsTrigger>
                    <TabsTrigger value="代数" className="rounded-full whitespace-nowrap">
                      代数
                    </TabsTrigger>
                    <TabsTrigger value="几何" className="rounded-full whitespace-nowrap">
                      几何
                    </TabsTrigger>
                    <TabsTrigger value="微积分" className="rounded-full whitespace-nowrap">
                      微积分
                    </TabsTrigger>
                    <TabsTrigger value="三角函数" className="rounded-full whitespace-nowrap">
                      三角函数
                    </TabsTrigger>
                    <TabsTrigger value="概率统计" className="rounded-full whitespace-nowrap">
                      概率统计
                    </TabsTrigger>
                  </div>
                </ScrollArea>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-0">
              <div className="p-4 space-y-4 pb-20">
              {filteredTutorials.map((tutorial) => (
                <Card
                  key={tutorial.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedTutorial(tutorial)}
                >
                  <div className="flex gap-4 p-4">
                    <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={tutorial.thumbnail || "/placeholder.svg"}
                        alt={tutorial.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <PlayCircle className="h-8 w-8 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2">{tutorial.title}</h3>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{tutorial.description}</p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={getDifficultyColor(tutorial.difficulty)}>
                          {tutorial.difficulty}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{tutorial.duration}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          <span>{tutorial.lessons}课</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          <span>{tutorial.rating}</span>
                        </div>
                      </div>

                      {tutorial.progress !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">学习进度</span>
                            <span className="text-primary font-medium">{tutorial.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${tutorial.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedTutorial} onOpenChange={() => setSelectedTutorial(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[85vh] p-0">
          {selectedTutorial && (
            <>
              <div className="relative w-full h-48 bg-muted">
                <img
                  src={selectedTutorial.thumbnail || "/placeholder.svg"}
                  alt={selectedTutorial.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <PlayCircle className="h-16 w-16 text-white" />
                </div>
              </div>

              <div className="p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">{selectedTutorial.title}</DialogTitle>
                </DialogHeader>

                <p className="text-sm text-muted-foreground mb-4">{selectedTutorial.description}</p>

                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <Badge variant="secondary" className={getDifficultyColor(selectedTutorial.difficulty)}>
                    {selectedTutorial.difficulty}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{selectedTutorial.duration}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{selectedTutorial.lessons}课</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span>{selectedTutorial.rating}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <h4 className="font-semibold mb-3">课程内容</h4>
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-2">
                    {lessonsList.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                              lesson.completed ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            {lesson.completed ? <span className="text-xs">✓</span> : <PlayCircle className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">{lesson.duration}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="mt-6 flex gap-2">
                  <Button className="flex-1" size="lg">
                    {selectedTutorial.progress ? "继续学习" : "开始学习"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  )
}
