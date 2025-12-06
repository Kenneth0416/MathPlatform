/**
 * 統一的 Mermaid 工具函數
 * 專注於數學題解步驟可視化的簡化處理
 */

// 支援的基礎圖表類型（專注於數學教學）
export const SUPPORTED_CHART_TYPES = [
  'flowchart',
  'graph'
] as const

export type SupportedChartType = typeof SUPPORTED_CHART_TYPES[number]

// Mermaid 實例緩存
const mermaidCache = new Map<string, any>()
const CACHE_TTL = 5 * 60 * 1000 // 5分鐘緩存

/**
 * 清理和標準化 Mermaid 代碼
 * 採用簡化邏輯，相信大模型生成正確格式的能力
 */
export function sanitizeMermaidCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return ''
  }

  // 移除代碼塊標記
  let processedCode = code.trim()
    .replace(/^```mermaid\s*\n?/, '')
    .replace(/\n?```\s*$/, '')

  // 簡化的基礎清理
  processedCode = processedCode
    // 清理重複的 flowchart 聲明
    .replace(/^(flowchart|graph)\s+TD\s+mermaid\s*/gim, '$1 TD ')
    // 移除多餘的 mermaid 前綴
    .replace(/^mermaid\s+(flowchart|graph)/gim, '$1')
    // 清理重複的類型聲明
    .replace(/^(flowchart|graph)\s+TD\s+(flowchart|graph)/gim, '$1 TD')

  // 簡化的節點標籤處理 - 只處理明顯的格式問題
  processedCode = processedCode
    // 修復過度轉義的引號（導致當前錯誤的主要原因）
    .replace(/\[\\"([^"]*)\\"\]/g, '["$1"]')
    // 修復不完整的節點標籤，確保基本的中文支持
    .replace(/\[([^\]]*[\u4e00-\u9fff][^\]]*)\]/g, '["$1"]')
    // 移除節點標籤後面無效的字符
    .replace(/\]([^\s\-\->>])/g, ']')

  // 確保有有效的圖表類型
  if (!processedCode.match(/^(flowchart|graph)\s+TD/i)) {
    // 如果包含流程圖語法，自動添加 flowchart TD
    if (processedCode.includes('-->') || processedCode.includes('===') || processedCode.includes('--o')) {
      processedCode = `flowchart TD\n${processedCode}`
    } else {
      throw new Error('Invalid diagram format. Expected flowchart or graph diagram.')
    }
  }

  // 清理多餘空行和空格
  processedCode = processedCode
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')

  return processedCode
}

/**
 * 驗證 Mermaid 代碼是否適合渲染
 * 用於串流場景的部分內容驗證
 */
export function validateMermaidCode(code: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!code || code.trim().length === 0) {
    issues.push('Empty diagram code')
    return { isValid: false, issues }
  }

  const lines = code.split('\n').filter(line => line.trim())

  // 檢查是否有圖表類型聲明
  const hasValidType = lines.some(line =>
    SUPPORTED_CHART_TYPES.some(type =>
      line.trim().startsWith(`${type} `) || line.trim().startsWith(`${type}TD`)
    )
  )

  if (!hasValidType) {
    issues.push('Missing valid chart type (flowchart, graph)')
  }

  // 檀查是否是不完整的代碼（串流場景）
  const hasNodes = lines.some(line =>
    line.includes('-->') || line.includes('===') || /[A-Z]\w*\[/.test(line)
  )

  if (!hasNodes && lines.length > 1) {
    issues.push('No diagram nodes found')
  }

  // 基礎語法檢查
  const unclosedBrackets = (code.match(/\[/g) || []).length - (code.match(/\]/g) || []).length
  if (unclosedBrackets !== 0) {
    issues.push('Unclosed brackets in node definitions')
  }

  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * 檢查是否為完整的 Mermaid 代碼塊
 * 用於串流內容判斷是否可以渲染
 */
export function isCompleteMermaidBlock(code: string): boolean {
  const trimmedCode = code.trim()

  // 檢查是否有完整的代碼塊標記
  const hasStartMarker = trimmedCode.startsWith('```mermaid')
  const hasEndMarker = trimmedCode.endsWith('```')

  if (hasStartMarker && hasEndMarker) {
    return true
  }

  // 如果沒有代碼塊標記，檢查是否為有效的原始代碼
  if (!hasStartMarker && !hasEndMarker) {
    // 首先嘗試清理和驗證代碼
    try {
      const processedCode = sanitizeMermaidCode(code)
      const validation = validateMermaidCode(processedCode)

      // 如果驗證通過且有基本的圖表結構，認為是完整的
      if (validation.isValid && validation.issues.length === 0) {
        return true
      }

      // 即使有一些小問題，只要包含基本的圖表元素也認為是完整的
      const hasBasicStructure = processedCode.includes('-->') ||
                              processedCode.includes('===') ||
                              processedCode.includes('flowchart TD') ||
                              processedCode.match(/[A-Z]\w*\s*-->/)

      return hasBasicStructure
    } catch (error) {
      // 如果清理過程出錯，可能是無效代碼
      console.warn('Mermaid validation error:', error)
      return false
    }
  }

  // 部分代碼塊 - 如果只有開始標記沒有結束，或者包含圖表元素，也認為可以嘗試渲染
  if (hasStartMarker && !hasEndMarker) {
    const hasDiagramContent = trimmedCode.includes('-->') ||
                            trimmedCode.includes('flowchart') ||
                            trimmedCode.match(/[A-Z]\w*\[/)
    return hasDiagramContent
  }

  return false
}

/**
 * 生成緩存鍵值
 */
export function generateCacheKey(code: string, theme: string): string {
  const codeHash = simpleHash(code)
  return `${codeHash}-${theme}`
}

/**
 * 簡單的字符串哈希函數
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * 緩存 Mermaid 實例
 */
export function cacheMermaidInstance(key: string, instance: any): void {
  mermaidCache.set(key, {
    instance,
    timestamp: Date.now()
  })
}

/**
 * 獲取緩存的 Mermaid 實例
 */
export function getCachedMermaidInstance(key: string): any | null {
  const cached = mermaidCache.get(key)
  if (!cached) {
    return null
  }

  // 檢查緩存是否過期
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    mermaidCache.delete(key)
    return null
  }

  return cached.instance
}

/**
 * 清理過期的緩存
 */
export function cleanExpiredCache(): void {
  const now = Date.now()
  for (const [key, value] of mermaidCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      mermaidCache.delete(key)
    }
  }
}

/**
 * 獲取主題配置
 */
export function getMermaidThemeConfig(theme: string) {
  return {
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'default',
    securityLevel: 'loose',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis'
    },
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 14,
    logLevel: 'error' as const
  }
}

/**
 * 防抖函數
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 清理 SVG 內容以防止 XSS
 */
export function sanitizeSVG(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') {
    return ''
  }

  // 移除潛在危險的標籤和屬性
  return svgContent
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
}