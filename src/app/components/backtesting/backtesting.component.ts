import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { createChart, IChartApi, CandlestickSeries, LineSeries, LineData, CandlestickData, createSeriesMarkers } from 'lightweight-charts';

import { BacktestingService, BacktestResults, BacktestTrade, BacktestSignal } from '../../services/backtesting.service';
import { StrategyService } from '../../services/strategy.service';
import { BinanceService } from '../../services/binance.service';
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

  constructor(
    private backtestingService: BacktestingService,
    private strategyService: StrategyService,
    private binanceService: BinanceService
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

        // Fetch candles for this timeframe
        const candles = await this.binanceService.getCandles(
          this.selectedSymbol,
          timeframe,
          500 // Get more data for better results
        );

        if (!candles || candles.length < 50) {
          console.warn(`Insufficient data for ${timeframe}`);
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
}
