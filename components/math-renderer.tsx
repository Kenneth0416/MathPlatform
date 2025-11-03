"use client"

import React from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MathRendererProps {
  children: string
  className?: string
}

interface MathTextProps {
  text: string
  className?: string
}

// 單個數學公式渲染器
export function MathRenderer({ children, className }: MathRendererProps) {
  try {
    // 檢查是否為塊級公式（$$...$$）
    if (children.startsWith('$$') && children.endsWith('$$')) {
      const formula = children.slice(2, -2).trim()
      return (
        <div className={`my-4 ${className || ''}`}>
          <BlockMath math={formula} />
        </div>
      )
    }
    
    // 檢查是否為行內公式（$...$）
    if (children.startsWith('$') && children.endsWith('$')) {
      const formula = children.slice(1, -1).trim()
      return <InlineMath math={formula} />
    }
    
    // 如果不是數學公式，直接返回文本
    return <span className={className}>{children}</span>
  } catch (error) {
    console.error('Math rendering error:', error)
    return <span className={`text-red-500 ${className || ''}`}>{children}</span>
  }
}

// 文本中的數學公式渲染器
export function MathText({ text, className }: MathTextProps) {
  // 分割文本，分離數學公式和普通文本
  const parts = splitMathText(text)
  
  return (
    <span className={className}>
      {parts.map((part, index) => (
        <MathRenderer key={index}>{part}</MathRenderer>
      ))}
    </span>
  )
}

// 分割文本，識別數學公式
function splitMathText(text: string): string[] {
  const parts: string[] = []
  let currentIndex = 0
  
  // 匹配塊級公式 $$...$$
  const blockMathRegex = /\$\$([^$]+)\$\$/g
  let blockMatch
  
  while ((blockMatch = blockMathRegex.exec(text)) !== null) {
    // 添加公式前的文本
    if (blockMatch.index > currentIndex) {
      const beforeText = text.slice(currentIndex, blockMatch.index)
      if (beforeText) {
        parts.push(beforeText)
      }
    }
    
    // 添加塊級公式
    parts.push(`$$${blockMatch[1]}$$`)
    currentIndex = blockMatch.index + blockMatch[0].length
  }
  
  // 處理剩餘文本中的行內公式
  const remainingText = text.slice(currentIndex)
  if (remainingText) {
    const inlineParts = splitInlineMath(remainingText)
    parts.push(...inlineParts)
  }
  
  return parts
}

// 分割行內公式
function splitInlineMath(text: string): string[] {
  const parts: string[] = []
  let currentIndex = 0
  
  // 匹配行內公式 $...$（但不匹配 $$...$$）
  const inlineMathRegex = /(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g
  let inlineMatch
  
  while ((inlineMatch = inlineMathRegex.exec(text)) !== null) {
    // 添加公式前的文本
    if (inlineMatch.index > currentIndex) {
      const beforeText = text.slice(currentIndex, inlineMatch.index)
      if (beforeText) {
        parts.push(beforeText)
      }
    }
    
    // 添加行內公式
    parts.push(`$${inlineMatch[1]}$`)
    currentIndex = inlineMatch.index + inlineMatch[0].length
  }
  
  // 添加剩餘文本
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex)
    if (remainingText) {
      parts.push(remainingText)
    }
  }
  
  return parts
}

// 預覽數學公式組件（用於編輯器）
export function MathPreview({ formula, isBlock = false }: { formula: string; isBlock?: boolean }) {
  if (!formula.trim()) {
    return <div className="text-muted-foreground text-sm">預覽將顯示在這裡</div>
  }
  
  try {
    if (isBlock) {
      return (
        <div className="border rounded-lg p-4 bg-muted/50">
          <BlockMath math={formula} />
        </div>
      )
    } else {
      return (
        <div className="border rounded-lg p-4 bg-muted/50">
          <InlineMath math={formula} />
        </div>
      )
    }
  } catch (error) {
    return (
      <div className="border rounded-lg p-4 bg-destructive/10 text-destructive text-sm">
        公式語法錯誤：{error instanceof Error ? error.message : '未知錯誤'}
      </div>
    )
  }
}

// 數學公式編輯器組件
export function MathEditor({ 
  value, 
  onChange, 
  placeholder = "輸入 LaTeX 公式...",
  className 
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[100px] p-3 border rounded-lg resize-none font-mono text-sm"
      />
      <MathPreview formula={value} isBlock={value.includes('\n')} />
    </div>
  )
}
