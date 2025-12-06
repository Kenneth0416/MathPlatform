/**
 * 批量評估系統接口定義
 * 類型定義、接口規範和配置結構
 */

export interface BatchEvaluationConfig {
  /** 數據集名稱 */
  datasetName: string;
  /** 評估器列表 */
  evaluators: string[];
  /** 並發數量 (2-5) */
  concurrency: number;
  /** 實驗前綴 */
  experimentPrefix: string;
  /** 額外元數據 */
  metadata?: Record<string, any>;
  /** 是否啟用緩存 */
  enableCache?: boolean;
  /** 重試次數 */
  retryAttempts?: number;
  /** 批次大小 */
  batchSize?: number;
}

export interface BatchEvaluationProgress {
  /** 評估ID */
  evaluationId: string;
  /** 狀態 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** 總樣本數 */
  totalExamples: number;
  /** 已完成數量 */
  completedCount: number;
  /** 當前進度百分比 */
  progress: number;
  /** 開始時間 */
  startTime: Date;
  /** 預估完成時間 */
  estimatedCompletion?: Date;
  /** 當前處理的樣本索引 */
  currentExampleIndex?: number;
  /** 錯誤數量 */
  errorCount: number;
}

export interface BatchEvaluationResult {
  /** 評估ID */
  evaluationId: string;
  /** 實驗名稱 */
  experimentName: string;
  /** 數據集名稱 */
  datasetName: string;
  /** 總樣本數 */
  totalExamples: number;
  /** 成功處理數量 */
  successCount: number;
  /** 失敗數量 */
  failureCount: number;
  /** 執行時間 (毫秒) */
  executionTime: number;
  /** 平均評估分數 */
  meanScores: Record<string, number>;
  /** 置信區間 */
  confidenceIntervals: Record<string, [number, number]>;
  /** 詳細結果 */
  detailedResults: EvaluationExampleResult[];
  /** 錯誤日誌 */
  errors: EvaluationError[];
  /** 元數據 */
  metadata: Record<string, any>;
}

export interface EvaluationExampleResult {
  /** 樣本索引 */
  exampleIndex: number;
  /** 輸入數據 */
  inputs: Record<string, any>;
  /** 預期輸出 */
  expectedOutputs?: Record<string, any>;
  /** 實際輸出 */
  actualOutputs: Record<string, any>;
  /** 評估分數 */
  scores: Record<string, number>;
  /** 軌跡數據 */
  trajectory?: TrajectoryStep[];
  /** 執行時間 */
  executionTime: number;
  /** 錯誤信息 */
  error?: string;
}

export interface TrajectoryStep {
  /** 步驟類型 */
  type: 'user_message' | 'ai_message' | 'tool_call' | 'tool_result' | 'error' | 'llm_response';
  /** 步驟內容 */
  content?: string;
  /** 工具名稱 */
  tool?: string;
  /** 工具參數 */
  args?: Record<string, any>;
  /** 工具結果 */
  result?: any;
  /** 時間戳 */
  timestamp: Date;
  /** 元數據 */
  metadata?: Record<string, any>;
}

export interface EvaluationError {
  /** 樣本索引 */
  exampleIndex: number;
  /** 錯誤類型 */
  errorType: string;
  /** 錯誤信息 */
  errorMessage: string;
  /** 錯誤堆棧 */
  stack?: string;
  /** 時間戳 */
  timestamp: Date;
  /** 重試次數 */
  retryCount: number;
}

export interface StatisticalAnalysis {
  /** 評估器名稱 */
  evaluatorName: string;
  /** 平均值 */
  mean: number;
  /** 標準差 */
  standardDeviation: number;
  /** 置信區間 */
  confidenceInterval: [number, number];
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 中位數 */
  median: number;
  /** 數據點數量 */
  sampleSize: number;
}

export interface ExperimentComparison {
  /** 實驗A */
  experimentA: string;
  /** 實驗B */
  experimentB: string;
  /** 比較結果 */
  comparisons: EvaluatorComparison[];
  /** 總體勝率 */
  overallWinRate: number;
  /** 統計顯著性 */
  statisticalSignificance: number;
}

export interface EvaluatorComparison {
  /** 評估器名稱 */
  evaluatorName: string;
  /** 實驗A 分數 */
  scoresA: number[];
  /** 實驗B 分數 */
  scoresB: number[];
  /** A 的平均值 */
  meanA: number;
  /** B 的平均值 */
  meanB: number;
  /** p值 */
  pValue: number;
  /** 是否顯著 */
  isSignificant: boolean;
  /** 效應量 */
  effectSize: number;
  /** 勝者 */
  winner: 'A' | 'B' | 'tie';
}

export interface DatasetInfo {
  /** 數據集名稱 */
  name: string;
  /** 描述 */
  description: string;
  /** 樣本數量 */
  size: number;
  /** 創建時間 */
  createdAt: Date;
  /** 最後更新 */
  updatedAt: Date;
  /** 標籤 */
  tags: string[];
}

export interface EvaluatorInfo {
  /** 評估器名稱 */
  name: string;
  /** 描述 */
  description: string;
  /** 評估器類型 */
  type: 'correctness' | 'tool_usage' | 'language_quality' | 'custom';
  /** 是否啟用 */
  enabled: boolean;
  /** 配置選項 */
  config?: Record<string, any>;
}

/**
 * 批量評估事件類型
 */
export type BatchEvaluationEventType =
  | 'evaluation_started'
  | 'evaluation_progress'
  | 'evaluation_completed'
  | 'evaluation_failed'
  | 'evaluation_cancelled'
  | 'example_started'
  | 'example_completed'
  | 'example_failed';

/**
 * 批量評估事件
 */
export interface BatchEvaluationEvent {
  /** 事件類型 */
  type: BatchEvaluationEventType;
  /** 評估ID */
  evaluationId: string;
  /** 時間戳 */
  timestamp: Date;
  /** 數據 */
  data?: any;
}

/**
 * 評估隊列任務
 */
export interface EvaluationTask {
  /** 任務ID */
  id: string;
  /** 評估ID */
  evaluationId: string;
  /** 樣本索引 */
  exampleIndex: number;
  /** 輸入數據 */
  inputs: Record<string, any>;
  /** 預期輸出 */
  expectedOutputs?: Record<string, any>;
  /** 評估器列表 */
  evaluators: string[];
  /** 優先級 */
  priority: number;
  /** 創建時間 */
  createdAt: Date;
  /** 開始時間 */
  startedAt?: Date;
  /** 完成時間 */
  completedAt?: Date;
  /** 重試次數 */
  retryCount: number;
  /** 狀態 */
  status: 'pending' | 'running' | 'completed' | 'failed';
}