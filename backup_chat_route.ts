import { NextRequest, NextResponse } from 'next/server'
import { getAIAPIManager, POERequest, POEMessage } from '@/lib/ai-api'

export interface ChatRequest {
  messages: POEMessage[]
  mode: 'solve' | 'tutor' | 'practice' | 'check' | 'board'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
  bot?: string
}

export interface Visualization {
  id: string
  type: 'mermaid' | 'chart' | 'graph'
  code: string
  title?: string
  description?: string
}

export interface ChatResponse {
  text: string
  steps?: Array<{
    id: string
    title: string
    content: string
    explanation?: string
    formula?: string
  }>
  knowledgePoints?: string[]
  visualizations?: Visualization[]
  error?: string
}

// 構建數學學習專用的提示詞
function buildMathPrompt(request: ChatRequest): POEMessage[] {
  const { messages, mode, difficulty, language } = request

  const systemPrompts = {
    'zh-TW': {
      solve: `你是一個專業的數學老師，擅長詳細解答各種數學問題。請按照以下要求回答：

1. 提供最詳細的步驟化解答，不要跳過任何中間步驟
2. 在每個步驟中清楚說明：
   - 為什麼要這樣做（數學原理）
   - 具體如何計算（計算過程）
   - 得到了什麼結果（中間結果）
3. 使用繁體中文回答，難度等級：${difficulty}
4. 使用數學公式時，請用 LaTeX 格式（用 $...$ 包圍行內公式，$$...$$ 包圍塊級公式）
5. 最後提供：
   - 明確的最終答案
   - 驗證過程（檢查答案是否正確）
   - 相關知識點總結

請確保解答完整、準確且易於理解，就像在教室裡詳細教學一樣。`,
      tutor: `你是一個耐心的數學導師，專注於引導學生獨立思考。請按照以下要求回答：

1. **絕不直接給出最終答案**，只引導學生找到解題思路
2. 分析問題特點，提示應該使用什麼方法和公式
3. 提供思考方向和提示問題，讓學生自己探索：
   - "你覺得第一步應該考慮什麼？"
   - "這個條件讓你想到什麼公式？"
   - "如何把這個問題轉化成你熟悉的形式？"
4. 使用繁體中文回答，難度等級：${difficulty}
5. 必要時提供相關數學概念和定理的說明，但不直接套用
6. 鼓勵學生嘗試，並給出下一步的建議方向

請像真正的導師一樣，一步步引導但讓學生自己完成解答。`,
      practice: `你是一個數學練習題生成專家。請按照以下要求回答：

1. 根據學生的問題生成相關的練習題，**不要提供答案或解題過程**
2. 生成3-5道不同難度的題目，從基礎到進階
3. 每道題目包含：
   - 清晰的題目描述
   - 具體的已知條件
   - 明確的求解要求
4. 使用繁體中文回答，難度等級：${difficulty}
5. 使用 LaTeX 格式書寫數學公式
6. 題目類型要與學生提出的問題相似但有變化

請只生成練習題，讓學生有獨立思考和解題的機會。`,
      check: `你是一個數學作業檢查助手，提供快速的答案驗證。請按照以下要求回答：

1. 直接給出明確的答案結果（對/錯判斷）
2. 如果學生解答錯誤，提供：
   - 正確的最終答案
   - 關鍵的解題步驟（2-3個核心步驟，不是詳細過程）
   - 主要錯誤點指出
3. 如果學生解答正確，給出肯定和簡要的驗證方法
4. 使用繁體中文回答，難度等級：${difficulty}
5. 使用 LaTeX 格式書寫數學公式
6. 簡潔明了，避免冗長的解釋

請提供快速、準確的檢查結果，幫助學生立即了解正誤。`
    },
    'zh-CN': {
      solve: `你是一个专业的数学老师，擅长详细解答各种数学问题。请按照以下要求回答：

1. 提供最详细的步骤化解答，不要跳过任何中间步骤
2. 在每个步骤中清楚说明：
   - 为什么要这样做（数学原理）
   - 具体如何计算（计算过程）
   - 得到了什么结果（中间结果）
3. 使用简体中文回答，难度等级：${difficulty}
4. 使用数学公式时，请用 LaTeX 格式（用 $...$ 包围行内公式，$$...$$ 包围块级公式）
5. 最后提供：
   - 明确的最终答案
   - 验证过程（检查答案是否正确）
   - 相关知识点总结

请确保解答完整、准确且易于理解，就像在教室里详细教学一样。`,
      tutor: `你是一个耐心的数学导师，专注于引导学生独立思考。请按照以下要求回答：

1. **绝不直接给出最终答案**，只引导学生找到解题思路
2. 分析问题特点，提示应该使用什么方法和公式
3. 提供思考方向和提示问题，让学生自己探索：
   - "你觉得第一步应该考虑什么？"
   - "这个条件让你想到什么公式？"
   - "如何把这个问题转化成熟悉的形式？"
4. 使用简体中文回答，难度等级：${difficulty}
5. 必要时提供相关数学概念和定理的说明，但不直接套用
6. 鼓励学生尝试，并给出下一步的建议方向

请像真正的导师一样，一步步引导但让学生自己完成解答。`,
      practice: `你是一个数学练习题生成专家。请按照以下要求回答：

1. 根据学生的问题生成相关的练习题，**不要提供答案或解题过程**
2. 生成3-5道不同难度的题目，从基础到进阶
3. 每道题目包含：
   - 清晰的题目描述
   - 具体的已知条件
   - 明确的求解要求
4. 使用简体中文回答，难度等级：${difficulty}
5. 使用 LaTeX 格式书写数学公式
6. 题目类型要与学提出的问题相似但有变化

请只生成练习题，让学生有独立思考和解题的机会。`,
      check: `你是一个数学作业检查助手，提供快速的答案验证。请按照以下要求回答：

1. 直接给出明确的答案结果（对/错判断）
2. 如果学生解答错误，提供：
   - 正确的最终答案
   - 关键的解题步骤（2-3个核心步骤，不是详细过程）
   - 主要错误点指出
3. 如果学生解答正确，给出肯定和简要的验证方法
4. 使用简体中文回答，难度等级：${difficulty}
5. 使用 LaTeX 格式书写数学公式
6. 简洁明了，避免冗长的解释

请提供快速、准确的检查结果，帮助学生立即了解正误。`
    },
    'en': {
      solve: `You are a professional math teacher who excels at providing detailed solutions to various mathematical problems. Please respond according to the following requirements:

1. Provide the most detailed step-by-step solutions, never skipping intermediate steps
2. In each step, clearly explain:
   - Why we do this (mathematical principle)
   - How to calculate specifically (calculation process)
   - What result we get (intermediate result)
3. Use English to respond, difficulty level: ${difficulty}
4. When using mathematical formulas, please use LaTeX format (use $...$ for inline formulas, $$...$$ for block-level formulas)
5. Finally provide:
   - Clear final answer
   - Verification process (check if answer is correct)
   - Related knowledge points summary

Please ensure solutions are complete, accurate, and easy to understand, just like detailed classroom teaching.`,
      tutor: `You are a patient math tutor focused on guiding students to think independently. Please respond according to the following requirements:

1. **Never give the final answer directly**, only guide students to find problem-solving approaches
2. Analyze problem characteristics and suggest what methods and formulas to use
3. Provide thinking directions and prompt questions for students to explore:
   - "What do you think should be considered first?"
   - "What formula does this condition remind you of?"
   - "How can you transform this problem into a familiar form?"
4. Use English to respond, difficulty level: ${difficulty}
5. When necessary, provide explanations of relevant mathematical concepts and theorems, but don't directly apply them
6. Encourage students to try and give suggestions for next steps

Please guide step by step like a real tutor, but let students complete the solution themselves.`,
      practice: `You are a math practice problem generation expert. Please respond according to the following requirements:

1. Generate related practice problems based on students' questions, **DO NOT provide answers or solution processes**
2. Generate 3-5 problems of varying difficulty, from basic to advanced
3. Each problem should include:
   - Clear problem description
   - Specific given conditions
   - Clear solution requirements
4. Use English to respond, difficulty level: ${difficulty}
5. Use LaTeX format for mathematical formulas
6. Problem types should be similar to but different from the student's question

Please only generate practice problems, giving students the opportunity to think and solve independently.`,
      check: `You are a math homework checking assistant providing fast answer verification. Please respond according to the following requirements:

1. Directly provide clear answer results (right/wrong judgment)
2. If student's solution is wrong, provide:
   - Correct final answer
   - Key solution steps (2-3 core steps, not detailed process)
   - Main error points identification
3. If student's solution is correct, give affirmation and brief verification method
4. Use English to respond, difficulty level: ${difficulty}
5. Use LaTeX format for mathematical formulas
6. Be concise and clear, avoid lengthy explanations

Please provide fast, accurate checking results to help students immediately understand correctness.`
    }
  }

  const systemPrompt = systemPrompts[language][mode]
  
  return [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
    ...messages
  ]
}

// 生成模擬響應用於測試
function generateMockResponse(request: ChatRequest): ChatResponse {
  const { mode, difficulty, language } = request
  const lastMessage = request.messages[request.messages.length - 1]
  const question = lastMessage?.content || ''

  // 根據問題內容生成不同的模擬響應
  if (question.includes('二次方程') || question.includes('x²')) {
    return {
      text: `讓我來幫您解這個二次方程。

**步驟 1：識別方程形式**

方程為：$x^2 + 5x + 6 = 0$

這是標準的二次方程形式 $ax^2 + bx + c = 0$，其中 $a=1$, $b=5$, $c=6$

**步驟 2：選擇解法**

我們可以使用因式分解法，因為 6 可以分解為 $2 \\times 3$，且 $2+3=5$（正好等於 b）

**步驟 3：因式分解**

$$x^2 + 5x + 6 = (x + 2)(x + 3) = 0$$

**步驟 4：求解**

根據零因子定理：
- $x + 2 = 0$  →  $x = -2$
- $x + 3 = 0$  →  $x = -3$

**結論**

方程的解為：$x_1 = -2$, $x_2 = -3$

**驗證**：代入原方程檢驗
- $(-2)^2 + 5(-2) + 6 = 4 - 10 + 6 = 0$ ✓
- $(-3)^2 + 5(-3) + 6 = 9 - 15 + 6 = 0$ ✓`,
      steps: [
        {
          id: 'step-1',
          title: '步驟 1：識別方程形式',
          content: '方程為：$x^2 + 5x + 6 = 0$\n\n這是標準的二次方程形式 $ax^2 + bx + c = 0$，其中 $a=1$, $b=5$, $c=6$'
        },
        {
          id: 'step-2',
          title: '步驟 2：選擇解法',
          content: '我們可以使用因式分解法，因為 6 可以分解為 $2 \\times 3$，且 $2+3=5$（正好等於 b）'
        },
        {
          id: 'step-3',
          title: '步驟 3：因式分解',
          content: '$$x^2 + 5x + 6 = (x + 2)(x + 3) = 0$$'
        },
        {
          id: 'step-4',
          title: '步驟 4：求解',
          content: '根據零因子定理：\n- $x + 2 = 0$  →  $x = -2$\n- $x + 3 = 0$  →  $x = -3$'
        },
        {
          id: 'step-5',
          title: '結論',
          content: '方程的解為：$x_1 = -2$, $x_2 = -3$\n\n**驗證**：代入原方程檢驗\n- $(-2)^2 + 5(-2) + 6 = 4 - 10 + 6 = 0$ ✓\n- $(-3)^2 + 5(-3) + 6 = 9 - 15 + 6 = 0$ ✓'
        }
      ],
      knowledgePoints: ['二次方程', '因式分解', '零因子定理']
    }
  }

  if (question.includes('三角函數') || question.includes('sin') || question.includes('cos')) {
    return {
      text: `讓我來講解三角函數的基本關係。

**步驟 1：基本定義**

在直角三角形中：
- $\\sin\\theta = \\frac{\\text{對邊}}{\\text{斜邊}}$
- $\\cos\\theta = \\frac{\\text{鄰邊}}{\\text{斜邊}}$
- $\\tan\\theta = \\frac{\\text{對邊}}{\\text{鄰邊}} = \\frac{\\sin\\theta}{\\cos\\theta}$

**步驟 2：勾股定理推導**

根據勾股定理：$\\text{對邊}^2 + \\text{鄰邊}^2 = \\text{斜邊}^2$

兩邊同時除以斜邊²：
$$\\left(\\frac{\\text{對邊}}{\\text{斜邊}}\\right)^2 + \\left(\\frac{\\text{鄰邊}}{\\text{斜邊}}\\right)^2 = 1$$

**步驟 3：得出恆等式**

$$\\sin^2\\theta + \\cos^2\\theta = 1$$

這是三角函數最重要的恆等式之一！`,
      steps: [
        {
          id: 'step-1',
          title: '步驟 1：基本定義',
          content: '在直角三角形中：\n- $\\sin\\theta = \\frac{\\text{對邊}}{\\text{斜邊}}$\n- $\\cos\\theta = \\frac{\\text{鄰邊}}{\\text{斜邊}}$\n- $\\tan\\theta = \\frac{\\text{對邊}}{\\text{鄰邊}} = \\frac{\\sin\\theta}{\\cos\\theta}$'
        },
        {
          id: 'step-2',
          title: '步驟 2：勾股定理推導',
          content: '根據勾股定理：$\\text{對邊}^2 + \\text{鄰邊}^2 = \\text{斜邊}^2$\n\n兩邊同時除以斜邊²：\n$$\\left(\\frac{\\text{對邊}}{\\text{斜邊}}\\right)^2 + \\left(\\frac{\\text{鄰邊}}{\\text{斜邊}}\\right)^2 = 1$$'
        },
        {
          id: 'step-3',
          title: '步驟 3：得出恆等式',
          content: '$$\\sin^2\\theta + \\cos^2\\theta = 1$$\n\n這是三角函數最重要的恆等式之一！'
        }
      ],
      knowledgePoints: ['三角函數', '勾股定理', '三角恆等式']
    }
  }

  // 默認響應
  return {
    text: `您好！我是您的數學學習助手。我可以幫助您解答各種數學問題。

**當前設置：**
- 模式：${mode}
- 難度：${difficulty}
- 語言：${language}

**我可以幫助您：**
- 解各種數學方程
- 解釋數學概念
- 提供步驟化解答
- 生成練習題

請輸入您的數學問題，我會為您提供詳細的解答！

**注意：** 目前使用的是模擬響應。要使用真實的 AI 服務，請配置 POE_API_KEY 環境變量。`,
    steps: [
      {
        id: 'step-1',
        title: '歡迎使用數學學習平台',
        content: '我是您的專屬數學學習助手，隨時為您提供幫助！'
      }
    ],
    knowledgePoints: ['數學學習', 'AI助手']
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    
    // 驗證請求
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      )
    }

    if (!body.mode || !body.difficulty || !body.language) {
      return NextResponse.json(
        { error: 'Invalid request: mode, difficulty, and language are required' },
        { status: 400 }
      )
    }

    // 檢查 POE API 密鑰
    if (!process.env.POE_API_KEY) {
      console.error('POE_API_KEY is not configured')
      return NextResponse.json(
        { 
          error: 'POE API is not configured. Please set POE_API_KEY in your environment variables.',
          text: '抱歉，AI 服務暫時不可用。請檢查服務器配置。'
        },
        { status: 503 }
      )
    }

    // 構建 AI API 請求（不指定 model，讓 API 管理器使用各 provider 的默認模型）
    const aiRequest: POERequest = {
      messages: buildMathPrompt(body),
      temperature: 0.7,
      max_tokens: 2000,
    }

    console.log('Sending request to AI API:', { 
      messageCount: aiRequest.messages.length,
      mode: body.mode 
    })

    // 調用 AI API 管理器（自動切換提供商）
    const response = await getAIAPIManager().sendMessage(aiRequest)

    if (typeof response === 'object' && 'error' in response && response.error) {
      console.error('AI API Error:', response.error)
      return NextResponse.json(
        { 
          error: `AI API Error: ${response.error}`,
          text: '抱歉，AI 服務暫時不可用。請稍後再試。'
        },
        { status: 502 }
      )
    }

    // 確保 response 不是流
    if (response instanceof ReadableStream) {
      throw new Error('Expected non-streaming response but got stream')
    }

    // 解析響應，提取步驟、知識點和可視化
    const chatResponse: ChatResponse = {
      text: response.text,
      steps: parseSteps(response.text),
      knowledgePoints: extractKnowledgePoints(response.text),
      visualizations: extractVisualizations(response.text),
    }

    console.log('Successfully processed chat request with AI API')
    return NextResponse.json(chatResponse)

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        text: '抱歉，處理您的請求時發生錯誤。請稍後再試。'
      },
      { status: 500 }
    )
  }
}

// 解析步驟化解答
function parseSteps(text: string): Array<{
  id: string
  title: string
  content: string
  explanation?: string
  formula?: string
}> {
  const steps: Array<{
    id: string
    title: string
    content: string
    explanation?: string
    formula?: string
  }> = []

  // 匹配步驟模式
  const stepPatterns = [
    /(?:步驟|步骤|Step)\s*(\d+)[:：]\s*(.+?)(?=(?:步驟|步骤|Step)\s*\d+[:：]|$)/gs,
    /(?:第|第)\s*(\d+)\s*(?:步|步)[:：]\s*(.+?)(?=(?:第|第)\s*\d+\s*(?:步|步)[:：]|$)/gs,
  ]

  for (const pattern of stepPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const stepNumber = match[1]
      const stepContent = match[2].trim()
      
      // 提取公式
      const formulaMatch = stepContent.match(/\$\$([^$]+)\$\$|\$([^$]+)\$/)
      const formula = formulaMatch ? (formulaMatch[1] || formulaMatch[2]) : undefined
      
      // 提取解釋
      const explanation = stepContent.replace(/\$\$[^$]+\$\$|\$[^$]+\$/g, '').trim()

      steps.push({
        id: `step-${stepNumber}`,
        title: `步驟 ${stepNumber}`,
        content: stepContent,
        explanation,
        formula,
      })
    }
  }

  return steps
}

// 提取知識點
function extractKnowledgePoints(text: string): string[] {
  const knowledgePoints: string[] = []

  // 常見數學知識點關鍵詞
  const mathKeywords = [
    '二次方程', '一次方程', '線性方程', 'quadratic equation', 'linear equation',
    '三角函數', 'trigonometry', 'sin', 'cos', 'tan',
    '導數', 'derivative', '微分', 'differentiation',
    '積分', 'integral', 'integration',
    '幾何', 'geometry', '面積', 'area', '體積', 'volume',
    '概率', 'probability', '統計', 'statistics',
    '向量', 'vector', '矩陣', 'matrix',
    '函數', 'function', '圖像', 'graph',
    '不等式', 'inequality', '絕對值', 'absolute value',
    '對數', 'logarithm', '指數', 'exponential',
    '數列', 'sequence', '級數', 'series',
    '複數', 'complex number', '極坐標', 'polar coordinates',
  ]

  for (const keyword of mathKeywords) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      knowledgePoints.push(keyword)
    }
  }

  return [...new Set(knowledgePoints)] // 去重
}

// 提取 Mermaid 可視化代碼
function extractVisualizations(text: string): Visualization[] {
  const visualizations: Visualization[] = []

  // 匹配 Mermaid 代碼塊
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/gi
  let match

  while ((match = mermaidRegex.exec(text)) !== null) {
    const mermaidCode = match[1].trim()

    if (mermaidCode) {
      // 分析 Mermaid 類型
      let type: 'mermaid' | 'chart' | 'graph' = 'mermaid'

      if (mermaidCode.toLowerCase().includes('flowchart')) {
        type = 'mermaid'
      } else if (mermaidCode.toLowerCase().includes('graph')) {
        type = 'graph'
      } else if (mermaidCode.toLowerCase().includes('sequence')) {
        type = 'mermaid'
      }

      // 生成 ID
      const id = `mermaid-${visualizations.length + 1}-${Date.now()}`

      // 提取標題（如果有的話）
      let title: string | undefined
      const titleMatch = mermaidCode.match(/title\s*[:：]\s*(.+)/i)
      if (titleMatch) {
        title = titleMatch[1].trim()
      }

      visualizations.push({
        id,
        type,
        code: mermaidCode,
        title
      })
    }
  }

  return visualizations
}
