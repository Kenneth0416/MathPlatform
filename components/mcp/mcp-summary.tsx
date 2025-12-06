'use client'

import { Calculator, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { MCPCallInfo, MCP_TOOL_NAMES } from '@/types/mcp'
import { MCPMiniStatus } from './mcp-status-indicator'
import { cn } from '@/lib/utils'

interface MCPSummaryProps {
  callInfo: MCPCallInfo
  isExpanded: boolean
  onToggle: () => void
}

export function MCPSummary({ callInfo, isExpanded, onToggle }: MCPSummaryProps) {
  const toolDisplayName = MCP_TOOL_NAMES[callInfo.toolName]?.zhTW || callInfo.toolName

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg"
    >
      <div className="flex items-center gap-3 flex-1">
        <MCPMiniStatus status={callInfo.status} />
        <Calculator className="w-4 h-4 text-gray-500" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {toolDisplayName}
            </span>
            <span className="text-sm text-gray-500">
              {callInfo.summary}
            </span>
          </div>
          {callInfo.details?.executionTime && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <Clock className="w-3 h-3" />
              <span>{callInfo.details.executionTime}ms</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          數學計算工具
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </button>
  )
}