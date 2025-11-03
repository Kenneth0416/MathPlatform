import { NextRequest, NextResponse } from 'next/server'
import { poeClient, POERequest, POEMessage } from '@/lib/poe-api'

export interface ChatRequest {
  messages: POEMessage[]
  mode: 'solve' | 'tutor' | 'practice' | 'check' | 'board'
  difficulty: 'K-6' | 'Middle' | 'High' | 'College' | 'Contest'
  language: 'zh-TW' | 'zh-CN' | 'en'
  bot?: string
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
  error?: string
}

// 構建數學學習專用的提示詞
function buildMathPrompt(request: ChatRequest): POEMessage[] {
  const { messages, mode, difficulty, language } = request
  
  const systemPrompts = {
    'zh-TW': {
      solve: `你是一個專業的數學老師，擅長解答各種數學問題。請按照以下要求回答：

1. 提供詳細的步驟化解答
2. 使用繁體中文回答
3. 難度等級：${difficulty}
4. 在每個步驟中清楚說明計算過程
5. 使用數學公式時，請用 LaTeX 格式（用 $...$ 包圍行內公式，$$...$$ 包圍塊級公式）
6. 最後提供答案和驗證

請確保解答準確、清晰且易於理解。`,
      tutor: `你是一個耐心的數學導師，專注於引導學生思考。請按照以下要求回答：

1. 不要直接給出答案，而是引導學生思考
2. 提供提示和思考方向
3. 使用繁體中文回答
4. 難度等級：${difficulty}
5. 鼓勵學生自己嘗試解決問題
6. 在必要時提供相關的數學概念和公式

請以啟發式的方式教學。`,
      practice: `你是一個數學練習題生成專家。請按照以下要求回答：

1. 根據學生的問題生成相關的練習題
2. 提供不同難度的題目
3. 使用繁體中文回答
4. 難度等級：${difficulty}
5. 每題都要有詳細解答
6. 使用 LaTeX 格式書寫數學公式

請生成實用的練習題。`,
      check: `你是一個數學作業檢查助手。請按照以下要求回答：

1. 檢查學生提供的解答是否正確
2. 指出錯誤並提供正確的解法
3. 使用繁體中文回答
4. 難度等級：${difficulty}
5. 給出評分和改進建議
6. 使用 LaTeX 格式書寫數學公式

請提供詳細的檢查結果。`,
      board: `你是一個數學白板助手，幫助學生整理思路。請按照以下要求回答：

1. 幫助學生整理解題思路
2. 提供解題框架和步驟
3. 使用繁體中文回答
4. 難度等級：${difficulty}
5. 使用 LaTeX 格式書寫數學公式
6. 提供清晰的邏輯結構

請幫助學生建立解題思維。`
    },
    'zh-CN': {
      solve: `你是一个专业的数学老师，擅长解答各种数学问题。请按照以下要求回答：

1. 提供详细的步骤化解答
2. 使用简体中文回答
3. 难度等级：${difficulty}
4. 在每个步骤中清楚说明计算过程
5. 使用数学公式时，请用 LaTeX 格式（用 $...$ 包围行内公式，$$...$$ 包围块级公式）
6. 最后提供答案和验证

请确保解答准确、清晰且易于理解。`,
      tutor: `你是一个耐心的数学导师，专注于引导学生思考。请按照以下要求回答：

1. 不要直接给出答案，而是引导学生思考
2. 提供提示和思考方向
3. 使用简体中文回答
4. 难度等级：${difficulty}
5. 鼓励学生自己尝试解决问题
6. 在必要时提供相关的数学概念和公式

请以启发式的方式教学。`,
      practice: `你是一个数学练习题生成专家。请按照以下要求回答：

1. 根据学生的问题生成相关的练习题
2. 提供不同难度的题目
3. 使用简体中文回答
4. 难度等级：${difficulty}
5. 每题都要有详细解答
6. 使用 LaTeX 格式书写数学公式

请生成实用的练习题。`,
      check: `你是一个数学作业检查助手。请按照以下要求回答：

1. 检查学生提供的解答是否正确
2. 指出错误并提供正确的解法
3. 使用简体中文回答
4. 难度等级：${difficulty}
5. 给出评分和改进建议
6. 使用 LaTeX 格式书写数学公式

请提供详细的检查结果。`,
      board: `你是一个数学白板助手，帮助学生整理思路。请按照以下要求回答：

1. 帮助学生整理解题思路
2. 提供解题框架和步骤
3. 使用简体中文回答
4. 难度等级：${difficulty}
5. 使用 LaTeX 格式书写数学公式
6. 提供清晰的逻辑结构

请帮助学生建立解题思维。`
    },
    'en': {
      solve: `You are a professional math teacher who excels at solving various mathematical problems. Please respond according to the following requirements:

1. Provide detailed step-by-step solutions
2. Use English to respond
3. Difficulty level: ${difficulty}
4. Clearly explain the calculation process in each step
5. When using mathematical formulas, please use LaTeX format (use $...$ for inline formulas, $$...$$ for block-level formulas)
6. Finally provide the answer and verification

Please ensure the solution is accurate, clear and easy to understand.`,
      tutor: `You are a patient math tutor who focuses on guiding students to think. Please respond according to the following requirements:

1. Don't give the answer directly, but guide students to think
2. Provide hints and thinking directions
3. Use English to respond
4. Difficulty level: ${difficulty}
5. Encourage students to try solving problems themselves
6. Provide relevant mathematical concepts and formulas when necessary

Please teach in an inspiring way.`,
      practice: `You are a math practice problem generation expert. Please respond according to the following requirements:

1. Generate related practice problems based on students' questions
2. Provide problems of different difficulty levels
3. Use English to respond
4. Difficulty level: ${difficulty}
5. Each problem should have detailed solutions
6. Use LaTeX format for mathematical formulas

Please generate practical practice problems.`,
      check: `You are a math homework checking assistant. Please respond according to the following requirements:

1. Check if the student's provided solution is correct
2. Point out errors and provide correct solutions
3. Use English to respond
4. Difficulty level: ${difficulty}
5. Give scores and improvement suggestions
6. Use LaTeX format for mathematical formulas

Please provide detailed checking results.`,
      board: `You are a math whiteboard assistant who helps students organize their thoughts. Please respond according to the following requirements:

1. Help students organize problem-solving思路
2. Provide problem-solving frameworks and steps
3. Use English to respond
4. Difficulty level: ${difficulty}
5. Use LaTeX format for mathematical formulas
6. Provide clear logical structure

Please help students build problem-solving thinking.`
    }
  }

  const systemPrompt = systemPrompts[language][mode]
  
  return [
    {
      role: 'assistant',
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

    // 構建 POE API 請求
    const poeRequest: POERequest = {
      messages: buildMathPrompt(body),
      bot: body.bot || 'Claude-Sonnet-4.5',
      temperature: 0.7,
      max_tokens: 2000,
    }

    console.log('Sending request to POE API:', { 
      messageCount: poeRequest.messages.length,
      bot: poeRequest.bot,
      mode: body.mode 
    })

    // 調用 POE API
    const response = await poeClient.sendMessage(poeRequest)

    if (response.error) {
      console.error('POE API Error:', response.error)
      return NextResponse.json(
        { 
          error: `POE API Error: ${response.error}`,
          text: '抱歉，AI 服務暫時不可用。請稍後再試。'
        },
        { status: 502 }
      )
    }

    // 解析響應，提取步驟和知識點
    const chatResponse: ChatResponse = {
      text: response.text,
      steps: parseSteps(response.text),
      knowledgePoints: extractKnowledgePoints(response.text),
    }

    console.log('Successfully processed chat request with POE API')
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
