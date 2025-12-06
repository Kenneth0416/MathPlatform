/**
 * 統計分析器
 * 提供各種統計分析功能，包括均值、置信區間、假設檢驗等
 */

import { StatisticalAnalysis, EvaluatorComparison } from './types';

export class StatisticalAnalyzer {
  /**
   * 計算平均值
   */
  static calculateMean(scores: number[]): number {
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * 計算標準差
   */
  static calculateStandardDeviation(scores: number[]): number {
    if (scores.length === 0) return 0;
    const mean = this.calculateMean(scores);
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * 計算置信區間 (使用 t 分布)
   */
  static calculateConfidenceInterval(
    scores: number[],
    confidence: number = 0.95
  ): [number, number] {
    if (scores.length === 0) return [0, 0];

    const mean = this.calculateMean(scores);
    const stdDev = this.calculateStandardDeviation(scores);
    const n = scores.length;

    // 簡化的 t 分數 (對於 n > 30 使用 z 分數近似)
    const tScore = this.getTCriticalValue(n - 1, confidence);
    const marginOfError = tScore * (stdDev / Math.sqrt(n));

    return [
      Math.max(0, mean - marginOfError), // 確保下界不小於0
      Math.min(1, mean + marginOfError)  // 確保上界不大於1
    ];
  }

  /**
   * 獲取 t 臨界值 (簡化版本)
   */
  private static getTCriticalValue(degreesOfFreedom: number, confidence: number): number {
    // 簡化的 t 臨界值表
    const tTable: Record<number, Record<number, number>> = {
      1: { 0.90: 6.314, 0.95: 12.706, 0.99: 63.657 },
      2: { 0.90: 2.920, 0.95: 4.303, 0.99: 9.925 },
      5: { 0.90: 2.015, 0.95: 2.571, 0.99: 4.032 },
      10: { 0.90: 1.812, 0.95: 2.228, 0.99: 3.169 },
      20: { 0.90: 1.725, 0.95: 2.086, 0.99: 2.845 },
      30: { 0.90: 1.697, 0.95: 2.042, 0.99: 2.750 },
      50: { 0.90: 1.676, 0.95: 2.009, 0.99: 2.678 },
      100: { 0.90: 1.660, 0.95: 1.984, 0.99: 2.626 }
    };

    // 對於大樣本，使用 z 分數
    if (degreesOfFreedom >= 100) {
      const zTable: Record<number, number> = { 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 };
      return zTable[confidence] || 1.96;
    }

    // 找到最接近的自由度
    const availableDf = Object.keys(tTable)
      .map(Number)
      .sort((a, b) => b - a)
      .find(df => df <= degreesOfFreedom) || 30;

    return tTable[availableDf]?.[confidence] || 2.0;
  }

  /**
   * 計算中位數
   */
  static calculateMedian(scores: number[]): number {
    if (scores.length === 0) return 0;

    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * 執行雙樣本 t 檢驗
   */
  static performTwoSampleTTest(
    groupA: number[],
    groupB: number[]
  ): { pValue: number; significant: boolean; tStatistic: number } {
    if (groupA.length === 0 || groupB.length === 0) {
      return { pValue: 1, significant: false, tStatistic: 0 };
    }

    const meanA = this.calculateMean(groupA);
    const meanB = this.calculateMean(groupB);
    const varA = this.calculateVariance(groupA);
    const varB = this.calculateVariance(groupB);

    const nA = groupA.length;
    const nB = groupB.length;

    // 合併標準差
    const pooledVariance = ((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2);
    const standardError = Math.sqrt(pooledVariance * (1/nA + 1/nB));

    // t 統計量
    const tStatistic = (meanA - meanB) / standardError;

    // 自由度
    const degreesOfFreedom = nA + nB - 2;

    // 計算 p 值 (簡化版本，使用正態分布近似)
    const pValue = this.calculatePValue(Math.abs(tStatistic), degreesOfFreedom);

    return {
      pValue,
      significant: pValue < 0.05,
      tStatistic
    };
  }

  /**
   * 計算方差
   */
  private static calculateVariance(scores: number[]): number {
    if (scores.length === 0) return 0;
    const mean = this.calculateMean(scores);
    return this.calculateMean(scores.map(score => Math.pow(score - mean, 2)));
  }

  /**
   * 計算 p 值 (簡化版本)
   */
  private static calculatePValue(tStatistic: number, degreesOfFreedom: number): number {
    // 這是一個簡化的 p 值計算
    // 實際應用中應該使用更精確的統計庫
    if (tStatistic < 1.96) return 0.1;
    if (tStatistic < 2.58) return 0.05;
    if (tStatistic < 3.29) return 0.01;
    return 0.001;
  }

  /**
   * 計算科恩 d 效應量
   */
  static calculateCohenD(groupA: number[], groupB: number[]): number {
    if (groupA.length === 0 || groupB.length === 0) return 0;

    const meanA = this.calculateMean(groupA);
    const meanB = this.calculateMean(groupB);
    const varA = this.calculateVariance(groupA);
    const varB = this.calculateVariance(groupB);

    const nA = groupA.length;
    const nB = groupB.length;

    // 合併標準差
    const pooledStandardDeviation = Math.sqrt(((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2));

    if (pooledStandardDeviation === 0) return 0;

    return Math.abs(meanA - meanB) / pooledStandardDeviation;
  }

  /**
   * 評估效應量大小
   */
  static interpretEffectSize(cohenD: number): 'negligible' | 'small' | 'medium' | 'large' {
    if (cohenD < 0.2) return 'negligible';
    if (cohenD < 0.5) return 'small';
    if (cohenD < 0.8) return 'medium';
    return 'large';
  }

  /**
   * 生成完整的統計分析
   */
  static generateStatisticalAnalysis(
    scores: number[],
    evaluatorName: string,
    confidence: number = 0.95
  ): StatisticalAnalysis {
    return {
      evaluatorName,
      mean: this.calculateMean(scores),
      standardDeviation: this.calculateStandardDeviation(scores),
      confidenceInterval: this.calculateConfidenceInterval(scores, confidence),
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
      median: this.calculateMedian(scores),
      sampleSize: scores.length
    };
  }

  /**
   * 比較兩組評估結果
   */
  static compareEvaluationResults(
    evaluatorName: string,
    scoresA: number[],
    scoresB: number[],
    experimentA: string,
    experimentB: string
  ): EvaluatorComparison {
    const tTest = this.performTwoSampleTTest(scoresA, scoresB);
    const effectSize = this.calculateCohenD(scoresA, scoresB);

    let winner: 'A' | 'B' | 'tie';
    const meanA = this.calculateMean(scoresA);
    const meanB = this.calculateMean(scoresB);

    if (Math.abs(meanA - meanB) < 0.01) {
      winner = 'tie';
    } else if (meanA > meanB) {
      winner = 'A';
    } else {
      winner = 'B';
    }

    return {
      evaluatorName,
      scoresA,
      scoresB,
      meanA,
      meanB,
      pValue: tTest.pValue,
      isSignificant: tTest.significant,
      effectSize,
      winner
    };
  }

  /**
   * 批量分析多個評估器
   */
  static batchAnalyze(
    allScores: Record<string, number[]>,
    confidence: number = 0.95
  ): StatisticalAnalysis[] {
    return Object.entries(allScores).map(([evaluatorName, scores]) =>
      this.generateStatisticalAnalysis(scores, evaluatorName, confidence)
    );
  }

  /**
   * 計算綜合勝率
   */
  static calculateOverallWinRate(comparisons: EvaluatorComparison[]): number {
    if (comparisons.length === 0) return 0.5;

    const wins = comparisons.reduce((count, comparison) => {
      if (comparison.winner === 'A') return count + 1;
      return count;
    }, 0);

    return wins / comparisons.length;
  }

  /**
   * 計算平均 p 值
   */
  static calculateAveragePValue(comparisons: EvaluatorComparison[]): number {
    if (comparisons.length === 0) return 1;

    const sumPValues = comparisons.reduce((sum, comparison) => sum + comparison.pValue, 0);
    return sumPValues / comparisons.length;
  }

  /**
   * 檢查數據質量
   */
  static validateScores(scores: number[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 檢查空數據
    if (scores.length === 0) {
      issues.push('No scores provided');
      recommendations.push('Provide at least some evaluation scores');
      return { isValid: false, issues, recommendations };
    }

    // 檢查數據範圍
    const invalidScores = scores.filter(score => score < 0 || score > 1);
    if (invalidScores.length > 0) {
      issues.push(`${invalidScores.length} scores are outside the [0, 1] range`);
      recommendations.push('Ensure all scores are normalized between 0 and 1');
    }

    // 檢查樣本大小
    if (scores.length < 10) {
      issues.push(`Small sample size: ${scores.length}`);
      recommendations.push('Consider collecting more data for reliable statistics');
    }

    // 檢查異常值
    const mean = this.calculateMean(scores);
    const stdDev = this.calculateStandardDeviation(scores);
    const outliers = scores.filter(score => Math.abs(score - mean) > 3 * stdDev);

    if (outliers.length > scores.length * 0.1) {
      issues.push(`Many outliers detected: ${outliers.length} out of ${scores.length}`);
      recommendations.push('Investigate potential evaluation errors or edge cases');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }
}