// 步驟化解答解析器
// 從 AI 響應中提取和解析步驟化解答

export interface SolutionStep {
  id: string
  title: string
  content: string
  explanation?: string
  formula?: string
  isExpanded: boolean
  isHidden: boolean
  order: number
}

export interface ParsedSolution {
  steps: SolutionStep[]
  summary?: string
  answer?: string
  verification?: string
  knowledgePoints: string[]
}

export class SolutionParser {
  private text: string
  private language: 'zh-TW' | 'zh-CN' | 'en'

  constructor(text: string, language: 'zh-TW' | 'zh-CN' | 'en' = 'zh-CN') {
    this.text = text.trim()
    this.language = language
  }

  parse(): ParsedSolution {
    return {
      steps: this.extractSteps(),
      summary: this.extractSummary(),
      answer: this.extractAnswer(),
      verification: this.extractVerification(),
      knowledgePoints: this.extractKnowledgePoints(),
    }
  }

  private extractSteps(): SolutionStep[] {
    const steps: SolutionStep[] = []
    const usedIds = new Set<string>() // 追蹤已使用的 ID
    
    // 定義不同語言的步驟模式
    const stepPatterns = this.getStepPatterns()
    
    for (const pattern of stepPatterns) {
      const matches = this.text.match(pattern.regex)
      if (matches) {
        const stepMatches = this.text.matchAll(pattern.regex)
        
        for (const match of stepMatches) {
          const stepNumber = match[1] || '1'
          // 根據正則表達式，可能只有2個或3個捕獲組
          // match[2] 可能是標題（如果正則有3個組）或內容（如果正則只有2個組）
          // match[3] 是內容（如果正則有3個組）
          const stepTitleRaw = match[2] && match[3] ? match[2].trim() : '' // 只有當match[3]存在時，match[2]才是標題
          const stepContent = match[3] ? match[3].trim() : (match[2] ? match[2].trim() : '')
          
          // 處理標題和內容
          // 如果標題存在且內容也存在，使用標題作為摺疊標題，內容作為展開內容
          // 如果只有標題沒有內容，標題就是內容
          // 如果標題為空但內容存在，從內容第一句提取標題
          let stepTitle = stepTitleRaw
          let finalContent = stepContent
          
          if (stepTitle && stepContent) {
            // 有標題和內容，直接使用
          } else if (stepTitle && !stepContent) {
            // 只有標題，標題就是內容
            finalContent = stepTitle
          } else if (!stepTitle && stepContent) {
            // 沒有標題但有內容，從內容第一行提取標題（最多50字符）
            const firstLine = stepContent.split('\n')[0].trim()
            stepTitle = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine
            finalContent = stepContent
          } else {
            // 都沒有，跳過
            continue
          }
          
          // 如果標題為空，生成默認標題
          if (!stepTitle) {
            stepTitle = `步驟 ${stepNumber}`
          }
          
          // 清理標題中的 markdown 格式
          stepTitle = stepTitle.replace(/\*\*|__|#/g, '').trim()
          
          if (finalContent.trim()) {
            // 生成唯一的 ID
            let stepId = `step-${stepNumber}`
            let idIndex = 0
            // 如果 ID 已存在，添加後綴確保唯一性
            while (usedIds.has(stepId)) {
              idIndex++
              stepId = `step-${stepNumber}-${idIndex}`
            }
            usedIds.add(stepId)
            
            steps.push({
              id: stepId, // 使用唯一的 ID
              title: stepTitle, // 用作摺疊標題
              content: finalContent, // 完整內容
              explanation: this.extractExplanation(finalContent),
              formula: this.extractFormula(finalContent),
              isExpanded: true,
              isHidden: false,
              order: parseInt(stepNumber) || steps.length + 1,
            })
          }
        }
        
        if (steps.length > 0) {
          break // 找到步驟就停止
        }
      }
    }

    // 如果沒有找到明確的步驟，返回空數組而不是分割段落
    // 這樣只有 AI 明確標註步驟時才會創建摺疊
    return steps.sort((a, b) => a.order - b.order)
  }

  private getStepPatterns() {
    const patterns = {
      'zh-TW': [
        {
          // 匹配: 步驟 1: 標題\n內容 或 步驟1: 標題\n內容（有換行）
          regex: /(?:步驟|步骤)\s*(\d+)\s*[:：]\s*([^\n]+)\n+([\s\S]*?)(?=(?:步驟|步骤)\s*\d+\s*[:：]|$)/gs,
        },
        {
          // 匹配: 步驟 1: 內容（沒有換行，標題和內容合一）
          regex: /(?:步驟|步骤)\s*(\d+)\s*[:：]\s*([\s\S]*?)(?=(?:步驟|步骤)\s*\d+\s*[:：]|$)/gs,
        },
        {
          // 匹配: 第 1 步: 標題\n內容 或 第1步: 標題\n內容
          regex: /第\s*(\d+)\s*步\s*[:：]\s*([^\n]+)\n+([\s\S]*?)(?=第\s*\d+\s*步\s*[:：]|$)/gs,
        },
        {
          // 匹配: 第 1 步: 內容（沒有換行）
          regex: /第\s*(\d+)\s*步\s*[:：]\s*([\s\S]*?)(?=第\s*\d+\s*步\s*[:：]|$)/gs,
        }
      ],
      'zh-CN': [
        {
          regex: /(?:步骤|步驟)\s*(\d+)\s*[:：]\s*([^\n]+)\n+([\s\S]*?)(?=(?:步骤|步驟)\s*\d+\s*[:：]|$)/gs,
        },
        {
          regex: /(?:步骤|步驟)\s*(\d+)\s*[:：]\s*([\s\S]*?)(?=(?:步骤|步驟)\s*\d+\s*[:：]|$)/gs,
        },
        {
          regex: /第\s*(\d+)\s*步\s*[:：]\s*([^\n]+)\n+([\s\S]*?)(?=第\s*\d+\s*步\s*[:：]|$)/gs,
        },
        {
          regex: /第\s*(\d+)\s*步\s*[:：]\s*([\s\S]*?)(?=第\s*\d+\s*步\s*[:：]|$)/gs,
        }
      ],
      'en': [
        {
          regex: /Step\s*(\d+)\s*[:：]\s*([^\n]+)\n+([\s\S]*?)(?=Step\s*\d+\s*[:：]|$)/gis,
        },
        {
          regex: /Step\s*(\d+)\s*[:：]\s*([\s\S]*?)(?=Step\s*\d+\s*[:：]|$)/gis,
        }
      ]
    }

    return patterns[this.language] || patterns['zh-CN']
  }

  private parseByParagraphs(): SolutionStep[] {
    const paragraphs = this.text.split('\n\n').filter(p => p.trim().length > 0)
    const steps: SolutionStep[] = []

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim()
      
      // 跳過明顯不是步驟的段落
      if (this.isNonStepParagraph(paragraph)) {
        continue
      }

      steps.push({
        id: `step-${i + 1}`,
        title: this.generateStepTitle(paragraph, i + 1),
        content: paragraph,
        explanation: this.extractExplanation(paragraph),
        formula: this.extractFormula(paragraph),
        isExpanded: true,
        isHidden: false,
        order: i + 1,
      })
    }

    return steps
  }

  private isNonStepParagraph(paragraph: string): boolean {
    const nonStepIndicators = [
      /^(?:解|答|答案|Answer|Solution)/i,
      /^(?:因此|所以|Thus|Therefore|Hence)/i,
      /^(?:驗證|验证|Verification)/i,
      /^(?:總結|总结|Summary)/i,
      /^(?:結論|结论|Conclusion)/i,
    ]

    return nonStepIndicators.some(pattern => pattern.test(paragraph))
  }

  private generateStepTitle(content: string, stepNumber: number): string {
    // 嘗試從內容中提取標題
    const titleMatch = content.match(/^(.{1,50})[:：]/)
    if (titleMatch) {
      return titleMatch[1].trim()
    }

    // 生成默認標題
    const titles = {
      'zh-TW': `步驟 ${stepNumber}`,
      'zh-CN': `步骤 ${stepNumber}`,
      'en': `Step ${stepNumber}`
    }

    return titles[this.language]
  }

  private extractExplanation(content: string): string | undefined {
    // 移除公式後剩餘的解釋文本
    const withoutFormulas = content.replace(/\$\$[^$]+\$\$|\$[^$]+\$/g, '').trim()
    
    if (withoutFormulas.length > 10) {
      return withoutFormulas
    }
    
    return undefined
  }

  private extractFormula(content: string): string | undefined {
    // 提取 LaTeX 公式
    const formulaMatch = content.match(/\$\$([^$]+)\$\$|\$([^$]+)\$/)
    
    if (formulaMatch) {
      return formulaMatch[1] || formulaMatch[2]
    }
    
    return undefined
  }

  private extractSummary(): string | undefined {
    const summaryPatterns = {
      'zh-TW': /(?:總結|总结)[:：]\s*(.+?)(?=\n|$)/i,
      'zh-CN': /(?:總結|总结)[:：]\s*(.+?)(?=\n|$)/i,
      'en': /(?:Summary|summary)[:：]\s*(.+?)(?=\n|$)/i,
    }

    const pattern = summaryPatterns[this.language]
    const match = this.text.match(pattern)
    
    return match ? match[1].trim() : undefined
  }

  private extractAnswer(): string | undefined {
    const answerPatterns = {
      'zh-TW': /(?:答案|答)[:：]\s*(.+?)(?=\n|$)/i,
      'zh-CN': /(?:答案|答)[:：]\s*(.+?)(?=\n|$)/i,
      'en': /(?:Answer|answer)[:：]\s*(.+?)(?=\n|$)/i,
    }

    const pattern = answerPatterns[this.language]
    const match = this.text.match(pattern)
    
    return match ? match[1].trim() : undefined
  }

  private extractVerification(): string | undefined {
    const verificationPatterns = {
      'zh-TW': /(?:驗證|验证)[:：]\s*(.+?)(?=\n|$)/i,
      'zh-CN': /(?:驗證|验证)[:：]\s*(.+?)(?=\n|$)/i,
      'en': /(?:Verification|verification)[:：]\s*(.+?)(?=\n|$)/i,
    }

    const pattern = verificationPatterns[this.language]
    const match = this.text.match(pattern)
    
    return match ? match[1].trim() : undefined
  }

  private extractKnowledgePoints(): string[] {
    const knowledgePoints: string[] = []
    
    // 常見數學知識點關鍵詞
    const mathKeywords = [
      // 代數
      '二次方程', '一次方程', '線性方程', 'quadratic equation', 'linear equation',
      '因式分解', 'factorization', '多項式', 'polynomial',
      
      // 幾何
      '面積', 'area', '體積', 'volume', '周長', 'perimeter', '角度', 'angle',
      '三角形', 'triangle', '圓', 'circle', '正方形', 'square',
      
      // 微積分
      '導數', 'derivative', '積分', 'integral', '微分', 'differentiation',
      '極限', 'limit', '連續', 'continuous',
      
      // 三角函數
      '三角函數', 'trigonometry', 'sin', 'cos', 'tan', '正弦', '餘弦', '正切',
      
      // 概率統計
      '概率', 'probability', '統計', 'statistics', '平均數', 'mean',
      '排列', 'permutation', '組合', 'combination',
      
      // 其他
      '函數', 'function', '圖像', 'graph', '不等式', 'inequality',
      '對數', 'logarithm', '指數', 'exponential', '數列', 'sequence',
    ]

    for (const keyword of mathKeywords) {
      if (this.text.toLowerCase().includes(keyword.toLowerCase())) {
        knowledgePoints.push(keyword)
      }
    }

    return [...new Set(knowledgePoints)] // 去重
  }

  // 檢查是否包含步驟化解答
  hasSteps(): boolean {
    const stepIndicators = [
      /(?:步驟|步骤|Step)\s*\d+/i,
      /(?:第|第)\s*\d+\s*(?:步|步)/i,
      /(?:First|Second|Third|Fourth|Fifth)/i,
    ]

    return stepIndicators.some(pattern => pattern.test(this.text))
  }

  // 獲取步驟數量
  getStepCount(): number {
    return this.extractSteps().length
  }
}

// 導出便捷函數
export function parseSolution(text: string, language: 'zh-TW' | 'zh-CN' | 'en' = 'zh-CN'): ParsedSolution {
  const parser = new SolutionParser(text, language)
  return parser.parse()
}

export function hasSolutionSteps(text: string): boolean {
  const parser = new SolutionParser(text)
  return parser.hasSteps()
}

export function getSolutionStepCount(text: string): number {
  const parser = new SolutionParser(text)
  return parser.getStepCount()
}

// 步驟格式化工具
export class StepFormatter {
  static formatStep(step: SolutionStep, index: number): string {
    return `${step.title}\n\n${step.content}`
  }

  static formatAllSteps(steps: SolutionStep[]): string {
    return steps.map((step, index) => this.formatStep(step, index)).join('\n\n')
  }

  static createStepSummary(steps: SolutionStep[]): string {
    const stepTitles = steps.map(step => step.title).join(' → ')
    return `解題步驟：${stepTitles}`
  }
}
