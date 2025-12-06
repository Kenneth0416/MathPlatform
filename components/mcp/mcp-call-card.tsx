'use client'

import { useState } from 'react'
import { MCPCallCardProps } from '@/types/mcp'
import { MCPSummary } from './mcp-summary'
import { MCPDetails } from './mcp-details'
import { cn } from '@/lib/utils'

export function MCPCallCard({
  callInfo,
  onToggle,
  defaultExpanded = false
}: MCPCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleToggle = () => {
    if (isAnimating) return

    setIsAnimating(true)
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onToggle?.()

    // 結束動畫狀態
    setTimeout(() => setIsAnimating(false), 200)
  }

  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
        'bg-white dark:bg-gray-900',
        'shadow-sm hover:shadow-md transition-all duration-300 ease-in-out',
        'transform hover:scale-[1.02] active:scale-[0.98]',
        isExpanded && 'shadow-lg'
      )}
    >
      <MCPSummary
        callInfo={callInfo}
        isExpanded={isExpanded}
        onToggle={handleToggle}
      />

      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          'overflow-hidden',
          isExpanded
            ? 'max-h-96 opacity-100'
            : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-3 pb-3">
          <MCPDetails callInfo={callInfo} />
        </div>
      </div>
    </div>
  )
}