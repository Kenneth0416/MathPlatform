"use client"

import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { SimpleMermaidRenderer } from './mermaid/simple-mermaid-renderer'
import { MCPCallCard } from './mcp/mcp-call-card'
import { MCPCallInfo, MCPStatus } from '@/types/mcp'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

interface MarkdownRendererProps {
  content: string
  className?: string
  onRetry?: () => void
  mcpCallInfo?: MCPCallInfo[]
}


// 生成穩定的 ID，基於代碼內容的哈希
function generateStableId(code: string, index: number): string {
  // 簡單的哈希函數，基於代碼內容生成穩定 ID
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 轉換為 32 位整數
  }
  return `mermaid-${Math.abs(hash)}-${index}`
}

// 提取 MCP 調用標記
function extractMCPCallMarkers(content: string): {
  content: string;
  mcpCallMarkers: Array<{
    id: string
    fullMatch: string
    toolName: string
    parameters: string
  }>
} {
  const mcpRegex = /\[MCP:([a-zA-Z_]\w*):([^:\[\]]+(?::[^:\[\]]+)*)\]/g
  const mcpCallMarkers: Array<{
    id: string
    fullMatch: string
    toolName: string
    parameters: string
  }> = []
  let match
  let processedContent = content

  while ((match = mcpRegex.exec(content)) !== null) {
    const fullMatch = match[0]
    const toolName = match[1]
    const parameters = match[2]

    const id = generateStableId(fullMatch, mcpCallMarkers.length)

    mcpCallMarkers.push({ id, fullMatch, toolName, parameters })

    // 從內容中移除 MCP 調用標記
    processedContent = processedContent.replace(fullMatch, '')
  }

  return { content: processedContent, mcpCallMarkers }
}

// 提取 Mermaid 代碼塊的函數 - 優化版本
function extractMermaidBlocks(content: string): { content: string; mermaidBlocks: Array<{ id: string; code: string; title?: string }> } {
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/gi
  const mermaidBlocks: Array<{ id: string; code: string; title?: string }> = []
  let match
  let processedContent = content

  while ((match = mermaidRegex.exec(content)) !== null) {
    const mermaidCode = match[1].trim()
    const fullMatch = match[0]

    if (mermaidCode) {
      // 使用基於代碼內容的穩定 ID
      const id = generateStableId(mermaidCode, mermaidBlocks.length)

      // 提取標題（如果有的話）
      let title: string | undefined
      const titleMatch = mermaidCode.match(/title\s*[:：]\s*(.+)/i)
      if (titleMatch) {
        title = titleMatch[1].trim()
      }

      mermaidBlocks.push({ id, code: mermaidCode, title })

      // 從內容中移除 Mermaid 代碼塊
      processedContent = processedContent.replace(fullMatch, '')
    }
  }

  return { content: processedContent, mermaidBlocks }
}

// 預處理數學公式內容，將 LaTeX 格式轉換為 Markdown 兼容格式
function preprocessMathContent(content: string): string {
  // 處理單獨成行的 \[...\] 格式（LaTeX 塊級公式）
  // 先處理開始標記 \[
  content = content.replace(/\\\[\s*\n/g, '\n$$\n')
  content = content.replace(/\\\[/g, '$$\n')
  
  // 處理結束標記 \]
  content = content.replace(/\n\s*\\\]/g, '\n$$')
  content = content.replace(/\\\]/g, '$$')
  
  // 處理行內的 \(...\) 格式（LaTeX 行內公式）
  content = content.replace(/\\\(/g, '$')
  content = content.replace(/\\\)/g, '$')
  
  return content
}

function MarkdownRendererComponent({ content, className = "", onRetry, mcpCallInfo }: MarkdownRendererProps) {
  // 先提取 MCP 調用標記
  const { content: contentWithoutMCP, mcpCallMarkers } = extractMCPCallMarkers(content)

  // 然後提取 Mermaid 代碼塊
  const { content: contentWithoutMermaid, mermaidBlocks } = extractMermaidBlocks(contentWithoutMCP)

  // 預處理內容以支持 LaTeX 格式
  const processedContent = preprocessMathContent(contentWithoutMermaid)

  // 將 MCP 標記轉換為 MCPCallInfo 對象（如果沒有提供 mcpCallInfo）
  const mcpCalls = mcpCallInfo || mcpCallMarkers.map((marker, index) => ({
    id: marker.id,
    toolName: marker.toolName,
    status: 'success' as MCPStatus,
    summary: `${marker.toolName} 計算完成`,
    details: {
      parameters: parseMCParameters(marker.parameters),
      result: `使用 ${marker.toolName} 進行計算`,
      executionTime: 0
    }
  }))

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      {/* 渲染 MCP 調用卡片 */}
      {mcpCalls.map((call) => (
        <div key={call.id} className="mb-4">
          <MCPCallCard
            callInfo={call}
            defaultExpanded={false}
          />
        </div>
      ))}

      {/* 渲染 Mermaid 圖表 */}
      {mermaidBlocks.map((block, index) => (
        <div key={block.id} className="mb-8">
          <SimpleMermaidRenderer
            code={block.code}
            title={block.title}
            id={block.id}
            className="w-full"
            onRetry={onRetry}
          />
        </div>
      ))}

      {/* 渲染其餘的 Markdown 內容 */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // 自定義渲染組件
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            )
          },
          // 自定義表格樣式
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-border">
                  {children}
                </table>
              </div>
            )
          },
          th({ children }) {
            return (
              <th className="border border-border px-4 py-2 bg-muted font-semibold text-left">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="border border-border px-4 py-2">
                {children}
              </td>
            )
          },
          // 自定義引用樣式
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                {children}
              </blockquote>
            )
          },
          // 自定義列表樣式
          ul({ children }) {
            return (
              <ul className="list-disc list-inside space-y-1">
                {children}
              </ul>
            )
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-inside space-y-1">
                {children}
              </ol>
            )
          },
          // 自定義標題樣式
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">
                {children}
              </h1>
            )
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-semibold mb-3 mt-5 first:mt-0">
                {children}
              </h2>
            )
          },
          h3({ children }) {
            return (
              <h3 className="text-lg font-medium mb-2 mt-4 first:mt-0">
                {children}
              </h3>
            )
          },
          h4({ children }) {
            return (
              <h4 className="text-base font-medium mb-2 mt-3 first:mt-0">
                {children}
              </h4>
            )
          },
          // 自定義段落樣式
          p({ children }) {
            return (
              <p className="mb-3 last:mb-0 leading-relaxed">
                {children}
              </p>
            )
          },
          // 自定義鏈接樣式
          a({ children, href }) {
            return (
              <a
                href={href}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            )
          },
          // 自定義分割線樣式
          hr() {
            return (
              <hr className="my-6 border-border" />
            )
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

// 解析 MCP 參數字符串為對象
function parseMCParameters(paramString: string): Record<string, any> {
  const params: Record<string, any> = {}
  const parts = paramString.split(',').map(p => p.trim())

  // 根據常見工具進行參數解析
  if (paramString.includes('legs') || paramString.includes('hypotenuse')) {
    // 勾股定理參數
    params.known = parts[0] || 'legs'
    if (parts[1] && !isNaN(parseFloat(parts[1]))) {
      params.a = parseFloat(parts[1])
    }
    if (parts[2] && !isNaN(parseFloat(parts[2]))) {
      params.b = parseFloat(parts[2])
    }
    if (parts[3] && !isNaN(parseFloat(parts[3]))) {
      params.c = parseFloat(parts[3])
    }
  } else {
    // 通用參數處理
    parts.forEach((part, index) => {
      if (part) {
        params[`param${index + 1}`] = part
      }
    })
  }

  return params
}

// 使用 memo 優化組件
export const MarkdownRenderer = memo(MarkdownRendererComponent)
