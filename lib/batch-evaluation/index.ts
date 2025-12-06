/**
 * 批量評估處理管道導出文件
 * 統一導出所有批量評估相關的類型、類和函數
 */

// 類型定義
export type {
  BatchEvaluationConfig,
  BatchEvaluationProgress,
  BatchEvaluationResult,
  EvaluationExampleResult,
  TrajectoryStep,
  EvaluationError,
  StatisticalAnalysis,
  ExperimentComparison,
  EvaluatorComparison,
  DatasetInfo,
  EvaluatorInfo,
  BatchEvaluationEventType,
  BatchEvaluationEvent,
  EvaluationTask
} from './types';

// 核心類
export { BatchEvaluationEngine } from './batch-engine';
export { EvaluationQueue, type QueueConfig } from './evaluation-queue';
export { ResultsAggregator, type AggregationConfig } from './results-aggregator';
export { StatisticalAnalyzer } from './statistical-analyzer';

// 便捷工廠函數
export function createBatchEvaluationEngine(config: {
  langsmithClient: any;
  queueConfig?: Partial<QueueConfig>;
  aggregationConfig?: Partial<AggregationConfig>;
  debug?: boolean;
}) {
  return new BatchEvaluationEngine(config);
}

export function createStatisticalAnalyzer() {
  return StatisticalAnalyzer;
}

// 預設配置
export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrency: 3,
  taskTimeout: 30000,
  retryDelay: 1000,
  maxRetries: 3
};

export const DEFAULT_AGGREGATION_CONFIG: AggregationConfig = {
  enableRealTime: true,
  batchSize: 10,
  saveDetailedResults: true,
  enableStatisticalAnalysis: true,
  confidenceLevel: 0.95
};

// 常用評估器名稱
export const AVAILABLE_EVALUATORS = [
  'correctness',
  'tool_usage',
  'language_quality',
  'learning_mode_adaptation'
] as const;

// 常用數據集名稱
export const COMMON_DATASETS = [
  'dse-math-algebra-examples',
  'dse-math-geometry-examples',
  'dse-math-calculus-examples',
  'dse-math-learning-modes',
  'dse-math-evaluation-criteria'
] as const;

// 工具函數
export function createBatchEvaluationConfig(
  datasetName: string,
  evaluators: string[] = [...AVAILABLE_EVALUATORS],
  options: Partial<BatchEvaluationConfig> = {}
): BatchEvaluationConfig {
  return {
    datasetName,
    evaluators,
    concurrency: 3,
    experimentPrefix: `batch-eval-${Date.now()}`,
    enableCache: true,
    retryAttempts: 3,
    batchSize: 10,
    ...options
  };
}

export function validateBatchEvaluationConfig(config: BatchEvaluationConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.datasetName) {
    errors.push('Dataset name is required');
  }

  if (!config.evaluators || config.evaluators.length === 0) {
    errors.push('At least one evaluator must be specified');
  }

  if (config.concurrency && (config.concurrency < 1 || config.concurrency > 10)) {
    errors.push('Concurrency must be between 1 and 10');
  }

  if (config.batchSize && (config.batchSize < 1 || config.batchSize > 100)) {
    errors.push('Batch size must be between 1 and 100');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 統計分析工具函數
export function calculateExperimentWinRate(
  comparison: EvaluatorComparison[]
): number {
  const wins = comparison.reduce((count, comp) =>
    comp.winner === 'A' ? count + 1 : count, 0
  );
  return wins / comparison.length;
}

export function formatConfidenceInterval(interval: [number, number]): string {
  return `[${(interval[0] * 100).toFixed(1)}%, ${(interval[1] * 100).toFixed(1)}%]`;
}

export function interpretScore(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 0.9) return 'excellent';
  if (score >= 0.75) return 'good';
  if (score >= 0.6) return 'fair';
  return 'poor';
}

export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// 實驗比較工具
export function createExperimentComparison(
  experimentA: string,
  experimentB: string,
  comparisons: EvaluatorComparison[]
): ExperimentComparison {
  return {
    experimentA,
    experimentB,
    comparisons,
    overallWinRate: calculateExperimentWinRate(comparisons),
    statisticalSignificance: comparisons.reduce((sum, comp) => sum + comp.pValue, 0) / comparisons.length
  };
}

// 錯誤處理工具
export class BatchEvaluationError extends Error {
  constructor(
    message: string,
    public evaluationId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'BatchEvaluationError';
  }
}

export class DatasetNotFoundError extends BatchEvaluationError {
  constructor(datasetName: string) {
    super(`Dataset not found: ${datasetName}`);
    this.name = 'DatasetNotFoundError';
  }
}

export class EvaluatorNotFoundError extends BatchEvaluationError {
  constructor(evaluatorName: string) {
    super(`Evaluator not found: ${evaluatorName}`);
    this.name = 'EvaluatorNotFoundError';
  }
}

// 日誌工具
export class BatchEvaluationLogger {
  constructor(private enabled: boolean = true) {}

  debug(message: string, data?: any): void {
    if (this.enabled) {
      console.log(`[BatchEvaluation Debug] ${message}`, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.enabled) {
      console.info(`[BatchEvaluation Info] ${message}`, data);
    }
  }

  warn(message: string, data?: any): void {
    if (this.enabled) {
      console.warn(`[BatchEvaluation Warning] ${message}`, data);
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.enabled) {
      console.error(`[BatchEvaluation Error] ${message}`, error);
    }
  }
}

export const defaultLogger = new BatchEvaluationLogger(!!process.env.BATCH_EVAL_DEBUG);