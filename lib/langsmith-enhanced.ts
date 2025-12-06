// Enhanced LangSmith Configuration with Evaluation Capabilities
// 基于Python示例的高级评估功能

import { Client, Run } from "langsmith"
import { BatchEvaluationResult, EvaluationExampleResult } from "./batch-evaluation/types"
import { randomUUID } from "crypto"

// Enhanced client with evaluation capabilities
export class LangSmithEnhancedClient {
  private client: Client | null = null
  private projectName: string

  constructor(projectName?: string) {
    this.projectName = projectName || process.env.LANGCHAIN_PROJECT || 'dse-math-tutoring'

    if (this.isLangSmithEnabled()) {
      this.client = new Client({
        apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
        apiKey: process.env.LANGCHAIN_API_KEY,
      })
      console.log(`Enhanced LangSmith client initialized for project: ${this.projectName}`)
    } else {
      console.log('LangSmith tracking is disabled')
    }
  }

  private isLangSmithEnabled(): boolean {
    return !!(
      process.env.LANGCHAIN_API_KEY &&
      process.env.LANGCHAIN_TRACING_V2 === 'true'
    )
  }

  // 手動記錄事件到 LangSmith（兼容新版本）
  async logEvent(eventName: string, inputs: any, outputs?: any, metadata?: Record<string, any>): Promise<void> {
    if (!this.isLangSmithEnabled() || !this.client) return

    try {
      const { v4: uuidv4 } = await import("uuid")
      const runId = uuidv4()

      await this.client.createRun({
        id: runId,
        name: eventName,
        run_type: "chain",
        inputs: inputs,
        outputs: outputs || {},
        tags: [this.projectName],
        extra: {
          metadata: {
            ...metadata,
            log_type: 'manual',
            application: 'dse-math-tutoring'
          }
        },
        start_time: Date.now(),
        end_time: Date.now()
      })

      console.log(`✅ Manual LangSmith event logged: ${eventName} (${runId})`)
    } catch (error) {
      console.warn(`Failed to log manual LangSmith event: ${eventName}`, error)
    }
  }

  // 创建或获取数据集
  async getOrCreateDataset(datasetName: string, description?: string): Promise<any> {
    if (!this.client) {
      throw new Error('LangSmith client not initialized')
    }

    try {
      // 直接创建数据集，如果已存在会返回现有数据集
      const dataset = await this.client.createDataset({
        name: datasetName,
        description: description || `Dataset for ${datasetName}`,
      })
      console.log(`Dataset '${datasetName}' ready (ID: ${dataset.id})`)
      return dataset
    } catch (error) {
      console.error(`Error managing dataset '${datasetName}':`, error)
      throw error
    }
  }

  // 创建示例
  async createExamples(
    datasetId: string,
    inputs: Record<string, any>[],
    outputs: Record<string, any>[]
  ): Promise<void> {
    if (!this.client) {
      throw new Error('LangSmith client not initialized')
    }

    try {
      await this.client.createExamples({
        inputs,
        outputs,
        datasetId
      })
      console.log(`Created ${inputs.length} examples for dataset`)
    } catch (error) {
      console.error('Error creating examples:', error)
      throw error
    }
  }

  // 创建运行追踪
  async createRun(
    runId: string,
    name: string,
    inputs: Record<string, any>,
    outputs?: Record<string, any>,
    tags?: string[],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.client) {
      console.log('LangSmith disabled - skipping run creation')
      return
    }

    try {
      // 确保使用有效的 UUID 格式
      const validRunId = this.generateValidUUID(runId)

      await this.client.createRun({
        id: validRunId,
        name,
        run_type: 'chain',
        inputs,
        outputs: outputs || {},
        tags: tags || [],
        extra: {
          metadata: {
            project: this.projectName,
            application: 'dse-math-tutoring',
            session_id: metadata?.sessionId || 'unknown',
            user_id: metadata?.userId || 'anonymous',
            language: metadata?.language || 'en',
            mode: metadata?.mode || 'unknown',
            difficulty: metadata?.difficulty || 'unknown',
            ...metadata
          }
        },
        start_time: Date.now(),
        end_time: Date.now()
      })
      console.log(`✅ LangSmith run created: ${name} (${validRunId})`)
    } catch (error) {
      console.error('❌ Error creating LangSmith run:', error)
      // 不抛出错误，避免影响主要功能
    }
  }

  // 生成有效的 UUID
  private generateValidUUID(inputId: string): string {
    // 如果输入已经是有效的 UUID 格式，直接返回
    const uuidRegex = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(inputId)) {
      return inputId
    }

    // 否则生成一个新的 UUID
    return randomUUID()
  }

  // 更新运行状态
  async updateRun(
    runId: string,
    updates: {
      outputs?: Record<string, any>
      tags?: string[]
      extra?: Record<string, any>
      end_time?: number
    }
  ): Promise<void> {
    if (!this.client) {
      return
    }

    try {
      await this.client.updateRun(runId, updates)
    } catch (error) {
      console.error('Error updating run:', error)
    }
  }

  // 创建 LLM 运行追踪 (用于实际的AI API调用)
  async createLLMRun(
    parentRunId: string,
    modelName: string,
    inputs: Record<string, any>,
    outputs?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.client) {
      console.log('LangSmith disabled - skipping LLM run creation')
      return ''
    }

    try {
      const runId = randomUUID()

      await this.client.createRun({
        id: runId,
        name: `${modelName} API Call`,
        run_type: 'llm',
        inputs,
        outputs: outputs || {},
        parent_run_id: parentRunId,
        extra: {
          metadata: {
            model_name: modelName,
            provider: metadata?.provider || 'unknown',
            response_time_ms: metadata?.responseTime,
            tokens_used: metadata?.tokensUsed,
            temperature: metadata?.temperature,
            max_tokens: metadata?.maxTokens,
            ...metadata
          }
        },
        start_time: metadata?.startTime || Date.now(),
        end_time: Date.now()
      })

      console.log(`✅ LangSmith LLM run created: ${modelName} (${runId})`)
      return runId
    } catch (error) {
      console.error('❌ Error creating LangSmith LLM run:', error)
      return ''
    }
  }

  // 创建工具调用追踪
  async createToolRun(
    parentRunId: string,
    toolName: string,
    inputs: Record<string, any>,
    outputs?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.client) {
      console.log('LangSmith disabled - skipping tool run creation')
      return ''
    }

    try {
      const runId = randomUUID()

      await this.client.createRun({
        id: runId,
        name: `${toolName} Tool`,
        run_type: 'tool',
        inputs,
        outputs: outputs || {},
        parent_run_id: parentRunId,
        extra: {
          metadata: {
            tool_name: toolName,
            tool_type: metadata?.toolType || 'custom',
            execution_time_ms: metadata?.executionTime,
            ...metadata
          }
        },
        start_time: Date.now(),
        end_time: Date.now()
      })

      console.log(`✅ LangSmith tool run created: ${toolName} (${runId})`)
      return runId
    } catch (error) {
      console.error('❌ Error creating LangSmith tool run:', error)
      return ''
    }
  }

  // 更新现有运行
  async updateRunWithResults(
    runId: string,
    outputs: Record<string, any>,
    evaluations?: any[]
  ): Promise<void> {
    if (!this.client) {
      return
    }

    try {
      const updateData: any = {
        outputs,
        end_time: Date.now()
      }

      if (evaluations && evaluations.length > 0) {
        updateData.extra = {
          metadata: {
            evaluations: evaluations,
            evaluation_count: evaluations.length
          }
        }
      }

      await this.client.updateRun(runId, updateData)
      console.log(`✅ LangSmith run updated with results: ${runId}`)
    } catch (error) {
      console.error('❌ Error updating LangSmith run:', error)
    }
  }

  // 获取客户端实例
  getClient(): Client | null {
    return this.client
  }

  // ==================== 批量评估功能 ====================

  /**
   * 获取数据集信息
   */
  async getDataset(datasetName: string): Promise<any> {
    if (!this.client) {
      throw new Error('LangSmith client not initialized')
    }

    try {
      // 列出所有数据集
      const datasets = await this.client.listDatasets()
      const dataset = datasets.find(ds => ds.name === datasetName)

      if (!dataset) {
        return null
      }

      // 获取数据集示例
      const examples = await this.client.listExamples({ datasetId: dataset.id })

      return {
        ...dataset,
        examples: examples.map(example => ({
          inputs: example.inputs,
          outputs: example.outputs,
          id: example.id,
          metadata: example.metadata
        }))
      }
    } catch (error) {
      console.error('Error getting dataset:', error)
      return null
    }
  }

  /**
   * 列出所有数据集
   */
  async listDatasets(): Promise<string[]> {
    if (!this.client) {
      return []
    }

    try {
      const datasets = await this.client.listDatasets()
      return datasets.map(ds => ds.name)
    } catch (error) {
      console.error('Error listing datasets:', error)
      return []
    }
  }

  /**
   * 创建实验
   */
  async createExperiment(
    experimentName: string,
    datasetName: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    if (!this.client) {
      console.log('LangSmith disabled - skipping experiment creation')
      return null
    }

    try {
      // LangSmith 实验通常通过运行追踪来创建
      // 这里我们创建一个特殊的运行来代表实验
      const runId = randomUUID()

      await this.client.createRun({
        id: runId,
        name: `Experiment: ${experimentName}`,
        run_type: 'chain',
        inputs: { dataset: datasetName, experiment_name: experimentName },
        outputs: { status: 'started' },
        tags: ['experiment', 'batch-evaluation'],
        extra: {
          metadata: {
            experiment_name: experimentName,
            dataset_name: datasetName,
            experiment_type: 'batch_evaluation',
            project: this.projectName,
            ...metadata
          }
        },
        start_time: Date.now(),
        end_time: Date.now()
      })

      console.log(`✅ Created experiment: ${experimentName}`)
      return { experimentName, runId }
    } catch (error) {
      console.error('❌ Error creating experiment:', error)
      return null
    }
  }

  /**
   * 评估单个样本
   */
  async evaluateExample(
    inputs: Record<string, any>,
    expectedOutputs: Record<string, any>,
    evaluators: string[]
  ): Promise<EvaluationExampleResult> {
    const startTime = Date.now()

    try {
      // 这里应该调用实际的AI模型来获取响应
      // 为了演示，我们使用模拟数据
      const actualOutputs = await this.generateModelResponse(inputs)

      // 运行评估器
      const scores: Record<string, number> = {}

      for (const evaluatorName of evaluators) {
        const score = await this.runEvaluator(evaluatorName, actualOutputs, expectedOutputs)
        scores[evaluatorName] = score
      }

      return {
        exampleIndex: 0, // 将在调用处设置
        inputs,
        expectedOutputs,
        actualOutputs,
        scores,
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      throw new Error(`Evaluation failed: ${error}`)
    }
  }

  /**
   * 生成模型响应 (模拟)
   */
  private async generateModelResponse(inputs: Record<string, any>): Promise<Record<string, any>> {
    // 这里应该调用实际的AI API
    // 为了演示，返回模拟响应
    const question = inputs.question || inputs.prompt || ''

    // 简单的模拟响应逻辑
    if (question.includes('计算') || question.includes('calculate') || question.includes('多少')) {
      return {
        answer: '这是一个数学计算问题的答案示例。',
        reasoning: '我使用了数学工具来解决这个问题。',
        trajectory: [
          {
            type: 'user_message',
            content: question,
            timestamp: new Date()
          },
          {
            type: 'ai_message',
            content: '让我帮您解决这个问题。',
            timestamp: new Date()
          },
          {
            type: 'tool_call',
            tool: 'calculator',
            args: { expression: question },
            result: '42',
            timestamp: new Date()
          },
          {
            type: 'ai_message',
            content: '计算结果是42。',
            timestamp: new Date()
          }
        ]
      }
    }

    return {
      answer: '这是一个示例答案。',
      reasoning: '基于提供的信息，我得出了这个结论。'
    }
  }

  /**
   * 运行特定的评估器
   */
  private async runEvaluator(
    evaluatorName: string,
    outputs: Record<string, any>,
    expectedOutputs: Record<string, any>
  ): Promise<number> {
    switch (evaluatorName) {
      case 'correctness':
        const result = MathLearningEvaluators.correctnessEvaluator(outputs, expectedOutputs)
        return result.score

      case 'tool_usage':
        const toolResult = MathLearningEvaluators.toolUsageEvaluator(outputs, expectedOutputs)
        return toolResult.score

      case 'language_quality':
        const langResult = MathLearningEvaluators.languageQualityEvaluator(outputs)
        return langResult.score

      case 'learning_mode_adaptation':
        const modeResult = MathLearningEvaluators.learningModeEvaluator(outputs, expectedOutputs)
        return modeResult.score

      default:
        console.warn(`Unknown evaluator: ${evaluatorName}`)
        return 0.5 // 默认分数
    }
  }

  /**
   * 获取可用的评估器列表
   */
  getAvailableEvaluators(): string[] {
    return [
      'correctness',
      'tool_usage',
      'language_quality',
      'learning_mode_adaptation'
    ]
  }

  /**
   * 获取实验结果 (模拟)
   */
  async getExperimentResults(experimentName: string): Promise<BatchEvaluationResult | null> {
    if (!this.client) {
      return null
    }

    try {
      // 这里应该从LangSmith获取实际的实验结果
      // 为了演示，返回模拟数据
      return {
        evaluationId: experimentName,
        experimentName,
        datasetName: 'mock-dataset',
        totalExamples: 10,
        successCount: 8,
        failureCount: 2,
        executionTime: 30000,
        meanScores: {
          correctness: 0.8,
          tool_usage: 0.9,
          language_quality: 0.7
        },
        confidenceIntervals: {
          correctness: [0.6, 1.0],
          tool_usage: [0.7, 1.0],
          language_quality: [0.5, 0.9]
        },
        detailedResults: [],
        errors: [],
        metadata: {}
      }
    } catch (error) {
      console.error('Error getting experiment results:', error)
      return null
    }
  }

  /**
   * 运行批量评估 (高级功能)
   */
  async runBatchEvaluation(
    datasetName: string,
    evaluators: string[],
    experimentPrefix: string,
    metadata?: Record<string, any>
  ): Promise<BatchEvaluationResult> {
    if (!this.client) {
      throw new Error('LangSmith client not initialized')
    }

    const startTime = Date.now()
    const experimentName = `${experimentPrefix}-${Date.now()}`

    try {
      // 获取数据集
      const dataset = await this.getDataset(datasetName)
      if (!dataset) {
        throw new Error(`Dataset ${datasetName} not found`)
      }

      // 创建实验
      await this.createExperiment(experimentName, datasetName, metadata)

      // 评估所有示例
      const results: EvaluationExampleResult[] = []
      const errors: any[] = []

      for (let i = 0; i < dataset.examples.length; i++) {
        const example = dataset.examples[i]

        try {
          const result = await this.evaluateExample(
            example.inputs,
            example.outputs,
            evaluators
          )
          result.exampleIndex = i
          results.push(result)
        } catch (error) {
          errors.push({
            exampleIndex: i,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          })
        }
      }

      // 计算聚合结果
      const meanScores = this.calculateMeanScores(results)
      const confidenceIntervals = this.calculateConfidenceIntervals(results)

      const batchResult: BatchEvaluationResult = {
        evaluationId: experimentName,
        experimentName,
        datasetName,
        totalExamples: dataset.examples.length,
        successCount: results.length,
        failureCount: errors.length,
        executionTime: Date.now() - startTime,
        meanScores,
        confidenceIntervals,
        detailedResults: results,
        errors,
        metadata: metadata || {}
      }

      console.log(`✅ Batch evaluation completed: ${experimentName}`)
      return batchResult

    } catch (error) {
      console.error('❌ Batch evaluation failed:', error)
      throw error
    }
  }

  /**
   * 计算平均分数
   */
  private calculateMeanScores(results: EvaluationExampleResult[]): Record<string, number> {
    if (results.length === 0) return {}

    const scoresByEvaluator: Record<string, number[]> = {}

    for (const result of results) {
      for (const [evaluator, score] of Object.entries(result.scores)) {
        if (!scoresByEvaluator[evaluator]) {
          scoresByEvaluator[evaluator] = []
        }
        scoresByEvaluator[evaluator].push(score)
      }
    }

    const meanScores: Record<string, number> = {}
    for (const [evaluator, scores] of Object.entries(scoresByEvaluator)) {
      meanScores[evaluator] = scores.reduce((sum, score) => sum + score, 0) / scores.length
    }

    return meanScores
  }

  /**
   * 计算置信区间
   */
  private calculateConfidenceIntervals(results: EvaluationExampleResult[]): Record<string, [number, number]> {
    // 简化的置信区间计算
    const meanScores = this.calculateMeanScores(results)
    const confidenceIntervals: Record<string, [number, number]> = {}

    for (const [evaluator, mean] of Object.entries(meanScores)) {
      // 使用简单的误差估计
      const marginOfError = Math.sqrt((mean * (1 - mean)) / results.length) * 1.96 // 95% CI
      confidenceIntervals[evaluator] = [
        Math.max(0, mean - marginOfError),
        Math.min(1, mean + marginOfError)
      ]
    }

    return confidenceIntervals
  }

  // 创建评估结果
  createEvaluationResult(
    key: string,
    score: number,
    comment?: string,
    reasoning?: string
  ): Record<string, any> {
    return {
      key,
      score,
      comment: comment || `Score: ${score}`,
      reasoning: reasoning || '',
      timestamp: new Date().toISOString()
    }
  }

  // 创建轨迹追踪
  createTrajectoryEntry(
    step: string,
    type: 'user_message' | 'ai_message' | 'tool_call' | 'tool_result' | 'error',
    content: string,
    metadata?: Record<string, any>
  ): Record<string, any> {
    return {
      step,
      type,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }
}

// 数学学习平台特定的评估器
export class MathLearningEvaluators {
  // 正确性评估器 - 检查答案是否正确
  static correctnessEvaluator(outputs: Record<string, any>, referenceOutputs: Record<string, any>): Record<string, any> {
    const answer = outputs.answer || ''
    const expectedAnswer = referenceOutputs.answer || ''

    // 对于数学答案，我们需要更智能的比较
    const score = this.compareMathAnswers(answer, expectedAnswer)

    return {
      key: 'correctness',
      score,
      comment: score === 1 ? 'Answer is correct' : 'Answer does not match expected result',
      reasoning: `Comparing "${answer}" with expected "${expectedAnswer}"`
    }
  }

  // 工具使用评估器 - 检查是否正确使用了工具
  static toolUsageEvaluator(outputs: Record<string, any>, referenceOutputs: Record<string, any>): Record<string, any> {
    const shouldUseTool = referenceOutputs.shouldUseTool || false
    const expectedTool = referenceOutputs.expectedTool
    const trajectory = outputs.trajectory || []

    const toolCalls = trajectory.filter((step: any) => step.type === 'tool_call')
    const toolsUsed = toolCalls.map((call: any) => call.tool).filter(Boolean)

    let score = 0
    let comment = ''

    if (shouldUseTool && expectedTool) {
      if (toolsUsed.includes(expectedTool)) {
        score = 1
        comment = `Correctly used ${expectedTool} tool`
      } else {
        score = 0
        comment = `Should use ${expectedTool} but used: ${toolsUsed.join(', ')}`
      }
    } else if (!shouldUseTool) {
      if (toolsUsed.length === 0) {
        score = 1
        comment = 'Correctly did not use tools'
      } else {
        score = 0
        comment = `Should not use tools but used: ${toolsUsed.join(', ')}`
      }
    }

    return {
      key: 'tool_usage',
      score,
      comment,
      reasoning: `Expected tool usage: ${shouldUseTool ? expectedTool : 'none'}, Actual: ${toolsUsed.length > 0 ? toolsUsed.join(', ') : 'none'}`
    }
  }

  // 语言质量评估器 - 检查回答的语言质量和清晰度
  static languageQualityEvaluator(outputs: Record<string, any>): Record<string, any> {
    const answer = outputs.answer || ''

    // 检查是否包含数学公式（LaTeX）
    const hasMathFormulas = /\$.*?\$|\\\[.*?\\\]/.test(answer)

    // 检查是否包含步骤说明
    const hasSteps = /步骤|step|Step|第[一二三四五六七八九十]/.test(answer) ||
                   /第一|Second|Third|First|Finally/.test(answer)

    // 检查长度是否合适
    const length = answer.length
    const goodLength = length >= 50 && length <= 1000

    let score = 0
    let reasons = []

    if (hasMathFormulas) {
      score += 0.3
      reasons.push('Contains mathematical formulas')
    }

    if (hasSteps) {
      score += 0.4
      reasons.push('Provides step-by-step explanation')
    }

    if (goodLength) {
      score += 0.3
      reasons.push('Appropriate length')
    }

    // 限制最大分数
    score = Math.min(score, 1)

    return {
      key: 'language_quality',
      score,
      comment: score >= 0.7 ? 'High quality response' : 'Needs improvement',
      reasoning: reasons.join(', ')
    }
  }

  // 学习模式适配性评估器
  static learningModeEvaluator(outputs: Record<string, any>, referenceOutputs: Record<string, any>): Record<string, any> {
    const mode = referenceOutputs.mode || 'solve'
    const answer = outputs.answer || ''

    let score = 0.5 // 默认分数
    let comment = ''

    switch (mode) {
      case 'solve':
        // 解题模式应该包含详细的步骤和最终答案
        const hasSteps = /步骤|step|Step/.test(answer)
        const hasAnswer = /答案|Answer|结果|result/.test(answer)
        const hasFormula = /\$.*?\$/.test(answer)

        score = (hasSteps ? 0.4 : 0) + (hasAnswer ? 0.3 : 0) + (hasFormula ? 0.3 : 0)
        comment = score >= 0.7 ? 'Good problem-solving approach' : 'Needs more detail'
        break

      case 'tutor':
        // 辅导模式应该引导而不是直接给答案
        const isGuiding = /试试看|你觉得|如何|提示|Can you|How to/.test(answer)
        const notDirectAnswer = !/答案是|The answer is|答案是|答案是/.test(answer)

        score = (isGuiding ? 0.5 : 0) + (notDirectAnswer ? 0.5 : 0)
        comment = score >= 0.7 ? 'Good tutoring approach' : 'Too direct, should guide more'
        break

      case 'practice':
        // 练习生成模式应该只生成练习题
        const isQuestion = /\\?|？|Calculate|Find|Solve|What|计算|求|解/.test(answer)
        const notAnswer = !(/答案是|The answer is|答案是/.test(answer))

        score = (isQuestion && notAnswer) ? 1 : 0.5
        comment = score === 1 ? 'Good practice questions' : 'Contains answers instead of questions'
        break

      case 'check':
        // 检查模式应该评估并提供反馈
        const isChecking = /正确|正确|Wrong|错误|对|错|应改为|应该改为/.test(answer)
        const hasFeedback = /建议|recommend|Try|尝试|可以/.test(answer)

        score = (isChecking ? 0.6 : 0) + (hasFeedback ? 0.4 : 0)
        comment = score >= 0.8 ? 'Good checking approach' : 'Needs more evaluation'
        break
    }

    return {
      key: 'learning_mode_adaptation',
      score,
      comment,
      reasoning: `Evaluated for ${mode} mode`
    }
  }

  // 智能数学答案比较
  private static compareMathAnswers(userAnswer: string, expectedAnswer: string): number {
    // 移除空白字符并转换为小写
    const userClean = userAnswer.replace(/\s+/g, ' ').toLowerCase().trim()
    const expectedClean = expectedAnswer.replace(/\s+/g, ' ').toLowerCase().trim()

    // 精确匹配
    if (userClean === expectedClean) {
      return 1.0
    }

    // 提取数字进行比较
    const userNumbers = userClean.match(/\d+\.?\d*/g)
    const expectedNumbers = expectedClean.match(/\d+\.?\d*/g)

    if (userNumbers && expectedNumbers) {
      // 比较数值结果
      const userResult = parseFloat(userNumbers[userNumbers.length - 1])
      const expectedResult = parseFloat(expectedNumbers[expectedNumbers.length - 1])

      if (!isNaN(userResult) && !isNaN(expectedResult)) {
        const difference = Math.abs(userResult - expectedResult)
        const relativeError = expectedResult !== 0 ? Math.abs(difference / expectedResult) : 0

        // 如果误差小于1%，认为是正确的
        if (relativeError < 0.01) {
          return 1.0
        } else if (relativeError < 0.1) {
          return 0.8 // 90%以上正确
        } else if (relativeError < 0.2) {
          return 0.6 // 80%以上正确
        }
      }
    }

    // 检查是否包含关键概念
    const userKeyTerms = this.extractMathTerms(userClean)
    const expectedKeyTerms = this.extractMathTerms(expectedClean)

    const commonTerms = userKeyTerms.filter(term => expectedKeyTerms.includes(term))
    const similarity = commonTerms.length / Math.max(userKeyTerms.length, expectedKeyTerms.length, 1)

    return similarity >= 0.6 ? 0.7 : 0.3
  }

  // 提取数学相关术语
  private static extractMathTerms(text: string): string[] {
    const mathTerms = [
      '方程', 'equation', '导数', 'derivative', '积分', 'integral',
      '函数', 'function', '几何', 'geometry', '代数', 'algebra',
      '三角', 'trigonometry', '概率', 'probability', '统计', 'statistics',
      '微积分', 'calculus', '线性代数', 'linear algebra', '向量', 'vector'
    ]

    return mathTerms.filter(term => text.includes(term))
  }
}

// 导出便捷函数
export function createEnhancedLangSmithClient(projectName?: string): LangSmithEnhancedClient {
  return new LangSmithEnhancedClient(projectName)
}

export function createMathDataset(name: string, examples: any[]): Promise<void> {
  const client = createEnhancedLangSmithClient()
  return client.getOrCreateDataset(name, 'Math learning evaluation dataset')
    .then(dataset => {
      const inputs = examples.map(ex => ex.inputs)
      const outputs = examples.map(ex => ex.outputs)
      return client.createExamples(dataset.id, inputs, outputs)
    })
}

// 全局增强客户端实例 - 確保使用正確的項目名稱
export const enhancedLangSmithClient = createEnhancedLangSmithClient(
  process.env.LANGCHAIN_PROJECT || process.env.LANGSMITH_PROJECT || 'dse-math-tutoring'
)