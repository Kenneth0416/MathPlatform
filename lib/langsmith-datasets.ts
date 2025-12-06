// LangSmith 数据集初始化脚本
// 为数学学习平台创建评估数据集

import { enhancedLangSmithClient, MathLearningEvaluators } from './langsmith-enhanced'

// DSE 数学题库示例
const MATH_DATASET_EXAMPLES = {
  // 代数题目示例
  algebra: [
    {
      inputs: {
        question: "解方程：2x + 5 = 13",
        mode: "solve",
        difficulty: "Middle",
        language: "zh-TW"
      },
      outputs: {
        answer: "x = 4",
        steps: [
          "首先，将常数项移到等式右边：2x = 13 - 5",
          "简化右边：2x = 8",
          "两边同时除以2：x = 8/2",
          "得到最终答案：x = 4"
        ],
        explanation: "这是一个简单的一次方程求解题"
      }
    },
    {
      inputs: {
        question: "If f(x) = 3x² - 2x + 1, find f(2)",
        mode: "solve",
        difficulty: "High",
        language: "en"
      },
      outputs: {
        answer: "f(2) = 9",
        steps: [
          "Substitute x = 2 into the function: f(2) = 3(2)² - 2(2) + 1",
          "Calculate the square: f(2) = 3(4) - 4 + 1",
          "Multiply: f(2) = 12 - 4 + 1",
          "Add and subtract: f(2) = 8 + 1 = 9"
        ],
        explanation: "Function evaluation problem using substitution"
      }
    }
  ],

  // 几何题目示例
  geometry: [
    {
      inputs: {
        question: "一个直角三角形的两条直角边分别是3cm和4cm，求斜边长度",
        mode: "solve",
        difficulty: "Middle",
        language: "zh-TW"
      },
      outputs: {
        answer: "斜边长度为5cm",
        steps: [
          "使用勾股定理：a² + b² = c²",
          "代入已知数值：3² + 4² = c²",
          "计算平方：9 + 16 = c²",
          "求和：25 = c²",
          "开平方根：c = √25 = 5"
        ],
        explanation: "勾股定理在直角三角形中的应用"
      }
    }
  ],

  // 微积分题目示例
  calculus: [
    {
      inputs: {
        question: "求函数 f(x) = x³ - 2x² + x 的导数",
        mode: "solve",
        difficulty: "College",
        language: "zh-TW"
      },
      outputs: {
        answer: "f'(x) = 3x² - 4x + 1",
        steps: [
          "使用幂函数求导法则：d/dx(x^n) = nx^(n-1)",
          "求x³的导数：3x²",
          "求-2x²的导数：-4x",
          "求x的导数：1",
          "组合结果：f'(x) = 3x² - 4x + 1"
        ],
        explanation: "多项式函数的逐项求导"
      }
    }
  ],

  // 辅导模式示例
  tutoring: [
    {
      inputs: {
        question: "我不明白如何解一元二次方程，请指导我",
        mode: "tutor",
        difficulty: "Middle",
        language: "zh-TW"
      },
      outputs: {
        shouldUseTool: false,
        isGuiding: true,
        hasDirectAnswer: false,
        guidanceApproach: true
      }
    }
  ],

  // 练习生成模式示例
  practice: [
    {
      inputs: {
        topic: "linear equations",
        difficulty: "Middle",
        count: 3,
        mode: "practice",
        language: "en"
      },
      outputs: {
        isQuestion: true,
        hasAnswer: false,
        practiceGenerated: true
      }
    }
  ]
}

// 评估配置数据集
const EVALUATION_CRITERIA = {
  // 正确性评估参考
  correctness: [
    {
      inputs: {
        question: "计算：5 + 3 × 2",
        mode: "solve"
      },
      outputs: {
        answer: "11"
      },
      expected_outputs: {
        answer: "11"
      }
    }
  ],

  // 学习模式适配性评估
  mode_adaptation: [
    {
      inputs: {
        question: "请帮我检查这道题的答案是否正确",
        mode: "check"
      },
      outputs: {
        answer: "让我来帮你检查这个答案..."
      },
      reference_outputs: {
        mode: "check",
        hasEvaluation: true,
        hasFeedback: true
      }
    }
  ]
}

// 数据集创建函数
export async function initializeMathDatasets(): Promise<void> {
  console.log('开始初始化数学学习评估数据集...')

  try {
    // 创建主要题库数据集
    console.log('创建代数题库数据集...')
    const algebraDataset = await enhancedLangSmithClient.getOrCreateDataset(
      'dse-math-algebra-examples',
      'DSE数学代数题目示例数据集'
    )

    await enhancedLangSmithClient.createExamples(
      algebraDataset.id,
      MATH_DATASET_EXAMPLES.algebra.map(ex => ex.inputs),
      MATH_DATASET_EXAMPLES.algebra.map(ex => ex.outputs)
    )

    console.log('创建几何题库数据集...')
    const geometryDataset = await enhancedLangSmithClient.getOrCreateDataset(
      'dse-math-geometry-examples',
      'DSE数学几何题目示例数据集'
    )

    await enhancedLangSmithClient.createExamples(
      geometryDataset.id,
      MATH_DATASET_EXAMPLES.geometry.map(ex => ex.inputs),
      MATH_DATASET_EXAMPLES.geometry.map(ex => ex.outputs)
    )

    console.log('创建微积分题库数据集...')
    const calculusDataset = await enhancedLangSmithClient.getOrCreateDataset(
      'dse-math-calculus-examples',
      'DSE数学微积分题目示例数据集'
    )

    await enhancedLangSmithClient.createExamples(
      calculusDataset.id,
      MATH_DATASET_EXAMPLES.calculus.map(ex => ex.inputs),
      MATH_DATASET_EXAMPLES.calculus.map(ex => ex.outputs)
    )

    console.log('创建学习模式数据集...')
    const learningModesDataset = await enhancedLangSmithClient.getOrCreateDataset(
      'dse-math-learning-modes',
      'DSE数学学习模式评估数据集'
    )

    const tutoringExamples = MATH_DATASET_EXAMPLES.tutoring
    const practiceExamples = MATH_DATASET_EXAMPLES.practice

    await enhancedLangSmithClient.createExamples(
      learningModesDataset.id,
      [...tutoringExamples, ...practiceExamples].map(ex => ex.inputs),
      [...tutoringExamples, ...practiceExamples].map(ex => ex.outputs)
    )

    console.log('创建评估标准数据集...')
    const evaluationDataset = await enhancedLangSmithClient.getOrCreateDataset(
      'dse-math-evaluation-criteria',
      'DSE数学评估标准参考数据集'
    )

    const correctnessExamples = EVALUATION_CRITERIA.correctness
    const modeAdaptationExamples = EVALUATION_CRITERIA.mode_adaptation

    await enhancedLangSmithClient.createExamples(
      evaluationDataset.id,
      [...correctnessExamples, ...modeAdaptationExamples].map(ex => ex.inputs),
      [...correctnessExamples, ...modeAdaptationExamples].map(ex => ex.outputs)
    )

    console.log('✅ 所有数据集初始化完成！')
    console.log('已创建以下数据集：')
    console.log('- dse-math-algebra-examples: 代数题库')
    console.log('- dse-math-geometry-examples: 几何题库')
    console.log('- dse-math-calculus-examples: 微积分题库')
    console.log('- dse-math-learning-modes: 学习模式评估')
    console.log('- dse-math-evaluation-criteria: 评估标准')

  } catch (error) {
    console.error('❌ 数据集初始化失败:', error)
    throw error
  }
}

// 演示评估功能
export async function demonstrateEvaluation(): Promise<void> {
  console.log('开始演示评估功能...')

  try {
    // 演示正确性评估
    console.log('\n=== 正确性评估演示 ===')
    const correctnessResult = MathLearningEvaluators.correctnessEvaluator(
      { answer: "x = 4" },
      { answer: "4" }
    )
    console.log('正确性评估结果:', correctnessResult)

    // 演示工具使用评估
    console.log('\n=== 工具使用评估演示 ===')
    const toolUsageResult = MathLearningEvaluators.toolUsageEvaluator(
      { trajectory: [
        { type: 'user_message', content: '解方程' },
        { type: 'tool_call', tool: 'calculator', content: '计算' }
      ]},
      { shouldUseTool: true, expectedTool: 'calculator' }
    )
    console.log('工具使用评估结果:', toolUsageResult)

    // 演示语言质量评估
    console.log('\n=== 语言质量评估演示 ===')
    const languageQualityResult = MathLearningEvaluators.languageQualityEvaluator({
      answer: '步骤1：使用公式 $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ 来求解。首先，我们计算判别式...'
    })
    console.log('语言质量评估结果:', languageQualityResult)

    // 演示学习模式适配性评估
    console.log('\n=== 学习模式适配性评估演示 ===')
    const learningModeResult = MathLearningEvaluators.learningModeEvaluator(
      { answer: '让我来引导你思考，你觉得第一步应该怎么做？' },
      { mode: 'tutor' }
    )
    console.log('学习模式适配性评估结果:', learningModeResult)

    console.log('\n✅ 评估功能演示完成！')

  } catch (error) {
    console.error('❌ 评估演示失败:', error)
    throw error
  }
}

// A/B 测试配置
export const AB_TEST_CONFIG = {
  // 系统提示词 A/B 测试
  system_prompts: {
    variant_a: 'standard_dse_compliance',
    variant_b: 'enhanced_interactive'
  },

  // 响应风格 A/B 测试
  response_styles: {
    variant_a: 'detailed_step_by_step',
    variant_b: 'concise_with_hints'
  },

  // 语言适配 A/B 测试
  language_adaptation: {
    variant_a: 'formal_academic',
    variant_b: 'friendly_conversational'
  }
}

// 导出数据集管理函数
export { MATH_DATASET_EXAMPLES, EVALUATION_CRITERIA }

// 如果直接运行此脚本，执行初始化
if (require.main === module) {
  initializeMathDatasets()
    .then(() => demonstrateEvaluation())
    .catch(console.error)
}