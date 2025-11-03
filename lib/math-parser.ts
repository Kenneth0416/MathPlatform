// 數學問題解析器
// 識別數學問題類型並提取關鍵信息

export interface MathProblem {
  type: MathProblemType
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  subject: string[]
  keywords: string[]
  variables: string[]
  equations: string[]
  originalText: string
}

export type MathProblemType = 
  | 'algebra'           // 代數
  | 'geometry'          // 幾何
  | 'calculus'          // 微積分
  | 'trigonometry'      // 三角函數
  | 'statistics'        // 統計
  | 'probability'       // 概率
  | 'number_theory'     // 數論
  | 'linear_algebra'    // 線性代數
  | 'differential_equations' // 微分方程
  | 'complex_analysis'  // 複分析
  | 'other'            // 其他

// 數學問題類型識別關鍵詞
const PROBLEM_TYPE_KEYWORDS: Record<MathProblemType, string[]> = {
  algebra: [
    '方程', 'equation', '解', 'solve', '因式分解', 'factorization',
    '多項式', 'polynomial', '根', 'root', '係數', 'coefficient',
    '二次方程', 'quadratic', '一次方程', 'linear', '代數', 'algebra'
  ],
  geometry: [
    '面積', 'area', '體積', 'volume', '周長', 'perimeter', '角度', 'angle',
    '三角形', 'triangle', '圓', 'circle', '正方形', 'square', '矩形', 'rectangle',
    '幾何', 'geometry', '坐標', 'coordinate', '距離', 'distance'
  ],
  calculus: [
    '導數', 'derivative', '積分', 'integral', '微分', 'differentiation',
    '極限', 'limit', '連續', 'continuous', '微積分', 'calculus',
    '函數', 'function', '曲線', 'curve', '切線', 'tangent'
  ],
  trigonometry: [
    '三角函數', 'trigonometry', 'sin', 'cos', 'tan', '正弦', '餘弦', '正切',
    '角度', 'angle', '弧度', 'radian', '單位圓', 'unit circle',
    '三角恆等式', 'trigonometric identity'
  ],
  statistics: [
    '統計', 'statistics', '平均數', 'mean', '中位數', 'median', '標準差', 'standard deviation',
    '方差', 'variance', '數據', 'data', '圖表', 'chart', '直方圖', 'histogram'
  ],
  probability: [
    '概率', 'probability', '機率', 'chance', '事件', 'event', '樣本空間', 'sample space',
    '排列', 'permutation', '組合', 'combination', '期望值', 'expected value'
  ],
  number_theory: [
    '數論', 'number theory', '質數', 'prime', '因數', 'factor', '最大公因數', 'gcd',
    '最小公倍數', 'lcm', '同餘', 'congruence', '模', 'modulo'
  ],
  linear_algebra: [
    '線性代數', 'linear algebra', '矩陣', 'matrix', '向量', 'vector', '行列式', 'determinant',
    '特徵值', 'eigenvalue', '特徵向量', 'eigenvector', '線性變換', 'linear transformation'
  ],
  differential_equations: [
    '微分方程', 'differential equation', '常微分方程', 'ordinary differential equation',
    '偏微分方程', 'partial differential equation', 'ODE', 'PDE'
  ],
  complex_analysis: [
    '複分析', 'complex analysis', '複數', 'complex number', '實部', 'real part',
    '虛部', 'imaginary part', '模', 'modulus', '幅角', 'argument'
  ],
  other: []
}

// 難度識別關鍵詞
const DIFFICULTY_KEYWORDS: Record<string, string[]> = {
  'K-6': ['小學', 'elementary', '基礎', 'basic', '簡單', 'simple'],
  'Middle': ['初中', 'middle school', '中等', 'intermediate'],
  'High': ['高中', 'high school', '高級', 'advanced'],
  'College': ['大學', 'college', '高等', 'higher'],
  'Contest': ['競賽', 'contest', '奧數', 'olympiad', '挑戰', 'challenge']
}

export class MathProblemParser {
  private text: string
  private lowerText: string

  constructor(text: string) {
    this.text = text.trim()
    this.lowerText = this.text.toLowerCase()
  }

  parse(): MathProblem {
    return {
      type: this.identifyProblemType(),
      difficulty: this.identifyDifficulty(),
      subject: this.extractSubjects(),
      keywords: this.extractKeywords(),
      variables: this.extractVariables(),
      equations: this.extractEquations(),
      originalText: this.text,
    }
  }

  private identifyProblemType(): MathProblemType {
    const scores: Record<MathProblemType, number> = {
      algebra: 0,
      geometry: 0,
      calculus: 0,
      trigonometry: 0,
      statistics: 0,
      probability: 0,
      number_theory: 0,
      linear_algebra: 0,
      differential_equations: 0,
      complex_analysis: 0,
      other: 0,
    }

    // 計算每種類型的匹配分數
    for (const [type, keywords] of Object.entries(PROBLEM_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        const matches = (this.lowerText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length
        scores[type as MathProblemType] += matches
      }
    }

    // 找到分數最高的類型
    const maxScore = Math.max(...Object.values(scores))
    if (maxScore === 0) {
      return 'other'
    }

    const bestType = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0]
    return (bestType as MathProblemType) || 'other'
  }

  private identifyDifficulty(): 'K-6' | 'Middle' | 'High' | 'College' | 'Contest' {
    for (const [difficulty, keywords] of Object.entries(DIFFICULTY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (this.lowerText.includes(keyword.toLowerCase())) {
          return difficulty as 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
        }
      }
    }

    // 根據問題複雜度推斷難度
    const complexity = this.assessComplexity()
    if (complexity <= 2) return 'K-6'
    if (complexity <= 4) return 'Middle'
    if (complexity <= 6) return 'High'
    if (complexity <= 8) return 'College'
    return 'Contest'
  }

  private assessComplexity(): number {
    let complexity = 0

    // 檢查數學符號的複雜度
    const complexSymbols = ['∫', '∑', '∏', '∂', '∇', '∞', '√', '^', 'log', 'ln', 'sin', 'cos', 'tan']
    complexity += complexSymbols.filter(symbol => this.text.includes(symbol)).length

    // 檢查方程數量
    const equationCount = (this.text.match(/=/g) || []).length
    complexity += equationCount

    // 檢查變量數量
    const variableCount = this.extractVariables().length
    complexity += Math.min(variableCount, 3)

    // 檢查函數調用
    const functionCalls = (this.text.match(/\b(sin|cos|tan|log|ln|exp|sqrt)\b/g) || []).length
    complexity += functionCalls

    return complexity
  }

  private extractSubjects(): string[] {
    const subjects: string[] = []
    
    for (const [type, keywords] of Object.entries(PROBLEM_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (this.lowerText.includes(keyword.toLowerCase())) {
          subjects.push(keyword)
        }
      }
    }

    return [...new Set(subjects)]
  }

  private extractKeywords(): string[] {
    const keywords: string[] = []
    
    // 提取常見的數學動詞
    const mathVerbs = ['解', 'solve', '求', 'find', '計算', 'calculate', '證明', 'prove', '化簡', 'simplify']
    for (const verb of mathVerbs) {
      if (this.lowerText.includes(verb.toLowerCase())) {
        keywords.push(verb)
      }
    }

    // 提取數學名詞
    const mathNouns = ['值', 'value', '結果', 'result', '答案', 'answer', '解', 'solution']
    for (const noun of mathNouns) {
      if (this.lowerText.includes(noun.toLowerCase())) {
        keywords.push(noun)
      }
    }

    return [...new Set(keywords)]
  }

  private extractVariables(): string[] {
    const variables: string[] = []
    
    // 匹配單個字母變量
    const singleLetterMatches = this.text.match(/\b[a-zA-Z]\b/g)
    if (singleLetterMatches) {
      variables.push(...singleLetterMatches)
    }

    // 匹配帶下標的變量
    const subscriptMatches = this.text.match(/\b[a-zA-Z]_[a-zA-Z0-9]+\b/g)
    if (subscriptMatches) {
      variables.push(...subscriptMatches)
    }

    return [...new Set(variables)]
  }

  private extractEquations(): string[] {
    const equations: string[] = []
    
    // 簡單的方程匹配（包含等號）
    const equationMatches = this.text.match(/[^=]+=[^=]+/g)
    if (equationMatches) {
      equations.push(...equationMatches.map(eq => eq.trim()))
    }

    return equations
  }

  // 格式化問題以適配 AI 提示
  formatForAI(): string {
    const problem = this.parse()
    
    let formatted = `數學問題類型：${problem.type}\n`
    formatted += `難度等級：${problem.difficulty}\n`
    
    if (problem.subject.length > 0) {
      formatted += `相關主題：${problem.subject.join(', ')}\n`
    }
    
    if (problem.variables.length > 0) {
      formatted += `涉及變量：${problem.variables.join(', ')}\n`
    }
    
    formatted += `問題內容：${problem.originalText}`
    
    return formatted
  }

  // 檢查是否為數學問題
  isMathProblem(): boolean {
    const mathIndicators = [
      /\d+/,  // 包含數字
      /[+\-*/=]/,  // 包含數學運算符
      /\b(sin|cos|tan|log|ln|exp|sqrt)\b/,  // 包含數學函數
      /\b(方程|equation|解|solve|計算|calculate)\b/,  // 包含數學動詞
      /[a-zA-Z]\s*[+\-*/=]\s*[a-zA-Z0-9]/,  // 包含變量運算
    ]

    return mathIndicators.some(pattern => pattern.test(this.text))
  }
}

// 導出便捷函數
export function parseMathProblem(text: string): MathProblem {
  const parser = new MathProblemParser(text)
  return parser.parse()
}

export function formatMathProblemForAI(text: string): string {
  const parser = new MathProblemParser(text)
  return parser.formatForAI()
}

export function isMathProblem(text: string): boolean {
  const parser = new MathProblemParser(text)
  return parser.isMathProblem()
}
