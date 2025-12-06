'use client'

import { Loader2, CheckCircle, XCircle, Calculator } from 'lucide-react'
import { MCPStatus } from '@/types/mcp'
import { cn } from '@/lib/utils'

interface MCPStatusIndicatorProps {
  status: MCPStatus
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function MCPStatusIndicator({
  status,
  size = 'md',
  showText = false,
  className
}: MCPStatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'executing':
        return (
          <Loader2
            className={cn(
              sizeClasses[size],
              'animate-spin text-blue-500'
            )}
          />
        )
      case 'success':
        return (
          <CheckCircle
            className={cn(
              sizeClasses[size],
              'text-green-500'
            )}
          />
        )
      case 'error':
        return (
          <XCircle
            className={cn(
              sizeClasses[size],
              'text-red-500'
            )}
          />
        )
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'executing':
        return '計算中'
      case 'success':
        return '計算完成'
      case 'error':
        return '計算失敗'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'executing':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-full border',
        getStatusColor(),
        className
      )}
    >
      {getStatusIcon()}
      {showText && (
        <span className={cn('font-medium', textSizeClasses[size])}>
          {getStatusText()}
        </span>
      )}
    </div>
  )
}

// 簡化的版本，只顯示圖標和背景
export function MCPMiniStatus({
  status,
  className
}: {
  status: MCPStatus
  className?: string
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'executing':
        return 'bg-blue-100 text-blue-600'
      case 'success':
        return 'bg-green-100 text-green-600'
      case 'error':
        return 'bg-red-100 text-red-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'executing':
        return (
          <div className="relative">
            <Loader2 className="w-3 h-3 animate-spin" />
            <div className="absolute inset-0 animate-ping">
              <div className="w-3 h-3 bg-blue-400 opacity-30 rounded-full" />
            </div>
          </div>
        )
      case 'success':
        return (
          <div className="relative">
            <CheckCircle className="w-3 h-3" />
            {status === 'success' && (
              <div className="absolute inset-0 animate-ping">
                <div className="w-3 h-3 bg-green-400 opacity-20 rounded-full" />
              </div>
            )}
          </div>
        )
      case 'error':
        return (
          <div className="relative">
            <XCircle className="w-3 h-3" />
            {status === 'error' && (
              <div className="absolute inset-0 animate-pulse">
                <div className="w-3 h-3 bg-red-400 opacity-20 rounded-full" />
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-full',
        'transition-all duration-200 ease-in-out',
        'hover:scale-110',
        getStatusColor(),
        className
      )}
    >
      {getStatusIcon()}
    </div>
  )
}