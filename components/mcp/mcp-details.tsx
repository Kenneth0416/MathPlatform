'use client'

import { Clock, Settings, CheckCircle, XCircle, FileText, Code } from 'lucide-react'
import { MCPCallInfo } from '@/types/mcp'
import { cn } from '@/lib/utils'

interface MCPDetailsProps {
  callInfo: MCPCallInfo
}

export function MCPDetails({ callInfo }: MCPDetailsProps) {
  if (!callInfo.details) {
    return null
  }

  const { parameters, result, error, executionTime } = callInfo.details

  return (
    <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
      {/* 執行結果 */}
      {(result || error) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {result ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                計算結果
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                錯誤信息
              </>
            )}
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
              {result || error}
            </pre>
          </div>
        </div>
      )}

      {/* 輸入參數 */}
      {Object.keys(parameters).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Settings className="w-4 h-4" />
            輸入參數
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <div className="space-y-2">
              {Object.entries(parameters).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {key}:
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 執行信息 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Clock className="w-4 h-4" />
          執行信息
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">執行時間:</span>
            <span className="ml-2 text-gray-800 dark:text-gray-200">
              {executionTime}ms
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">工具名稱:</span>
            <span className="ml-2 text-gray-800 dark:text-gray-200 font-mono">
              {callInfo.toolName}
            </span>
          </div>
        </div>
      </div>

      {/* 原始數據（用於調試） */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          <Code className="w-4 h-4" />
          原始數據
        </summary>
        <div className="mt-2 p-3 bg-gray-900 rounded-md">
          <pre className="text-xs text-gray-300 font-mono overflow-x-auto">
            {JSON.stringify(callInfo.details, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  )
}