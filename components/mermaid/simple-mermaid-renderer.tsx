"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Eye, EyeOff, ZoomIn, ZoomOut, RefreshCw, AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { useI18n } from "@/lib/i18n-context"
import {
  sanitizeMermaidCode,
  validateMermaidCode,
  isCompleteMermaidBlock,
  generateCacheKey,
  getCachedMermaidInstance,
  cacheMermaidInstance,
  getMermaidThemeConfig,
  debounce,
  sanitizeSVG,
  cleanExpiredCache
} from "./mermaid-utils"

interface SimpleMermaidRendererProps {
  code: string
  title?: string
  description?: string
  className?: string
  id?: string
  onRetry?: () => void
}

interface RenderState {
  status: 'idle' | 'loading' | 'success' | 'error'
  svgContent?: string
  error?: string
  isComplete: boolean
}

/**
 * 簡化的 Mermaid 渲染器
 * 專注於數學題解步驟可視化，提供快速響應和穩定的基礎功能
 */
export function SimpleMermaidRenderer({
  code,
  title,
  description,
  className = "",
  id = "simple-mermaid-diagram",
  onRetry
}: SimpleMermaidRendererProps) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  const [renderState, setRenderState] = useState<RenderState>({
    status: 'idle',
    isComplete: false
  })
  const [showCode, setShowCode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 })

  // 防抖渲染函數 - 使用 useMemo 確保引用穩定
  const debouncedRender = useMemo(() =>
    debounce(async (codeToRender: string, currentTheme: string) => {
      if (!codeToRender.trim()) {
        setRenderState({
          status: 'error',
          error: 'No diagram code provided',
          isComplete: false
        })
        return
      }

      try {
        setRenderState(prev => ({ ...prev, status: 'loading', error: undefined }))

        // 檢查是否為完整代碼塊（串流兼容性）
        const isComplete = isCompleteMermaidBlock(codeToRender)
        if (!isComplete) {
          setRenderState({
            status: 'idle',
            error: undefined,
            isComplete: false
          })
          return
        }

        // 清理代碼
        const cleanedCode = sanitizeMermaidCode(codeToRender)

        // 驗證代碼
        const validation = validateMermaidCode(cleanedCode)
        if (!validation.isValid) {
          setRenderState({
            status: 'error',
            error: `Invalid diagram syntax: ${validation.issues.join(', ')}`,
            isComplete: false
          })
          return
        }

        // 檢查緩存
        const cacheKey = generateCacheKey(cleanedCode, currentTheme)
        const cachedSvg = getCachedMermaidInstance(cacheKey)
        if (cachedSvg) {
          setRenderState({
            status: 'success',
            svgContent: cachedSvg,
            isComplete: true
          })
          return
        }

        // 動態導入 Mermaid（延遲加載）
        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default

        // 配置 Mermaid
        mermaid.initialize(getMermaidThemeConfig(currentTheme))

        // 生成唯一 ID
        const diagramId = `simple-mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // 渲染圖表
        const { svg } = await mermaid.render(diagramId, cleanedCode)

        // 清理 SVG 內容
        const sanitizedSvg = sanitizeSVG(svg)

        // 緩存結果
        cacheMermaidInstance(cacheKey, sanitizedSvg)

        setRenderState({
          status: 'success',
          svgContent: sanitizedSvg,
          isComplete: true
        })

      } catch (error) {
        console.error('Simple Mermaid render error:', error)
        let errorMessage = t('visualization.renderError')
        let isParseError = false

        if (error instanceof Error) {
          // 檢查是否為解析錯誤（我們目標要修復的問題）
          if (error.message.includes('Parse error') || error.message.includes('Expecting')) {
            isParseError = true
            errorMessage = t('visualization.parseError') + ': ' + t('visualization.parseErrorHint')
          } else if (error.message.includes('Invalid diagram format')) {
            errorMessage = t('visualization.invalidFormat')
          } else if (error.message.includes('syntax')) {
            errorMessage = t('visualization.syntaxError') + ': ' + error.message
          } else if (error.message.includes('No diagram code provided')) {
            errorMessage = t('visualization.noCode')
          } else {
            errorMessage = t('visualization.renderError') + ': ' + error.message
          }
        }

        setRenderState({
          status: 'error',
          error: errorMessage,
          isComplete: false
        })
      }
    }, 300), // 300ms 防抖
    [] // 空依賴數組，debounce 函數本身已經是穩定的
  )

  // 當代碼或主題變化時重新渲染
  useEffect(() => {
    debouncedRender(code, theme)
  }, [code, theme]) // 移除 debouncedRender 依賴，因為它有穩定的引用

  // 只在第一次渲染時清理緩存，避免頻繁清理
  useEffect(() => {
    cleanExpiredCache()
  }, []) // 空依賴數組，只在組件掛載時執行一次

  // 縮放控制
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.2, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.2, 0.5))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(1)
  }, [])

  // 拖拽處理函數
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return // 只有在放大時才啟用拖拽
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    if (containerRef.current) {
      setScrollStart({
        left: containerRef.current.scrollLeft,
        top: containerRef.current.scrollTop
      })
    }
  }, [zoom])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    containerRef.current.scrollLeft = scrollStart.left - deltaX
    containerRef.current.scrollTop = scrollStart.top - deltaY
  }, [isDragging, dragStart, scrollStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 添加和移除事件監聽器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // 重新渲染
  const handleRefresh = useCallback(() => {
    // 清除緩存並重新渲染
    const cacheKey = generateCacheKey(code, theme)
    if (cacheKey) {
      // 可以在這裡實現特定的緩存清除邏輯
    }
    debouncedRender(code, theme)
  }, [code, theme, debouncedRender])

  // 如果不是完整代碼塊（串流中），顯示加載狀態
  if (!renderState.isComplete && code.trim()) {
    return (
      <Card className={`w-full ${className}`}>
        {(title || description) && (
          <div className="p-4 pb-2">
            {title && <h3 className="font-semibold text-lg">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <span className="text-sm">Generating diagram...</span>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`w-full ${className}`}>
      {(title || description) && (
        <div className="p-4 pb-2">
          {title && <h3 className="font-semibold text-lg">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      <div className="p-4">
        {/* 錯誤狀態 */}
        {renderState.status === 'error' && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{t('visualization.error')}: {renderState.error}</span>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="ml-4 shrink-0"
                  title="重新生成圖表 (Retry)"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新生成
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* 圖表渲染區域 */}
        {renderState.status === 'success' && renderState.svgContent && (
          <div className="space-y-4">
            {/* SVG 容器 */}
            <div
              ref={containerRef}
              className={`border rounded-lg bg-background overflow-auto ${
                zoom > 1 ? 'cursor-move' : 'cursor-default'
              }`}
              style={{
                maxHeight: '400px',
                userSelect: zoom > 1 ? 'none' : 'auto'
              }}
              onMouseDown={handleMouseDown}
            >
              <div
                dangerouslySetInnerHTML={{ __html: renderState.svgContent }}
                className="p-4"
                style={{
                  minWidth: 'fit-content',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.2s ease-out'
                }}
              />
            </div>

            {/* 控制按鈕 */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 代碼顯示切換 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(!showCode)}
                className="flex items-center gap-2"
                title={showCode ? t('visualization.hideCode') : t('visualization.showCode')}
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showCode ? t('visualization.hideCode') : t('visualization.showCode')}
              </Button>

              {/* 刷新 */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-2"
                title={t('visualization.refresh')}
              >
                <RefreshCw className="h-4 w-4" />
                {t('visualization.refresh')}
              </Button>

              {/* 縮放控制 */}
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="p-2"
                  title={zoom > 0.5 ? "縮小 (Zoom Out)" : "已達最小縮放"}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <span
                  className="text-sm text-muted-foreground min-w-[3rem] text-center"
                  title={`${Math.round(zoom * 100)}% 縮放比例`}
                >
                  {Math.round(zoom * 100)}%
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="p-2"
                  title={zoom < 3 ? "放大 (Zoom In)" : "已達最大縮放"}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetZoom}
                  className="p-2"
                  title="重置縮放 (Reset Zoom)"
                >
                  <span className="text-sm">↺</span>
                </Button>
              </div>
            </div>

            {/* 代碼顯示 */}
            {showCode && (
              <div className="mt-4">
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
                    <code>{code}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// 使用 memo 來優化組件，防止不必要的重新渲染
const SimpleMermaidRendererMemo = memo(SimpleMermaidRenderer, (prevProps, nextProps) => {
  // 自定義比較函數，只有在關鍵 props 變化時才重新渲染
  const codeChanged = prevProps.code !== nextProps.code
  const titleChanged = prevProps.title !== nextProps.title
  const descriptionChanged = prevProps.description !== nextProps.description
  const classNameChanged = prevProps.className !== nextProps.className
  const idChanged = prevProps.id !== nextProps.id
  const onRetryChanged = prevProps.onRetry !== nextProps.onRetry

  // 只有當關鍵 props 變化時才重新渲染
  // onRetry 函數的變化通常不重要，除非代碼也變化了
  if (codeChanged || titleChanged || descriptionChanged || classNameChanged || idChanged) {
    return false // 需要重新渲染
  }

  // 如果只有 onRetry 變化，不重新渲染
  if (onRetryChanged) {
    return true // 不重新渲染
  }

  return true // props 相同，不重新渲染
})

export default SimpleMermaidRendererMemo