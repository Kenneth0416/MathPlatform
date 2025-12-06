"use client"

import { Home, MessageSquare, BookOpen, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n-context"

const getNavItems = (t: (key: string) => string) => [
  { href: "/", icon: Home, label: t('nav.community') },
  { href: "/chatbot", icon: MessageSquare, label: t('nav.aiAssistant') },
  { href: "/tutorials", icon: BookOpen, label: t('nav.tutorials') },
  { href: "/profile", icon: User, label: t('nav.profile') },
]

export function MobileNav() {
  const pathname = usePathname()
  const { t } = useI18n()
  const navItems = getNavItems(t)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
