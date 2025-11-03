"use client"

import { Search, Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggleSimple } from "@/components/theme-toggle"

interface MobileHeaderProps {
  title?: string
  showSearch?: boolean
  onSearchClick?: () => void
  onNotificationClick?: () => void
  onCreateClick?: () => void
}

export function MobileHeader({
  title,
  showSearch = false,
  onSearchClick,
  onNotificationClick,
  onCreateClick,
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-sm mx-auto">
        {showSearch ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索题目、笔记、用户..."
                className="pl-9 h-9 bg-muted/50"
                onClick={onSearchClick}
                readOnly
              />
            </div>
          </div>
        ) : (
          <h1 className="text-lg font-semibold">{title}</h1>
        )}

        <div className="flex items-center gap-2 ml-2">
          <ThemeToggleSimple />
          {onCreateClick && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onCreateClick}>
              <Plus className="h-5 w-5" />
            </Button>
          )}
          {onNotificationClick && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onNotificationClick}>
              <Bell className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
