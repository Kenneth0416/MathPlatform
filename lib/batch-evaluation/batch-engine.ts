/**
 * 批量評估引擎
 * 協調評估隊列、結果聚合器和 LangSmith 集成的主要評估引擎
 */

import { randomUUID } from 'crypto';
import { EvaluationQueue, QueueConfig } from './evaluation-queue';
import { ResultsAggregator, AggregationConfig } from './results-aggregator';
import { StatisticalAnalyzer } from './statistical-analyzer';
import {
  BatchEvaluationConfig,
  BatchEvaluationResult,
  BatchEvaluationProgress,
  EvaluationTask,
  EvaluationExampleResult,
  TrajectoryStep,
  EvaluationError,
  BatchEvaluationEvent
} from './types';
import { LangSmithEnhancedClient } from '../langsmith-enhanced';

// 擴展 EvaluationQueue 以實現具體的任務執行
class MathEvaluationQueue extends EvaluationQueue {
  private langsmithClient: LangSmithEnhancedClient;

  constructor(config: QueueConfig, langsmithClient: LangSmithEnhancedClient) {
    super(config);
    this.langsmithClient = langsmithClient;
  }

  protected async runTask(task: EvaluationTask): Promise<void> {
    // 這裡實現具體的評估邏輯
    // 調用 LangSmith 客戶端進行評估
    const result = await this.langsmithClient.evaluateExample(
      task.inputs,
      task.expectedOutputs,
      task.evaluators
    );

    // 將結果發送給聚合器
    this.emit('task_result', {
      taskId: task.id,
      evaluationId: task.evaluationId,
      exampleIndex: task.exampleIndex,
      result
    });
  }
}

export interface BatchEngineConfig {
  /** 隊列配置 */
  queueConfig?: Partial<QueueConfig>;
  /** 聚合器配置 */
  aggregationConfig?: Partial<AggregationConfig>;
  /** LangSmith 客戶端 */
  langsmithClient: LangSmithEnhancedClient;
  /** 是否啟用調試模式 */
  debug?: boolean;
}

export class BatchEvaluationEngine {
  private evaluationQueue: MathEvaluationQueue;
  private resultsAggregator: ResultsAggregator;
  private langsmithClient: LangSmithEnhancedClient;
  private debug: boolean;
  private activeEvaluations: Map<string, BatchEvaluationConfig> = new Map();

  constructor(config: BatchEngineConfig) {
    this.langsmithClient = config.langsmithClient;
    this.debug = config.debug || false;

    // 初始化評估隊列
    this.evaluationQueue = new MathEvaluationQueue(
      {
        maxConcurrency: 3,
        taskTimeout: 30000,
        retryDelay: 1000,
        maxRetries: 3,
        ...config.queueConfig
      },
      this.langsmithClient
    );

    // 初始化結果聚合器
    this.resultsAggregator = new ResultsAggregator({
      enableRealTime: true,
      batchSize: 10,
      saveDetailedResults: true,
      enableStatisticalAnalysis: true,
      confidenceLevel: 0.95,
      ...config.aggregationConfig
    });

    this.setupEventHandlers();
  }

  /**
   * 設置事件處理器
   */
  private setupEventHandlers(): void {
    // 監聽隊列事件
    this.evaluationQueue.on('task_result', (data) => {
      this.resultsAggregator.addResult(data.evaluationId, {
        exampleIndex: data.exampleIndex,
        inputs: data.result.inputs,
        expectedOutputs: data.result.expectedOutputs,
        actualOutputs: data.result.actualOutputs,
        scores: data.result.scores,
        trajectory: data.result.trajectory,
        executionTime: data.result.executionTime
      });
    });

    this.evaluationQueue.on('task_failed', (data) => {
      this.resultsAggregator.addError(data.evaluationId, {
        exampleIndex: data.exampleIndex || 0,
        errorType: 'execution_failed',
        errorMessage: data.error,
        timestamp: new Date(),
        retryCount: data.finalRetry ? 3 : 0
      });
    });

    // 轉發事件
    this.evaluationQueue.on('event', (event: BatchEvaluationEvent) => {
      this.emit('event', event);
    });

    this.resultsAggregator.on('event', (event: BatchEvaluationEvent) => {
      this.emit('event', event);
    });
  }

  /**
   * 執行批量評估
   */
  async runBatchEvaluation(config: BatchEvaluationConfig): Promise<string> {
    const evaluationId = randomUUID();
    const experimentName = `${config.experimentPrefix}-${Date.now()}`;

    // 保存評估配置
    this.activeEvaluations.set(evaluationId, config);

    try {
      // 獲取數據集
      const dataset = await this.langsmithClient.getDataset(config.datasetName);
      if (!dataset) {
        throw new Error(`Dataset ${config.datasetName} not found`);
      }

      // 開始結果聚合
      this.resultsAggregator.startAggregation(
        evaluationId,
        dataset.examples.length,
        config.metadata
      );

      // 創建評估任務
      const tasks = this.createEvaluationTasks(
        evaluationId,
        dataset.examples,
        config
      );

      // 添加任務到隊列
      this.evaluationQueue.addTasks(tasks);

      // 在 LangSmith 中創建實驗
      await this.langsmithClient.createExperiment(
        experimentName,
        config.datasetName,
        config.metadata
      );

      this.logDebug(`Started batch evaluation ${evaluationId} with ${tasks.length} tasks`);

      return evaluationId;

    } catch (error) {
      this.activeEvaluations.delete(evaluationId);
      throw error;
    }
  }

  /**
   * 創建評估任務
   */
  private createEvaluationTasks(
    evaluationId: string,
    examples: any[],
    config: BatchEvaluationConfig
  ): EvaluationTask[] {
    return examples.map((example, index) => ({
      id: `${evaluationId}-${index}`,
      evaluationId,
      exampleIndex: index,
      inputs: example.inputs,
      expectedOutputs: example.outputs,
      evaluators: config.evaluators,
      priority: 1,
      createdAt: new Date(),
      retryCount: 0,
      status: 'pending'
    }));
  }

  /**
   * 獲取評估進度
   */
  getProgress(evaluationId: string): BatchEvaluationProgress | null {
    return this.resultsAggregator.getProgress(evaluationId);
  }

  /**
   * 獲取評估結果
   */
  async getResults(evaluationId: string): Promise<BatchEvaluationResult | null> {
    const progress = this.getProgress(evaluationId);
    if (!progress) return null;

    if (progress.status !== 'completed' && progress.status !== 'failed') {
      throw new Error('Evaluation not yet completed');
    }

    const config = this.activeEvaluations.get(evaluationId);
    if (!config) {
      throw new Error('Evaluation configuration not found');
    }

    const experimentName = `${config.experimentPrefix}-${evaluationId}`;

    // 完成聚合並獲取結果
    const result = this.resultsAggregator.completeAggregation(
      evaluationId,
      experimentName
    );

    // 清理
    this.activeEvaluations.delete(evaluationId);

    return result;
  }

  /**
   * 取消評估
   */
  cancelEvaluation(evaluationId: string): void {
    this.evaluationQueue.cancelEvaluation(evaluationId);
    this.activeEvaluations.delete(evaluationId);
  }

  /**
   * 獲取隊列狀態
   */
  getQueueStatus() {
    return this.evaluationQueue.getQueueStatus();
  }

  /**
   * 獲取性能統計
   */
  getPerformanceStats() {
    return this.evaluationQueue.getPerformanceStats();
  }

  /**
   * 比較兩個實驗
   */
  async compareExperiments(
    experimentA: string,
    experimentB: string
  ): Promise<{
    comparison: any;
    significance: number;
    winner: string;
  }> {
    // 獲取兩個實驗的結果
    const resultA = await this.langsmithClient.getExperimentResults(experimentA);
    const resultB = await this.langsmithClient.getExperimentResults(experimentB);

    if (!resultA || !resultB) {
      throw new Error('One or both experiments not found');
    }

    // 執行統計比較
    const comparisons = [];
    const allEvaluators = new Set([
      ...Object.keys(resultA.meanScores || {}),
      ...Object.keys(resultB.meanScores || {})
    ]);

    for (const evaluator of allEvaluators) {
      const scoresA = resultA.detailedResults
        ?.map((r: any) => r.scores[evaluator])
        .filter((score: number) => score !== undefined) || [];

      const scoresB = resultB.detailedResults
        ?.map((r: any) => r.scores[evaluator])
        .filter((score: number) => score !== undefined) || [];

      if (scoresA.length > 0 && scoresB.length > 0) {
        const comparison = StatisticalAnalyzer.compareEvaluationResults(
          evaluator,
          scoresA,
          scoresB,
          experimentA,
          experimentB
        );
        comparisons.push(comparison);
      }
    }

    // 計算整體勝率和統計顯著性
    const winRate = StatisticalAnalyzer.calculateOverallWinRate(comparisons);
    const avgPValue = StatisticalAnalyzer.calculateAveragePValue(comparisons);

    return {
      comparison: comparisons,
      significance: avgPValue,
      winner: winRate > 0.5 ? experimentA : experimentB
    };
  }

  /**
   * 獲取可用的數據集列表
   */
  async getAvailableDatasets(): Promise<string[]> {
    return this.langsmithClient.listDatasets();
  }

  /**
   * 獲取可用的評估器列表
   */
  getAvailableEvaluators(): string[] {
    return this.langsmithClient.getAvailableEvaluators();
  }

  /**
   * 獲取活躍的評估列表
   */
  getActiveEvaluations(): string[] {
    return this.resultsAggregator.getActiveEvaluations();
  }

  /**
   * 獲取評估結果摘要
   */
  getResultSummary(evaluationId: string) {
    return this.resultsAggregator.getResultSummary(evaluationId);
  }

  /**
   * 清理舊數據
   */
  cleanup(olderThan?: Date): void {
    this.evaluationQueue.cleanup(olderThan);
    this.resultsAggregator.cleanup(olderThan);
  }

  /**
   * 獲取引擎狀態
   */
  getEngineStatus(): {
    queueStatus: any;
    performanceStats: any;
    activeEvaluations: number;
    availableDatasets: Promise<string[]>;
    availableEvaluators: string[];
  } {
    return {
      queueStatus: this.getQueueStatus(),
      performanceStats: this.getPerformanceStats(),
      activeEvaluations: this.getActiveEvaluations().length,
      availableDatasets: this.getAvailableDatasets(),
      availableEvaluators: this.getAvailableEvaluators()
    };
  }

  /**
   * 銷毀引擎
   */
  destroy(): void {
    this.evaluationQueue.stopProcessing();
    this.resultsAggregator.destroy();
    this.activeEvaluations.clear();
    this.removeAllListeners();
  }

  /**
   * 調試日誌
   */
  private logDebug(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[BatchEvaluationEngine] ${message}`, data);
    }
  }

  /**
   * 事件發射器功能
   */
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}