/**
 * 評估作業隊列管理器
 * 負責管理批量評估的任務隊列、並行處理和錯誤恢復
 */

import { EventEmitter } from 'events';
import { EvaluationTask, BatchEvaluationEvent, BatchEvaluationEventType } from './types';

export interface QueueConfig {
  /** 最大並發數 */
  maxConcurrency: number;
  /** 任務超時時間 (毫秒) */
  taskTimeout: number;
  /** 重試間隔 (毫秒) */
  retryDelay: number;
  /** 最大重試次數 */
  maxRetries: number;
}

export class EvaluationQueue extends EventEmitter {
  private queue: EvaluationTask[] = [];
  private running: Set<string> = new Set();
  private completed: Map<string, EvaluationTask> = new Map();
  private failed: Map<string, EvaluationTask> = new Map();
  private config: QueueConfig;
  private isProcessing = false;
  private processingTimer?: NodeJS.Timeout;

  constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = {
      maxConcurrency: 3,
      taskTimeout: 30000, // 30秒
      retryDelay: 1000,   // 1秒
      maxRetries: 3,
      ...config
    };
  }

  /**
   * 添加任務到隊列
   */
  addTask(task: EvaluationTask): void {
    // 驗證任務
    if (!task.id || !task.evaluationId || !task.inputs) {
      throw new Error('Invalid task: missing required fields');
    }

    // 檢查任務是否已存在
    if (this.queue.some(t => t.id === task.id) ||
        this.running.has(task.id) ||
        this.completed.has(task.id)) {
      return;
    }

    this.queue.push(task);
    this.sortQueueByPriority();

    this.emitEvent('task_added', { taskId: task.id });
    this.startProcessing();
  }

  /**
   * 批量添加任務
   */
  addTasks(tasks: EvaluationTask[]): void {
    for (const task of tasks) {
      this.addTask(task);
    }
  }

  /**
   * 按優先級排序隊列
   */
  private sortQueueByPriority(): void {
    this.queue.sort((a, b) => {
      // 優先處理重試任務
      if (a.retryCount > 0 && b.retryCount === 0) return -1;
      if (a.retryCount === 0 && b.retryCount > 0) return 1;

      // 然後按優先級排序
      return b.priority - a.priority;
    });
  }

  /**
   * 開始處理隊列
   */
  startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * 停止處理隊列
   */
  stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = undefined;
    }
  }

  /**
   * 處理隊列主循環
   */
  private async processQueue(): Promise<void> {
    while (this.isProcessing && (this.queue.length > 0 || this.running.size > 0)) {
      // 啟動新任務直到達到最大並發數
      while (this.running.size < this.config.maxConcurrency && this.queue.length > 0) {
        const task = this.queue.shift();
        if (task) {
          this.executeTask(task);
        }
      }

      // 等待一段時間再檢查
      await new Promise(resolve => {
        this.processingTimer = setTimeout(resolve, 100);
      });
    }

    this.isProcessing = false;
    this.emitEvent('queue_empty');
  }

  /**
   * 執行單個任務
   */
  private async executeTask(task: EvaluationTask): Promise<void> {
    this.running.add(task.id);
    task.status = 'running';
    task.startedAt = new Date();

    this.emitEvent('task_started', {
      taskId: task.id,
      evaluationId: task.evaluationId,
      exampleIndex: task.exampleIndex
    });

    try {
      // 設置任務超時
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeout);
      });

      // 執行任務 (這裡需要外部提供執行器)
      const taskPromise = this.runTask(task);

      await Promise.race([taskPromise, timeoutPromise]);

      // 任務成功完成
      task.status = 'completed';
      task.completedAt = new Date();
      this.completed.set(task.id, task);
      this.running.delete(task.id);

      this.emitEvent('task_completed', {
        taskId: task.id,
        evaluationId: task.evaluationId,
        executionTime: task.completedAt!.getTime() - task.startedAt!.getTime()
      });

    } catch (error) {
      // 任務失敗
      task.retryCount++;

      if (task.retryCount <= this.config.maxRetries) {
        // 重試任務
        task.status = 'pending';
        this.running.delete(task.id);

        this.emitEvent('task_retry', {
          taskId: task.id,
          evaluationId: task.evaluationId,
          retryCount: task.retryCount,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // 延遲後重新加入隊列
        setTimeout(() => {
          this.queue.push(task);
          this.sortQueueByPriority();
        }, this.config.retryDelay);

      } else {
        // 超過最大重試次數，標記為失敗
        task.status = 'failed';
        task.completedAt = new Date();
        this.failed.set(task.id, task);
        this.running.delete(task.id);

        this.emitEvent('task_failed', {
          taskId: task.id,
          evaluationId: task.evaluationId,
          error: error instanceof Error ? error.message : 'Unknown error',
          finalRetry: true
        });
      }
    }
  }

  /**
   * 這個方法需要被子類或外部實現
   * 定義如何執行具體的評估任務
   */
  protected async runTask(task: EvaluationTask): Promise<void> {
    throw new Error('runTask method must be implemented by subclass');
  }

  /**
   * 獲取隊列狀態
   */
  getQueueStatus(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  } {
    return {
      pending: this.queue.length,
      running: this.running.size,
      completed: this.completed.size,
      failed: this.failed.size,
      total: this.queue.length + this.running.size + this.completed.size + this.failed.size
    };
  }

  /**
   * 獲取特定評估的任務狀態
   */
  getEvaluationTaskStatus(evaluationId: string): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    tasks: EvaluationTask[];
  } {
    const allTasks = [
      ...this.queue.filter(t => t.evaluationId === evaluationId),
      ...Array.from(this.running.values()).filter(t => t.evaluationId === evaluationId),
      ...Array.from(this.completed.values()).filter(t => t.evaluationId === evaluationId),
      ...Array.from(this.failed.values()).filter(t => t.evaluationId === evaluationId)
    ];

    return {
      pending: allTasks.filter(t => t.status === 'pending').length,
      running: allTasks.filter(t => t.status === 'running').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      failed: allTasks.filter(t => t.status === 'failed').length,
      tasks: allTasks
    };
  }

  /**
   * 取消特定評估的所有任務
   */
  cancelEvaluation(evaluationId: string): void {
    // 移除隊列中的待處理任務
    this.queue = this.queue.filter(task => task.evaluationId !== evaluationId);

    // 標記正在運行的任務為已取消 (任務會自然完成)
    const runningTasks = Array.from(this.running.values()).filter(t => t.evaluationId === evaluationId);
    for (const task of runningTasks) {
      task.status = 'failed';
      task.completedAt = new Date();
      this.failed.set(task.id, task);
      this.running.delete(task.id);
    }

    this.emitEvent('evaluation_cancelled', { evaluationId });
  }

  /**
   * 清理已完成的任務
   */
  cleanup(olderThan: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)): void {
    // 清理舊的已完成任務
    for (const [taskId, task] of this.completed.entries()) {
      if (task.completedAt! < olderThan) {
        this.completed.delete(taskId);
      }
    }

    // 清理舊的失敗任務
    for (const [taskId, task] of this.failed.entries()) {
      if (task.completedAt! < olderThan) {
        this.failed.delete(taskId);
      }
    }

    this.emitEvent('cleanup_completed');
  }

  /**
   * 獲取性能統計
   */
  getPerformanceStats(): {
    averageExecutionTime: number;
    totalExecutionTime: number;
    successRate: number;
    averageRetries: number;
  } {
    const completedTasks = Array.from(this.completed.values());
    const failedTasks = Array.from(this.failed.values());

    if (completedTasks.length === 0) {
      return {
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        successRate: 0,
        averageRetries: 0
      };
    }

    const executionTimes = completedTasks
      .filter(task => task.startedAt && task.completedAt)
      .map(task => task.completedAt!.getTime() - task.startedAt!.getTime());

    const totalTasks = completedTasks.length + failedTasks.length;
    const allTasks = [...completedTasks, ...failedTasks];
    const totalRetries = allTasks.reduce((sum, task) => sum + task.retryCount, 0);

    return {
      averageExecutionTime: executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0,
      totalExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0),
      successRate: completedTasks.length / totalTasks,
      averageRetries: totalRetries / totalTasks
    };
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
   * 清空隊列
   */
  clear(): void {
    this.stopProcessing();
    this.queue = [];
    this.running.clear();
    this.completed.clear();
    this.failed.clear();
    this.emitEvent('queue_cleared');
  }

  /**
   * 獲取當前配置
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果減少了最大並發數，可能需要等待當前任務完成
    if (newConfig.maxConcurrency !== undefined && newConfig.maxConcurrency < this.config.maxConcurrency) {
      // 隊列會自然調整到新的並發限制
    }
  }
}