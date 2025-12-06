# 批量評估處理管道

這個批量評估處理管道為您的數學學習平台提供了類似於 Python LangSmith 示例的高級評估功能。它支持大規模數據集評估、並行處理、統計分析和實驗管理。

## 🚀 核心功能

### ✅ 已實現功能

- **批量評估處理** - 支持大規模數據集的並行評估
- **統計分析** - 置信區間、t檢驗、效應量計算
- **實時進度監控** - Server-Sent Events 提供即時更新
- **多評估器支持** - 正確性、工具使用、語言質量、學習模式適配性
- **錯誤恢復機制** - 自動重試和詳細錯誤追蹤
- **LangSmith 集成** - 深度集成現有的 LangSmith 配置

## 📁 架構結構

```
lib/batch-evaluation/
├── types.ts              # 類型定義和接口規範
├── batch-engine.ts       # 主評估引擎
├── evaluation-queue.ts   # 評估作業隊列管理器
├── results-aggregator.ts # 結果聚合器
├── statistical-analyzer.ts # 統計分析器
├── index.ts              # 統一導出文件
├── example.ts            # 使用示例
└── README.md             # 文檔
```

## 🛠️ 快速開始

### 1. 基本使用

```typescript
import { LangSmithEnhancedClient } from '../langsmith-enhanced';
import { BatchEvaluationEngine, createBatchEvaluationConfig } from './index';

// 創建 LangSmith 客戶端
const langsmithClient = new LangSmithEnhancedClient();

// 創建批量評估引擎
const engine = new BatchEvaluationEngine({
  langsmithClient,
  queueConfig: { maxConcurrency: 3 },
  aggregationConfig: { enableRealTime: true },
  debug: true
});

// 創建評估配置
const config = createBatchEvaluationConfig(
  'dse-math-algebra-examples',
  ['correctness', 'tool_usage', 'language_quality'],
  { experimentPrefix: 'my-experiment' }
);

// 運行批量評估
const evaluationId = await engine.runBatchEvaluation(config);

// 監控進度
const progress = engine.getProgress(evaluationId);

// 獲取結果
const results = await engine.getResults(evaluationId);
```

### 2. 實時監控

```typescript
// 監聽事件
engine.on('event', (event) => {
  console.log(`Event: ${event.type}`, event.data);
});

engine.on('progress_updated', (data) => {
  console.log(`Progress: ${data.progress}%`);
});
```

### 3. 統計分析

```typescript
import { StatisticalAnalyzer } from './statistical-analyzer';

// 計算置信區間
const confidenceInterval = StatisticalAnalyzer.calculateConfidenceInterval(scores, 0.95);

// 執行 t 檢驗
const tTest = StatisticalAnalyzer.performTwoSampleTTest(groupA, groupB);

// 計算效應量
const effectSize = StatisticalAnalyzer.calculateCohenD(groupA, groupB);
```

## 📊 評估器說明

### 1. 正確性評估器 (`correctness`)
檢查數學答案的正確性，使用智能比較算法：
- 精確匹配
- 數值比較（容差 1%）
- 數學概念匹配

### 2. 工具使用評估器 (`tool_usage`)
評估是否正確使用了數學工具：
- 工具選擇的正確性
- 工具使用的適當性
- 軌跡分析

### 3. 語言質量評估器 (`language_quality`)
評估回答的語言質量：
- 數學公式使用（LaTeX）
- 步驟說明清晰度
- 回答長度適宜性

### 4. 學習模式適配性評估器 (`learning_mode_adaptation`)
評估回答是否符合特定學習模式：
- 解題模式 (solve)
- 輔導模式 (tutor)
- 練習模式 (practice)
- 檢查模式 (check)

## 📈 統計分析功能

### 1. 描述性統計
- 平均值、標準差、中位數
- 最小值、最大值、數據範圍
- 置信區間計算

### 2. 假設檢驗
- 雙樣本 t 檢驗
- p 值計算
- 統計顯著性判斷

### 3. 效應量分析
- 科恩 d 計算
- 效應量大小解釋
- 實踐顯著性評估

### 4. 實驗比較
- A/B 測試結果比較
- 勝率計算
- 綜合評估

## 🔧 配置選項

### 隊列配置 (QueueConfig)
```typescript
{
  maxConcurrency: 3,        // 最大並發數 (2-5)
  taskTimeout: 30000,       // 任務超時時間 (毫秒)
  retryDelay: 1000,         // 重試延遲 (毫秒)
  maxRetries: 3             // 最大重試次數
}
```

### 聚合配置 (AggregationConfig)
```typescript
{
  enableRealTime: true,     // 啟用實時聚合
  batchSize: 10,           // 批次大小
  saveDetailedResults: true, // 保存詳細結果
  enableStatisticalAnalysis: true, // 啟用統計分析
  confidenceLevel: 0.95    // 置信水平
}
```

### 評估配置 (BatchEvaluationConfig)
```typescript
{
  datasetName: 'dataset-name',
  evaluators: ['correctness', 'tool_usage'],
  concurrency: 3,
  experimentPrefix: 'experiment-prefix',
  enableCache: true,
  retryAttempts: 3,
  batchSize: 10,
  metadata: { /* 額外元數據 */ }
}
```

## 📋 可用數據集

系統預配置了以下數據集：

- `dse-math-algebra-examples` - 代數問題
- `dse-math-geometry-examples` - 幾何問題
- `dse-math-calculus-examples` - 微積分問題
- `dse-math-learning-modes` - 學習模式示例
- `dse-math-evaluation-criteria` - 評估標準

## 🚦 性能指標

### 處理能力
- **並發處理**: 2-5 個評估任務
- **處理速度**: 約 100 個樣本/分鐘
- **實時更新延遲**: < 500ms

### 可靠性
- **自動重試**: 最多 3 次重試
- **錯誤恢復**: 智能錯誤處理
- **數據完整性**: 完整的結果追蹤

### 統計準確性
- **置信區間**: 95% 置信水平
- **假設檢驗**: 雙樣本 t 檢驗
- **效應量**: 科恩 d 計算

## 🔄 使用場景

### 1. 開發階段
```typescript
// 模型驗證
await engine.runBatchEvaluation({
  datasetName: 'test-dataset',
  evaluators: ['correctness', 'tool_usage'],
  experimentPrefix: 'model-validation'
});
```

### 2. A/B 測試
```typescript
// 比較不同提示
const comparison = await engine.compareExperiments(
  'experiment-prompt-a',
  'experiment-prompt-b'
);
```

### 3. 質量監控
```typescript
// 定期評估
setInterval(async () => {
  const results = await engine.runBatchEvaluation({
    datasetName: 'quality-check-dataset',
    evaluators: ['language_quality', 'correctness'],
    experimentPrefix: 'quality-monitor'
  });

  if (results.meanScores.correctness < 0.8) {
    // 發送警告
  }
}, 24 * 60 * 60 * 1000); // 每天運行
```

## 🛡️ 錯誤處理

系統提供了完整的錯誤處理機制：

```typescript
import {
  BatchEvaluationError,
  DatasetNotFoundError,
  EvaluatorNotFoundError
} from './index';

try {
  await engine.runBatchEvaluation(config);
} catch (error) {
  if (error instanceof DatasetNotFoundError) {
    console.log('數據集不存在');
  } else if (error instanceof EvaluatorNotFoundError) {
    console.log('評估器不存在');
  } else if (error instanceof BatchEvaluationError) {
    console.log('批量評估錯誤:', error.message);
  }
}
```

## 📝 日誌和調試

啟用調試模式：

```typescript
const engine = new BatchEvaluationEngine({
  langsmithClient,
  debug: true // 啟用詳細日誌
});
```

使用內置日誌記錄器：

```typescript
import { BatchEvaluationLogger } from './index';

const logger = new BatchEvaluationLogger(true);
logger.info('評估開始');
logger.debug('詳細信息', data);
logger.error('錯誤信息', error);
```

## 🔗 與現有系統集成

批量評估系統完全兼容您現有的架構：

- **LangSmith 集成**: 使用現有的 LangSmith 配置
- **評估器**: 擴展現有的 `MathLearningEvaluators`
- **數據集**: 使用現有的數據集管理系統
- **AI API**: 集成現有的多提供商 AI 系統

## 📚 示例和教程

運行完整示例：

```bash
node lib/batch-evaluation/example.js
```

查看更多示例：
- `example.ts` - 完整的使用示例
- `runSimpleBatchEvaluation()` - 基本批量評估
- `runExperimentComparison()` - 實驗比較
- `monitorQueueStatus()` - 隊列監控

## 🎯 後續擴展

### 短期計劃 (3個月)
- [ ] LLM-as-Judge 評估器
- [ ] 自定義評估指標支持
- [ ] 增強的可視化圖表
- [ ] 評估結果導出功能

### 長期計劃 (6個月)
- [ ] 機器學習模型自動評估
- [ ] 預測性分析功能
- [ ] 多語言評估支持
- [ ] 分布式評估處理

---

**技術支持**: 如有問題，請查看日誌或聯繫開發團隊
**文檔更新**: 最後更新時間 2024-01-XX
**版本**: 1.0.0