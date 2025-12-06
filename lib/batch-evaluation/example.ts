/**
 * 批量評估系統使用示例
 * 展示如何使用批量評估處理管道
 */

import { LangSmithEnhancedClient } from '../langsmith-enhanced';
import {
  BatchEvaluationEngine,
  createBatchEvaluationConfig,
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_AGGREGATION_CONFIG,
  AVAILABLE_EVALUATORS,
  BatchEvaluationLogger
} from './index';

/**
 * 示例：運行一個簡單的批量評估
 */
export async function runSimpleBatchEvaluation() {
  const logger = new BatchEvaluationLogger(true);

  try {
    // 1. 創建 LangSmith 增強客戶端
    const langsmithClient = new LangSmithEnhancedClient('batch-evaluation-demo');

    // 2. 創建批量評估引擎
    const engine = new BatchEvaluationEngine({
      langsmithClient,
      queueConfig: {
        ...DEFAULT_QUEUE_CONFIG,
        maxConcurrency: 2, // 使用較小的並發數進行測試
        taskTimeout: 15000 // 較短的超時時間
      },
      aggregationConfig: {
        ...DEFAULT_AGGREGATION_CONFIG,
        batchSize: 5, // 較小的批次大小
        saveDetailedResults: true
      },
      debug: true
    });

    // 3. 設置事件監聽器
    engine.on('event', (event) => {
      logger.info(`Event: ${event.type}`, event.data);
    });

    // 4. 創建評估配置
    const config = createBatchEvaluationConfig(
      'dse-math-algebra-examples', // 數據集名稱
      AVAILABLE_EVALUATORS,        // 使用所有可用的評估器
      {
        concurrency: 2,
        experimentPrefix: 'demo-batch',
        metadata: {
          description: '演示批量評估功能',
          version: '1.0.0',
          author: 'batch-evaluation-system'
        }
      }
    );

    logger.info('Starting batch evaluation', config);

    // 5. 運行批量評估
    const evaluationId = await engine.runBatchEvaluation(config);
    logger.info('Batch evaluation started', { evaluationId });

    // 6. 監控進度
    const checkProgress = async () => {
      const progress = engine.getProgress(evaluationId);
      if (progress) {
        logger.info(`Progress: ${progress.progress.toFixed(1)}%`, {
          completed: progress.completedCount,
          total: progress.totalExamples,
          errors: progress.errorCount
        });

        if (progress.status === 'completed' || progress.status === 'failed') {
          logger.info(`Evaluation ${progress.status}`);
          return true;
        }
      }
      return false;
    };

    // 定期檢查進度
    while (!(await checkProgress())) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 7. 獲取最終結果
    const results = await engine.getResults(evaluationId);
    if (results) {
      logger.info('Evaluation completed', {
        successRate: (results.successCount / results.totalExamples * 100).toFixed(1) + '%',
        executionTime: (results.executionTime / 1000).toFixed(1) + 's',
        meanScores: results.meanScores
      });

      // 打印詳細結果
      console.log('\n=== 評估結果摘要 ===');
      console.log(`實驗名稱: ${results.experimentName}`);
      console.log(`數據集: ${results.datasetName}`);
      console.log(`總樣本數: ${results.totalExamples}`);
      console.log(`成功數: ${results.successCount}`);
      console.log(`失敗數: ${results.failureCount}`);
      console.log(`執行時間: ${(results.executionTime / 1000).toFixed(1)}秒`);

      console.log('\n=== 平均分數 ===');
      for (const [evaluator, score] of Object.entries(results.meanScores)) {
        console.log(`${evaluator}: ${(score * 100).toFixed(1)}%`);
      }

      console.log('\n=== 置信區間 (95%) ===');
      for (const [evaluator, interval] of Object.entries(results.confidenceIntervals)) {
        console.log(`${evaluator}: [${(interval[0] * 100).toFixed(1)}%, ${(interval[1] * 100).toFixed(1)}%]`);
      }

      if (results.errors.length > 0) {
        console.log('\n=== 錯誤摘要 ===');
        console.log(`總錯誤數: ${results.errors.length}`);
        results.errors.slice(0, 3).forEach((error, index) => {
          console.log(`${index + 1}. ${error.errorMessage}`);
        });
      }
    }

    // 8. 清理
    engine.destroy();

  } catch (error) {
    logger.error('Batch evaluation failed', error);
  }
}

/**
 * 示例：比較兩個實驗
 */
export async function runExperimentComparison() {
  const logger = new BatchEvaluationLogger(true);

  try {
    const langsmithClient = new LangSmithEnhancedClient('comparison-demo');

    // 模擬創建兩個實驗
    const experimentA = 'experiment-prompt-variant-a';
    const experimentB = 'experiment-prompt-variant-b';

    // 使用 LangSmith 客戶端的比較功能
    const comparison = await langsmithClient.compareExperiments?.(experimentA, experimentB);

    if (comparison) {
      logger.info('Experiment comparison completed', comparison);
    }

  } catch (error) {
    logger.error('Experiment comparison failed', error);
  }
}

/**
 * 示例：監控評估隊列狀態
 */
export async function monitorQueueStatus() {
  const logger = new BatchEvaluationLogger(true);

  try {
    const langsmithClient = new LangSmithEnhancedClient('monitoring-demo');

    const engine = new BatchEvaluationEngine({
      langsmithClient,
      debug: true
    });

    // 獲取引擎狀態
    const status = engine.getEngineStatus();

    logger.info('Engine Status', {
      queueStatus: status.queueStatus,
      performanceStats: status.performanceStats,
      activeEvaluations: status.activeEvaluations,
      availableEvaluators: status.availableEvaluators
    });

    // 獲取可用的數據集
    const datasets = await status.availableDatasets;
    logger.info('Available Datasets', datasets);

    engine.destroy();

  } catch (error) {
    logger.error('Monitoring failed', error);
  }
}

/**
 * 主函數：運行所有示例
 */
export async function runAllExamples() {
  console.log('🚀 批量評估系統示例開始\n');

  console.log('1. 運行簡單批量評估...');
  await runSimpleBatchEvaluation();

  console.log('\n2. 監控隊列狀態...');
  await monitorQueueStatus();

  console.log('\n3. 實驗比較示例...');
  await runExperimentComparison();

  console.log('\n✅ 所有示例完成');
}

// 如果直接運行此文件，執行示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}