/**
 * 結果聚合器
 * 負責收集、處理和聚合批量評估的結果
 */

import { EventEmitter } from 'events';
import {
  EvaluationExampleResult,
  BatchEvaluationResult,
  StatisticalAnalysis,
  BatchEvaluationEvent,
  BatchEvaluationProgress,
  EvaluationError
} from './types';
import { StatisticalAnalyzer } from './statistical-analyzer';

export interface AggregationConfig {
  /** 是否啟用實時聚合 */
  enableRealTime: boolean;
  /** 聚合批次大小 */
  batchSize: number;
  /** 是否保存詳細結果 */
  saveDetailedResults: boolean;
  /** 是否計算統計分析 */
  enableStatisticalAnalysis: boolean;
  /** 置信水平 */
  confidenceLevel: number;
}

export class ResultsAggregator extends EventEmitter {
  private results: Map<string, EvaluationExampleResult[]> = new Map();
  private errors: Map<string, EvaluationError[]> = new Map();
  private progress: Map<string, BatchEvaluationProgress> = new Map();
  private startTime: Map<string, Date> = new Map();
  private config: AggregationConfig;
  private aggregationTimer?: NodeJS.Timeout;

  constructor(config: Partial<AggregationConfig> = {}) {
    super();
    this.config = {
      enableRealTime: true,
      batchSize: 10,
      saveDetailedResults: true,
      enableStatisticalAnalysis: true,
      confidenceLevel: 0.95,
      ...config
    };

    if (this.config.enableRealTime) {
      this.startRealTimeAggregation();
    }
  }

  /**
   * 開始新的評估聚合
   */
  startAggregation(evaluationId: string, totalExamples: number, metadata?: Record<string, any>): void {
    this.results.set(evaluationId, []);
    this.errors.set(evaluationId, []);
    this.startTime.set(evaluationId, new Date());

    const progress: BatchEvaluationProgress = {
      evaluationId,
      status: 'pending',
      totalExamples,
      completedCount: 0,
      progress: 0,
      startTime: new Date(),
      errorCount: 0
    };

    this.progress.set(evaluationId, progress);

    this.emitEvent('aggregation_started', {
      evaluationId,
      totalExamples,
      metadata
    });
  }

  /**
   * 添加評估結果
   */
  addResult(evaluationId: string, result: EvaluationExampleResult): void {
    const results = this.results.get(evaluationId);
    if (!results) {
      console.warn(`No active aggregation for evaluation ${evaluationId}`);
      return;
    }

    results.push(result);

    // 更新進度
    this.updateProgress(evaluationId);

    // 實時聚合
    if (this.config.enableRealTime && results.length % this.config.batchSize === 0) {
      this.performRealTimeAggregation(evaluationId);
    }

    this.emitEvent('result_added', {
      evaluationId,
      exampleIndex: result.exampleIndex,
      scores: result.scores
    });
  }

  /**
   * 添加錯誤
   */
  addError(evaluationId: string, error: EvaluationError): void {
    const errors = this.errors.get(evaluationId);
    if (!errors) {
      console.warn(`No active aggregation for evaluation ${evaluationId}`);
      return;
    }

    errors.push(error);

    // 更新進度
    this.updateProgress(evaluationId);

    this.emitEvent('error_added', {
      evaluationId,
      exampleIndex: error.exampleIndex,
      errorType: error.errorType
    });
  }

  /**
   * 更新評估進度
   */
  private updateProgress(evaluationId: string): void {
    const progress = this.progress.get(evaluationId);
    const results = this.results.get(evaluationId);
    const errors = this.errors.get(evaluationId);

    if (!progress || !results || !errors) return;

    const completedCount = results.length + errors.length;
    const newProgress = (completedCount / progress.totalExamples) * 100;

    progress.completedCount = completedCount;
    progress.progress = newProgress;
    progress.errorCount = errors.length;

    if (newProgress >= 100) {
      progress.status = progress.errorCount > 0 ? 'completed' : 'completed';
      progress.status = errors.length === results.length + errors.length ? 'failed' : progress.status;
    } else {
      progress.status = 'running';
    }

    this.emitEvent('progress_updated', {
      evaluationId,
      progress: newProgress,
      completedCount,
      errorCount: errors.length
    });
  }

  /**
   * 獲取評估進度
   */
  getProgress(evaluationId: string): BatchEvaluationProgress | null {
    return this.progress.get(evaluationId) || null;
  }

  /**
   * 完成評估聚合
   */
  completeAggregation(evaluationId: string, experimentName: string): BatchEvaluationResult {
    const results = this.results.get(evaluationId);
    const errors = this.errors.get(evaluationId);
    const progress = this.progress.get(evaluationId);
    const startTime = this.startTime.get(evaluationId);

    if (!results || !progress || !startTime) {
      throw new Error(`No active aggregation for evaluation ${evaluationId}`);
    }

    // 計算執行時間
    const endTime = new Date();
    const executionTime = endTime.getTime() - startTime.getTime();

    // 更新最終狀態
    progress.status = errors.length === results.length + errors.length ? 'failed' : 'completed';
    progress.completedAt = endTime;

    // 聚合結果
    const aggregatedResult = this.aggregateResults(
      evaluationId,
      experimentName,
      results,
      errors || [],
      executionTime,
      progress
    );

    // 清理內存 (可選)
    if (!this.config.saveDetailedResults) {
      this.results.delete(evaluationId);
      this.errors.delete(evaluationId);
    }

    this.emitEvent('aggregation_completed', {
      evaluationId,
      experimentName,
      result: aggregatedResult
    });

    return aggregatedResult;
  }

  /**
   * 聚合評估結果
   */
  private aggregateResults(
    evaluationId: string,
    experimentName: string,
    results: EvaluationExampleResult[],
    errors: EvaluationError[],
    executionTime: number,
    progress: BatchEvaluationProgress
  ): BatchEvaluationResult {
    // 計算平均分數
    const meanScores = this.calculateMeanScores(results);

    // 計算置信區間
    const confidenceIntervals = this.calculateConfidenceIntervals(results);

    // 提取數據集信息
    const datasetName = progress.totalExamples > 0 ?
      `dataset_${evaluationId}` : 'unknown';

    return {
      evaluationId,
      experimentName,
      datasetName,
      totalExamples: progress.totalExamples,
      successCount: results.length,
      failureCount: errors.length,
      executionTime,
      meanScores,
      confidenceIntervals,
      detailedResults: this.config.saveDetailedResults ? results : [],
      errors,
      metadata: {
        confidenceLevel: this.config.confidenceLevel,
        aggregationConfig: this.config
      }
    };
  }

  /**
   * 計算平均分數
   */
  private calculateMeanScores(results: EvaluationExampleResult[]): Record<string, number> {
    if (results.length === 0) return {};

    const scoresByEvaluator: Record<string, number[]> = {};

    // 收集所有評估器的分數
    for (const result of results) {
      for (const [evaluator, score] of Object.entries(result.scores)) {
        if (!scoresByEvaluator[evaluator]) {
          scoresByEvaluator[evaluator] = [];
        }
        scoresByEvaluator[evaluator].push(score);
      }
    }

    // 計算每個評估器的平均分數
    const meanScores: Record<string, number> = {};
    for (const [evaluator, scores] of Object.entries(scoresByEvaluator)) {
      meanScores[evaluator] = StatisticalAnalyzer.calculateMean(scores);
    }

    return meanScores;
  }

  /**
   * 計算置信區間
   */
  private calculateConfidenceIntervals(results: EvaluationExampleResult[]): Record<string, [number, number]> {
    if (results.length === 0) return {};

    const scoresByEvaluator: Record<string, number[]> = {};

    // 收集所有評估器的分數
    for (const result of results) {
      for (const [evaluator, score] of Object.entries(result.scores)) {
        if (!scoresByEvaluator[evaluator]) {
          scoresByEvaluator[evaluator] = [];
        }
        scoresByEvaluator[evaluator].push(score);
      }
    }

    // 計算每個評估器的置信區間
    const confidenceIntervals: Record<string, [number, number]> = {};
    for (const [evaluator, scores] of Object.entries(scoresByEvaluator)) {
      confidenceIntervals[evaluator] = StatisticalAnalyzer.calculateConfidenceInterval(
        scores,
        this.config.confidenceLevel
      );
    }

    return confidenceIntervals;
  }

  /**
   * 實時聚合
   */
  private performRealTimeAggregation(evaluationId: string): void {
    if (!this.config.enableStatisticalAnalysis) return;

    const results = this.results.get(evaluationId);
    if (!results || results.length === 0) return;

    // 計算實時統計信息
    const realTimeStats = this.calculateRealTimeStatistics(results);

    this.emitEvent('real_time_aggregation', {
      evaluationId,
      stats: realTimeStats,
      sampleSize: results.length
    });
  }

  /**
   * 計算實時統計信息
   */
  private calculateRealTimeStatistics(results: EvaluationExampleResult[]): Record<string, StatisticalAnalysis> {
    const scoresByEvaluator: Record<string, number[]> = {};

    // 收集所有評估器的分數
    for (const result of results) {
      for (const [evaluator, score] of Object.entries(result.scores)) {
        if (!scoresByEvaluator[evaluator]) {
          scoresByEvaluator[evaluator] = [];
        }
        scoresByEvaluator[evaluator].push(score);
      }
    }

    // 為每個評估器生成統計分析
    const stats: Record<string, StatisticalAnalysis> = {};
    for (const [evaluator, scores] of Object.entries(scoresByEvaluator)) {
      stats[evaluator] = StatisticalAnalyzer.generateStatisticalAnalysis(
        scores,
        evaluator,
        this.config.confidenceLevel
      );
    }

    return stats;
  }

  /**
   * 開始實時聚合
   */
  private startRealTimeAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      // 對所有活躍的評估執行實時聚合
      for (const evaluationId of this.progress.keys()) {
        const progress = this.progress.get(evaluationId);
        if (progress && progress.status === 'running') {
          this.performRealTimeAggregation(evaluationId);
        }
      }
    }, 5000); // 每5秒執行一次
  }

  /**
   * 停止實時聚合
   */
  stopRealTimeAggregation(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = undefined;
    }
  }

  /**
   * 清理舊的聚合數據
   */
  cleanup(olderThan: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)): void {
    for (const [evaluationId, startTime] of this.startTime.entries()) {
      if (startTime < olderThan) {
        this.results.delete(evaluationId);
        this.errors.delete(evaluationId);
        this.progress.delete(evaluationId);
        this.startTime.delete(evaluationId);
      }
    }

    this.emitEvent('cleanup_completed');
  }

  /**
   * 獲取評估結果摘要
   */
  getResultSummary(evaluationId: string): {
    totalExamples: number;
    completedCount: number;
    errorCount: number;
    averageScores: Record<string, number>;
    recentErrors: EvaluationError[];
  } | null {
    const progress = this.progress.get(evaluationId);
    const results = this.results.get(evaluationId);
    const errors = this.errors.get(evaluationId);

    if (!progress || !results || !errors) return null;

    return {
      totalExamples: progress.totalExamples,
      completedCount: results.length,
      errorCount: errors.length,
      averageScores: this.calculateMeanScores(results),
      recentErrors: errors.slice(-5) // 最近5個錯誤
    };
  }

  /**
   * 獲取所有活躍的評估
   */
  getActiveEvaluations(): string[] {
    return Array.from(this.progress.keys()).filter(evaluationId => {
      const progress = this.progress.get(evaluationId);
      return progress && (progress.status === 'pending' || progress.status === 'running');
    });
  }

  /**
   * 發送事件
   */
  private emitEvent(type: BatchEvaluationEventType, data?: any): void {
    const event: BatchEvaluationEvent = {
      type,
      evaluationId: data?.evaluationId || 'unknown',
      timestamp: new Date(),
      data
    };

    this.emit('event', event);
    this.emit(type, event);
  }

  /**
   * 銷毀聚合器
   */
  destroy(): void {
    this.stopRealTimeAggregation();
    this.results.clear();
    this.errors.clear();
    this.progress.clear();
    this.startTime.clear();
    this.removeAllListeners();
  }

  /**
   * 獲取當前配置
   */
  getConfig(): AggregationConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AggregationConfig>): void {
    const oldRealTime = this.config.enableRealTime;
    this.config = { ...this.config, ...newConfig };

    // 處理實時聚合配置變更
    if (oldRealTime !== this.config.enableRealTime) {
      if (this.config.enableRealTime) {
        this.startRealTimeAggregation();
      } else {
        this.stopRealTimeAggregation();
      }
    }
  }
}