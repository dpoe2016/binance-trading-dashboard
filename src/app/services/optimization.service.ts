import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BacktestingService, BacktestResults } from './backtesting.service';
import { BinanceService } from './binance.service';
import { TradingStrategy, Candle } from '../models/trading.model';

export interface ParameterRange {
  name: string;
  min: number;
  max: number;
  step: number;
  type: 'integer' | 'decimal';
}

export interface OptimizationConfig {
  strategyId: string;
  symbol: string;
  timeframe: string;
  initialCapital: number;
  dataPoints: number;
  parameters: ParameterRange[];
  optimizationMetric: OptimizationMetric;
}

export enum OptimizationMetric {
  TOTAL_PROFIT = 'total_profit',
  TOTAL_PROFIT_PERCENT = 'total_profit_percent',
  SHARPE_RATIO = 'sharpe_ratio',
  PROFIT_FACTOR = 'profit_factor',
  WIN_RATE = 'win_rate',
  MAX_DRAWDOWN = 'max_drawdown',
  COMPOSITE_SCORE = 'composite_score'
}

export interface OptimizationResult {
  parameters: { [key: string]: number };
  results: BacktestResults;
  score: number;
}

export interface OptimizationProgress {
  current: number;
  total: number;
  percentage: number;
  currentParams: { [key: string]: number };
  bestSoFar: OptimizationResult | null;
  status: 'running' | 'completed' | 'cancelled' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class OptimizationService {
  private progressSubject = new BehaviorSubject<OptimizationProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    currentParams: {},
    bestSoFar: null,
    status: 'completed'
  });

  public progress$ = this.progressSubject.asObservable();
  private shouldCancel = false;

  constructor(
    private backtestingService: BacktestingService,
    private binanceService: BinanceService
  ) {}

  /**
   * Run grid search optimization
   */
  async runGridSearch(config: OptimizationConfig, strategy: TradingStrategy): Promise<OptimizationResult[]> {
    this.shouldCancel = false;
    const results: OptimizationResult[] = [];

    // Generate parameter combinations
    const parameterCombinations = this.generateParameterCombinations(config.parameters);
    const total = parameterCombinations.length;

    console.log(`🔍 Starting grid search optimization with ${total} combinations`);

    // Update progress
    this.updateProgress(0, total, {}, null, 'running');

    // Fetch candles once
    const candles = await this.binanceService.getCandles(
      config.symbol,
      config.timeframe,
      config.dataPoints
    );

    if (!candles || candles.length < 50) {
      throw new Error('Insufficient historical data for optimization');
    }

    // Test each parameter combination
    for (let i = 0; i < parameterCombinations.length; i++) {
      if (this.shouldCancel) {
        this.updateProgress(i, total, {}, results[0] || null, 'cancelled');
        break;
      }

      const params = parameterCombinations[i];

      // Update strategy with new parameters
      const testStrategy = this.applyParameters(strategy, params);

      // Run backtest
      const backtestResults = this.backtestingService.runBacktest(
        testStrategy,
        candles,
        config.initialCapital
      );

      // Calculate score based on optimization metric
      const score = this.calculateScore(backtestResults, config.optimizationMetric);

      const result: OptimizationResult = {
        parameters: params,
        results: backtestResults,
        score
      };

      results.push(result);

      // Update progress with best result so far
      const bestSoFar = this.getBestResult(results);
      this.updateProgress(i + 1, total, params, bestSoFar, 'running');
    }

    // Sort results by score (descending)
    results.sort((a, b) => b.score - a.score);

    // Mark as completed
    this.updateProgress(total, total, {}, results[0] || null, 'completed');

    console.log(`✅ Optimization complete. Best score: ${results[0]?.score.toFixed(4)}`);

    return results;
  }

  /**
   * Cancel ongoing optimization
   */
  cancelOptimization(): void {
    this.shouldCancel = true;
  }

  /**
   * Get current progress
   */
  getProgress(): Observable<OptimizationProgress> {
    return this.progress$;
  }

  /**
   * Generate all parameter combinations for grid search
   */
  private generateParameterCombinations(ranges: ParameterRange[]): Array<{ [key: string]: number }> {
    if (ranges.length === 0) return [{}];

    const combinations: Array<{ [key: string]: number }> = [];

    const generateRecursive = (index: number, current: { [key: string]: number }) => {
      if (index === ranges.length) {
        combinations.push({ ...current });
        return;
      }

      const range = ranges[index];
      const values = this.generateRangeValues(range);

      for (const value of values) {
        current[range.name] = value;
        generateRecursive(index + 1, current);
      }
    };

    generateRecursive(0, {});
    return combinations;
  }

  /**
   * Generate values for a parameter range
   */
  private generateRangeValues(range: ParameterRange): number[] {
    const values: number[] = [];
    let current = range.min;

    while (current <= range.max) {
      if (range.type === 'integer') {
        values.push(Math.round(current));
      } else {
        values.push(parseFloat(current.toFixed(4)));
      }
      current += range.step;
    }

    return values;
  }

  /**
   * Apply parameter values to strategy
   */
  private applyParameters(strategy: TradingStrategy, params: { [key: string]: number }): TradingStrategy {
    const updatedStrategy = { ...strategy, parameters: { ...strategy.parameters } };

    // Apply all parameters to the strategy parameters object
    for (const [key, value] of Object.entries(params)) {
      updatedStrategy.parameters[key] = value;
    }

    return updatedStrategy;
  }

  /**
   * Calculate optimization score based on metric
   */
  private calculateScore(results: BacktestResults, metric: OptimizationMetric): number {
    switch (metric) {
      case OptimizationMetric.TOTAL_PROFIT:
        return results.totalProfit;

      case OptimizationMetric.TOTAL_PROFIT_PERCENT:
        return results.totalProfitPercent;

      case OptimizationMetric.SHARPE_RATIO:
        return results.sharpeRatio;

      case OptimizationMetric.PROFIT_FACTOR:
        return results.profitFactor;

      case OptimizationMetric.WIN_RATE:
        return results.winRate;

      case OptimizationMetric.MAX_DRAWDOWN:
        // Negative score for drawdown (less is better)
        return -Math.abs(results.maxDrawdownPercent);

      case OptimizationMetric.COMPOSITE_SCORE:
        // Weighted composite score
        return this.calculateCompositeScore(results);

      default:
        return results.totalProfitPercent;
    }
  }

  /**
   * Calculate composite score from multiple metrics
   */
  private calculateCompositeScore(results: BacktestResults): number {
    let score = 0;

    // Profitability (40% weight)
    if (results.totalProfit > 0) {
      score += (results.totalProfitPercent / 100) * 40;
    }

    // Sharpe Ratio (25% weight)
    score += Math.max(0, results.sharpeRatio) * 25;

    // Win Rate (15% weight)
    score += (results.winRate / 100) * 15;

    // Profit Factor (10% weight)
    score += Math.max(0, (results.profitFactor - 1)) * 10;

    // Penalty for drawdown (10% weight)
    score -= Math.abs(results.maxDrawdownPercent / 100) * 10;

    // Bonus for statistical significance
    if (results.totalTrades >= 30) {
      score += 5;
    }

    return score;
  }

  /**
   * Get best result from array
   */
  private getBestResult(results: OptimizationResult[]): OptimizationResult | null {
    if (results.length === 0) return null;

    return results.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }

  /**
   * Update progress
   */
  private updateProgress(
    current: number,
    total: number,
    currentParams: { [key: string]: number },
    bestSoFar: OptimizationResult | null,
    status: 'running' | 'completed' | 'cancelled' | 'error'
  ): void {
    this.progressSubject.next({
      current,
      total,
      percentage: total > 0 ? (current / total) * 100 : 0,
      currentParams,
      bestSoFar,
      status
    });
  }

  /**
   * Estimate optimization time
   */
  estimateOptimizationTime(ranges: ParameterRange[]): { combinations: number; estimatedSeconds: number } {
    const combinations = this.generateParameterCombinations(ranges).length;
    // Assume 100ms per backtest on average
    const estimatedSeconds = Math.ceil((combinations * 0.1));

    return { combinations, estimatedSeconds };
  }

  /**
   * Generate heatmap data for 2-parameter optimization
   */
  generateHeatmapData(
    results: OptimizationResult[],
    param1Name: string,
    param2Name: string
  ): Array<{ x: number; y: number; value: number }> {
    const heatmapData: Array<{ x: number; y: number; value: number }> = [];

    for (const result of results) {
      const x = result.parameters[param1Name];
      const y = result.parameters[param2Name];

      if (x !== undefined && y !== undefined) {
        heatmapData.push({
          x,
          y,
          value: result.score
        });
      }
    }

    return heatmapData;
  }

  /**
   * Get parameter statistics from results
   */
  getParameterStatistics(results: OptimizationResult[], paramName: string): {
    best: number;
    worst: number;
    average: number;
    median: number;
  } {
    const values = results
      .filter(r => r.parameters[paramName] !== undefined)
      .map(r => r.parameters[paramName])
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return { best: 0, worst: 0, average: 0, median: 0 };
    }

    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = values[Math.floor(values.length / 2)];

    // Find best and worst by score
    const sortedByScore = [...results].sort((a, b) => b.score - a.score);
    const best = sortedByScore[0]?.parameters[paramName] || 0;
    const worst = sortedByScore[sortedByScore.length - 1]?.parameters[paramName] || 0;

    return { best, worst, average, median };
  }
}
