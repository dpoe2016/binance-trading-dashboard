import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { createChart, IChartApi, CandlestickSeries, LineSeries, LineData, CandlestickData, createSeriesMarkers } from 'lightweight-charts';

import { BacktestingService, BacktestResults, BacktestTrade, BacktestSignal } from '../../services/backtesting.service';
import { StrategyService } from '../../services/strategy.service';
import { BinanceService } from '../../services/binance.service';
import { OptimizationService, ParameterRange, OptimizationConfig, OptimizationMetric, OptimizationResult, OptimizationProgress } from '../../services/optimization.service';
import { TradingStrategy, Candle } from '../../models/trading.model';

@Component({
  selector: 'app-backtesting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './backtesting.component.html',
  styleUrls: ['./backtesting.component.scss']
})
export class BacktestingComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  strategies: TradingStrategy[] = [];
  selectedStrategy: string | null = null;
  selectedSymbol: string = 'BTCUSDT';
  selectedInterval: string = '15m';
  initialCapital: number = 10000;

  candles: Candle[] = [];
  results: BacktestResults | null = null;
  multiTimeframeResults: Array<BacktestResults & { timeframe: string }> = [];
  bestTimeframe: (BacktestResults & { timeframe: string }) | null = null;
  isRunning: boolean = false;
  isLoading: boolean = false;

  private chart?: IChartApi;
  private candlestickSeries?: any;
  private seriesMarkers?: any; // v5 marker primitive
  private subscriptions: Subscription[] = [];
  private chartResizeObserver?: ResizeObserver;

  symbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT',
    'XRPUSDT', 'DOTUSDT', 'UNIUSDT', 'LTCUSDT', 'SOLUSDT'
  ];

  intervals = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1d', value: '1d' }
  ];

  // Optimization
  showOptimization: boolean = false;
  optimizationResults: OptimizationResult[] = [];
  optimizationProgress: OptimizationProgress | null = null;
  optimizationMetrics = Object.values(OptimizationMetric);
  selectedOptimizationMetric: OptimizationMetric = OptimizationMetric.COMPOSITE_SCORE;
  parameterRanges: ParameterRange[] = [];

  constructor(
    private backtestingService: BacktestingService,
    private strategyService: StrategyService,
    private binanceService: BinanceService,
    private optimizationService: OptimizationService
  ) {}

  ngOnInit(): void {
    this.loadStrategies();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.remove();
    }
    if (this.chartResizeObserver) {
      this.chartResizeObserver.disconnect();
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadStrategies(): void {
    this.subscriptions.push(
      this.strategyService.getStrategies().subscribe(strategies => {
        this.strategies = strategies;
        if (strategies.length > 0 && !this.selectedStrategy) {
          this.selectedStrategy = strategies[0].id;
          this.selectedSymbol = strategies[0].symbol;
          this.selectedInterval = strategies[0].timeframe;
        }
      })
    );
  }

  onStrategyChange(): void {
    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
    if (strategy) {
      this.selectedSymbol = strategy.symbol;
      this.selectedInterval = strategy.timeframe;
    }
  }

  async runBacktest(): Promise<void> {
    if (!this.selectedStrategy) {
      alert('Please select a strategy');
      return;
    }

    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
    if (!strategy) return;

    this.isRunning = true;
    this.isLoading = true;
    this.results = null;

    try {
      // Load historical data
      this.candles = await this.binanceService.getCandles(
        this.selectedSymbol,
        this.selectedInterval,
        1000
      );

      // Run backtest
      this.results = this.backtestingService.runBacktest(
        strategy,
        this.candles,
        this.initialCapital
      );

      // Initialize chart after results are available
      setTimeout(() => {
        this.initChart();
        this.displayResults();
      }, 100);

    } catch (error) {
      console.error('Error running backtest:', error);
      alert('Error running backtest. Please try again.');
    } finally {
      this.isRunning = false;
      this.isLoading = false;
    }
  }

  private initChart(): void {
    if (!this.chartContainer || this.chart) return;

    const container = this.chartContainer.nativeElement;

    this.chart = createChart(container, {
      width: container.clientWidth,
      height: 500,
      layout: {
        background: { type: 'solid' as any, color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    this.candlestickSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Handle resize
    this.chartResizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === container && this.chart) {
          const { width } = entry.contentRect;
          this.chart.applyOptions({ width });
        }
      }
    });
    this.chartResizeObserver.observe(container);
  }

  private displayResults(): void {
    if (!this.results || !this.chart || !this.candlestickSeries) return;

    // Set candle data
    const chartData: CandlestickData[] = this.candles.map(c => ({
      time: Math.floor(c.time / 1000) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    this.candlestickSeries.setData(chartData);

    // Add trade markers using v5 API
    const markers = this.createTradeMarkers(this.results.trades);
    if (markers.length > 0) {
      if (!this.seriesMarkers) {
        this.seriesMarkers = createSeriesMarkers(this.candlestickSeries, markers);
        console.log('📊 Backtesting: Created series markers with', markers.length, 'trade markers');
      } else {
        this.seriesMarkers.setMarkers(markers);
        console.log('📊 Backtesting: Updated series markers with', markers.length, 'trade markers');
      }
    }

    // Add equity curve
    this.addEquityCurve(this.results.trades);

    // Fit content
    this.chart.timeScale().fitContent();
  }

  private createTradeMarkers(trades: BacktestTrade[]): any[] {
    const markers: any[] = [];

    for (const trade of trades) {
      // Entry marker
      markers.push({
        time: Math.floor(trade.entryTime / 1000),
        position: 'belowBar' as 'aboveBar' | 'belowBar' | 'inBar',
        price: trade.entryPrice, // v5 requires price property
        color: '#22c55e',
        shape: 'arrowUp' as 'arrowUp' | 'arrowDown' | 'circle' | 'square',
        text: `BUY @ ${trade.entryPrice.toFixed(2)}`,
      });

      // Exit marker
      if (trade.exitTime && trade.exitPrice) {
        const isProfit = (trade.profit || 0) > 0;
        markers.push({
          time: Math.floor(trade.exitTime / 1000),
          position: 'aboveBar' as 'aboveBar' | 'belowBar' | 'inBar',
          price: trade.exitPrice, // v5 requires price property
          color: isProfit ? '#22c55e' : '#ef4444',
          shape: 'arrowDown' as 'arrowUp' | 'arrowDown' | 'circle' | 'square',
          text: `SELL @ ${trade.exitPrice.toFixed(2)} (${isProfit ? '+' : ''}${trade.profitPercent?.toFixed(2)}%)`,
        });
      }
    }

    return markers;
  }

  private addEquityCurve(trades: BacktestTrade[]): void {
    if (!this.chart) return;

    const equityData: LineData[] = [];
    let balance = this.initialCapital;

    // Add starting point
    if (trades.length > 0 && trades[0].entryTime) {
      equityData.push({
        time: Math.floor(trades[0].entryTime / 1000) as any,
        value: balance,
      });
    }

    // Add points for each closed trade
    for (const trade of trades) {
      if (!trade.isOpen && trade.exitTime) {
        balance += (trade.profit || 0);
        equityData.push({
          time: Math.floor(trade.exitTime / 1000) as any,
          value: balance,
        });
      }
    }

    if (equityData.length > 0) {
      const equitySeries = this.chart.addSeries(LineSeries, {
        color: '#2196F3',
        lineWidth: 2,
        title: 'Equity Curve',
        priceScaleId: 'equity',
      });

      equitySeries.setData(equityData);

      this.chart.priceScale('equity').applyOptions({
        visible: false,
      });
    }
  }

  getStrategyName(strategyId: string): string {
    const strategy = this.strategies.find(s => s.id === strategyId);
    return strategy ? strategy.name : '';
  }

  formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  getTradeColor(trade: BacktestTrade): string {
    if (!trade.profit) return '';
    return trade.profit > 0 ? 'profit' : 'loss';
  }

  async runMultiTimeframeBacktest(): Promise<void> {
    if (!this.selectedStrategy) {
      alert('Please select a strategy');
      return;
    }

    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
    if (!strategy) return;

    this.isRunning = true;
    this.isLoading = true;
    this.multiTimeframeResults = [];
    this.bestTimeframe = null;
    this.results = null; // Clear single result view

    try {
      const timeframesToTest = this.intervals.map(i => i.value);
      const results: Array<BacktestResults & { timeframe: string }> = [];

      for (const timeframe of timeframesToTest) {
        console.log(`Running backtest for ${timeframe}...`);

        // Adjust limit and minimum candles based on timeframe
        const timeframeConfig = this.getTimeframeConfig(timeframe);

        // Fetch candles for this timeframe
        const candles = await this.binanceService.getCandles(
          this.selectedSymbol,
          timeframe,
          timeframeConfig.limit
        );

        console.log(`Fetched ${candles?.length || 0} candles for ${timeframe}`);

        if (!candles || candles.length < timeframeConfig.minCandles) {
          console.warn(`Insufficient data for ${timeframe}: got ${candles?.length || 0}, need ${timeframeConfig.minCandles}`);
          continue;
        }

        // Run backtest
        const result = this.backtestingService.runBacktest(
          strategy,
          candles,
          this.initialCapital
        );

        results.push({
          ...result,
          timeframe: timeframe
        });
      }

      this.multiTimeframeResults = results.sort((a, b) => b.sharpeRatio - a.sharpeRatio);

      // Determine best timeframe based on multiple factors
      this.bestTimeframe = this.determineBestTimeframe(this.multiTimeframeResults);

      console.log('Multi-timeframe backtest complete:', this.multiTimeframeResults);
      console.log('Best timeframe:', this.bestTimeframe);

    } catch (error) {
      console.error('Multi-timeframe backtest error:', error);
      alert('Error running multi-timeframe backtest. Check console for details.');
    } finally {
      this.isRunning = false;
      this.isLoading = false;
    }
  }

  private getTimeframeConfig(timeframe: string): { limit: number; minCandles: number } {
    // Configure limits and minimum candles based on timeframe
    // Longer timeframes need fewer candles for statistical significance
    switch (timeframe) {
      case '1m':
        return { limit: 1000, minCandles: 100 };
      case '5m':
        return { limit: 1000, minCandles: 100 };
      case '15m':
        return { limit: 500, minCandles: 50 };
      case '1h':
        return { limit: 500, minCandles: 50 };
      case '4h':
        return { limit: 500, minCandles: 30 }; // 30 candles = 5 days of data
      case '1d':
        return { limit: 500, minCandles: 20 }; // 20 candles = 20 days of data
      default:
        return { limit: 500, minCandles: 50 };
    }
  }

  private determineBestTimeframe(results: Array<BacktestResults & { timeframe: string }>): (BacktestResults & { timeframe: string }) | null {
    if (results.length === 0) return null;

    // Score each timeframe based on multiple factors
    const scored = results.map(r => {
      let score = 0;

      // Profitability (40% weight)
      if (r.totalProfit > 0) {
        score += (r.totalProfitPercent / 100) * 40;
      }

      // Sharpe Ratio (30% weight)
      score += Math.max(0, r.sharpeRatio) * 30;

      // Win Rate (15% weight)
      score += (r.winRate / 100) * 15;

      // Profit Factor (15% weight)
      score += Math.max(0, (r.profitFactor - 1)) * 15;

      // Penalty for high drawdown
      score -= Math.abs(r.maxDrawdownPercent / 100) * 10;

      // Bonus for having enough trades (statistical significance)
      if (r.totalTrades >= 20) {
        score += 5;
      }

      return { ...r, score };
    });

    // Sort by score and return the best
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  exportResults(): void {
    if (!this.results) return;

    const data = {
      strategy: this.getStrategyName(this.selectedStrategy || ''),
      symbol: this.selectedSymbol,
      interval: this.selectedInterval,
      initialCapital: this.initialCapital,
      results: this.results,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-${this.selectedSymbol}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Optimization Methods

  toggleOptimization(): void {
    this.showOptimization = !this.showOptimization;

    if (this.showOptimization && this.parameterRanges.length === 0) {
      this.initializeParameterRanges();
    }
  }

  initializeParameterRanges(): void {
    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
    if (!strategy) return;

    this.parameterRanges = [];

    // Add common parameter ranges based on strategy parameters
    if (strategy.parameters.useRSI) {
      this.parameterRanges.push(
        { name: 'rsiPeriod', min: 7, max: 21, step: 2, type: 'integer' },
        { name: 'rsiOverbought', min: 65, max: 80, step: 5, type: 'integer' },
        { name: 'rsiOversold', min: 20, max: 35, step: 5, type: 'integer' }
      );
    }

    if (strategy.parameters.useSMA) {
      this.parameterRanges.push(
        { name: 'smaFastPeriod', min: 5, max: 20, step: 5, type: 'integer' },
        { name: 'smaSlowPeriod', min: 20, max: 50, step: 10, type: 'integer' }
      );
    }

    // Risk parameters (common for all strategies)
    this.parameterRanges.push(
      { name: 'stopLossPercent', min: 1, max: 5, step: 1, type: 'decimal' },
      { name: 'takeProfitPercent', min: 2, max: 10, step: 2, type: 'decimal' }
    );
  }

  addParameterRange(): void {
    this.parameterRanges.push({
      name: 'customParam',
      min: 0,
      max: 100,
      step: 1,
      type: 'integer'
    });
  }

  removeParameterRange(index: number): void {
    this.parameterRanges.splice(index, 1);
  }

  async runOptimization(): Promise<void> {
    if (!this.selectedStrategy) {
      alert('Please select a strategy');
      return;
    }

    if (this.parameterRanges.length === 0) {
      alert('Please add at least one parameter range');
      return;
    }

    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
    if (!strategy) return;

    // Estimate optimization time
    const estimate = this.optimizationService.estimateOptimizationTime(this.parameterRanges);

    const confirmMsg = `This optimization will test ${estimate.combinations} parameter combinations.\n` +
                      `Estimated time: ~${Math.ceil(estimate.estimatedSeconds)}s\n\n` +
                      `Continue?`;

    if (!confirm(confirmMsg)) return;

    this.isRunning = true;
    this.isLoading = true;
    this.optimizationResults = [];

    // Subscribe to progress
    const progressSub = this.optimizationService.getProgress().subscribe(progress => {
      this.optimizationProgress = progress;
    });

    this.subscriptions.push(progressSub);

    try {
      const config: OptimizationConfig = {
        strategyId: strategy.id,
        symbol: this.selectedSymbol,
        timeframe: this.selectedInterval,
        initialCapital: this.initialCapital,
        dataPoints: 500,
        parameters: this.parameterRanges,
        optimizationMetric: this.selectedOptimizationMetric
      };

      this.optimizationResults = await this.optimizationService.runGridSearch(config, strategy);

      console.log(`✅ Optimization complete. Found ${this.optimizationResults.length} results`);
      alert(`Optimization complete! Best score: ${this.optimizationResults[0]?.score.toFixed(4)}`);

    } catch (error) {
      console.error('Optimization error:', error);
      alert('Error running optimization. Check console for details.');
    } finally {
      this.isRunning = false;
      this.isLoading = false;
    }
  }

  cancelOptimization(): void {
    this.optimizationService.cancelOptimization();
  }

  applyBestParameters(): void {
    if (this.optimizationResults.length === 0) return;

    const best = this.optimizationResults[0];
    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);

    if (!strategy) return;

    // Apply best parameters to strategy
    const updatedParams = { ...strategy.parameters };
    for (const [key, value] of Object.entries(best.parameters)) {
      updatedParams[key] = value;
    }

    // Update strategy
    this.strategyService.updateStrategy(strategy.id, { parameters: updatedParams });

    alert('Best parameters applied to strategy!');
  }

  getOptimizationMetricLabel(metric: OptimizationMetric): string {
    const labels: { [key in OptimizationMetric]: string } = {
      [OptimizationMetric.TOTAL_PROFIT]: 'Total Profit ($)',
      [OptimizationMetric.TOTAL_PROFIT_PERCENT]: 'Total Profit (%)',
      [OptimizationMetric.SHARPE_RATIO]: 'Sharpe Ratio',
      [OptimizationMetric.PROFIT_FACTOR]: 'Profit Factor',
      [OptimizationMetric.WIN_RATE]: 'Win Rate (%)',
      [OptimizationMetric.MAX_DRAWDOWN]: 'Max Drawdown (%)',
      [OptimizationMetric.COMPOSITE_SCORE]: 'Composite Score'
    };
    return labels[metric];
  }

  formatOptimizationScore(score: number, metric: OptimizationMetric): string {
    if (metric === OptimizationMetric.TOTAL_PROFIT) {
      return `$${score.toFixed(2)}`;
    } else if (metric === OptimizationMetric.TOTAL_PROFIT_PERCENT ||
               metric === OptimizationMetric.WIN_RATE ||
               metric === OptimizationMetric.MAX_DRAWDOWN) {
      return `${score.toFixed(2)}%`;
    } else {
      return score.toFixed(4);
    }
  }

  getParameterName(name: string): string {
    const names: { [key: string]: string } = {
      'rsiPeriod': 'RSI Period',
      'rsiOverbought': 'RSI Overbought',
      'rsiOversold': 'RSI Oversold',
      'smaPeriod': 'SMA Period',
      'smaFastPeriod': 'SMA Fast',
      'smaSlowPeriod': 'SMA Slow',
      'stopLossPercent': 'Stop Loss %',
      'takeProfitPercent': 'Take Profit %',
      'positionSize': 'Position Size',
      'macdFastPeriod': 'MACD Fast',
      'macdSlowPeriod': 'MACD Slow',
      'macdSignalPeriod': 'MACD Signal',
      'bollingerPeriod': 'Bollinger Period',
      'bollingerStdDev': 'Bollinger Std Dev',
      'atrPeriod': 'ATR Period',
      'atrMultiplier': 'ATR Multiplier'
    };
    return names[name] || name;
  }
}
