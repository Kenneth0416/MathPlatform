'use client'

import { MCPCallCard } from './mcp-call-card'
import { MCPCallInfo, MCPStatus } from '@/types/mcp'

// 演示用的 MCP 調用數據
const demoMCPCalls: MCPCallInfo[] = [
  {
    id: 'mcp-demo-1',
    toolName: 'geometry_pythagoras',
    status: 'success',
    summary: '勾股定理計算完成 (245ms)',
    details: {
      parameters: {
        known: 'legs',
        a: 3,
        b: 4
      },
      result: 'c = 5.0',
      executionTime: 245
    }
  },
  {
    id: 'mcp-demo-2',
    toolName: 'arithmetic_fraction',
    status: 'success',
    summary: '分數運算計算完成 (156ms)',
    details: {
      parameters: {
        a: '1/2',
        b: '3/4',
        op: '+',
        detail: 'short',
        exact: true
      },
      result: '5/4',
      executionTime: 156
    }
  },
  {
    id: 'mcp-demo-3',
    toolName: 'algebra_solve',
    status: 'executing',
    summary: '正在使用代數方程求解...',
    details: {
      executionTime: 0
    }
  },
  {
    id: 'mcp-demo-4',
    toolName: 'eval_numeric',
    status: 'error',
    summary: '數值計算失敗 (89ms)',
    details: {
      parameters: {
        expr: 'sqrt(-1)'
      },
      error: '無法計算負數的平方根',
      executionTime: 89
    }
  }
]

export function MCPDemo() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold mb-6 text-center">
        MCP 調用 UI 包裹組件演示
      </h2>

      <div className="space-y-4">
        {demoMCPCalls.map((call) => (
          <MCPCallCard
            key={call.id}
            callInfo={call}
            defaultExpanded={call.status === 'error'}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">功能特點</h3>
        <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          <li>• 默認折疊，保持界面簡潔</li>
          <li>• 平滑的展開/摺疊動畫</li>
          <li>• 視覺狀態指示（執行中/成功/失敗）</li>
          <li>• 顯示執行時間和工具名稱</li>
          <li>• 詳細的參數和結果信息</li>
          <li>• 響應式設計和深色模式支持</li>
        </ul>
      </div>
    </div>
  )
}