import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries, LineSeries, LineData } from 'lightweight-charts';
import { BinanceService } from '../../services/binance.service';
import { StrategyService } from '../../services/strategy.service';
import { SettingsService } from '../../services/settings.service';
import { TradingStrategy, Candle } from '../../models/trading.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  @ViewChild('rsiContainer') rsiContainer?: ElementRef;
  @Input() symbol: string = 'BTCUSDT';

  private chart?: IChartApi;
  private rsiChart?: IChartApi;
  private candlestickSeries?: ISeriesApi<'Candlestick'>;
  private sma20Series?: ISeriesApi<'Line'>;
  private sma50Series?: ISeriesApi<'Line'>;
  private rsiSeries?: ISeriesApi<'Line'>;
  private priceUpdateCleanup?: () => void;
  private subscriptions: Subscription[] = [];

  selectedSymbol: string = 'BTCUSDT';
  selectedInterval: string = '15m';
  selectedStrategy: string | null = null;
  strategies: TradingStrategy[] = [];
  isLiveUpdating: boolean = false;

  private currentCandles: Candle[] = [];

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
    private binanceService: BinanceService,
    private strategyService: StrategyService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    // Load saved settings
    const chartSettings = this.settingsService.getChartSettings();
    this.selectedSymbol = chartSettings.selectedSymbol || this.symbol;
    this.selectedInterval = chartSettings.selectedInterval;
    this.selectedStrategy = chartSettings.selectedStrategy;

    this.initChart();
    this.loadChartData();
    this.loadStrategies();
  }

  ngOnDestroy(): void {
    if (this.priceUpdateCleanup) {
      this.priceUpdateCleanup();
    }
    if (this.chart) {
      this.chart.remove();
    }
    if (this.rsiChart) {
      this.rsiChart.remove();
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initChart(): void {
    const container = this.chartContainer.nativeElement;

    // Calculate initial height
    const containerHeight = container.clientHeight || 400;

    // Create chart with proper configuration
    this.chart = createChart(container, {
      width: container.clientWidth,
      height: containerHeight,
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
        visible: true,
      },
    });

    // Add candlestick series using the correct v5.x API
    // In v5.x, you must pass the SeriesDefinition (CandlestickSeries) as the first parameter
    this.candlestickSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    if (this.chart && this.chartContainer) {
      const height = this.rsiChart
        ? this.chartContainer.nativeElement.clientHeight
        : this.chartContainer.nativeElement.clientHeight;

      this.chart.applyOptions({
        width: this.chartContainer.nativeElement.clientWidth,
        height: height,
      });
    }

    if (this.rsiChart && this.rsiContainer) {
      this.rsiChart.applyOptions({
        width: this.rsiContainer.nativeElement.clientWidth,
      });
    }
  }

  async loadChartData(): Promise<void> {
    try {
      const candles = await this.binanceService.getCandles(
        this.selectedSymbol,
        this.selectedInterval,
        500
      );

      this.currentCandles = candles;

      const chartData: CandlestickData[] = candles.map(c => ({
        time: Math.floor(c.time / 1000) as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      if (this.candlestickSeries) {
        this.candlestickSeries.setData(chartData);
      }

      // Update strategy indicators if selected
      if (this.selectedStrategy) {
        this.updateStrategyIndicators();
      }

      // Auto-scale chart to fit all data
      if (this.chart) {
        this.chart.timeScale().fitContent();
      }

      // Subscribe to real-time updates
      this.subscribeToUpdates();
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  }

  private subscribeToUpdates(): void {
    // Clean up previous subscription
    if (this.priceUpdateCleanup) {
      this.priceUpdateCleanup();
      this.isLiveUpdating = false;
    }

    // Subscribe to price updates
    this.priceUpdateCleanup = this.binanceService.subscribeToPriceUpdates(
      this.selectedSymbol,
      (price: string) => {
        this.isLiveUpdating = true;
        this.updateLastCandle(parseFloat(price));
      }
    );
  }

  private updateLastCandle(currentPrice: number): void {
    if (!this.candlestickSeries || this.currentCandles.length === 0) return;

    const lastCandle = this.currentCandles[this.currentCandles.length - 1];
    const lastTime = Math.floor(lastCandle.time / 1000) as any;

    // Update the last candle with new price
    const updatedCandle: CandlestickData = {
      time: lastTime,
      open: lastCandle.open,
      high: Math.max(lastCandle.high, currentPrice),
      low: Math.min(lastCandle.low, currentPrice),
      close: currentPrice,
    };

    // Update the candle in the series
    this.candlestickSeries.update(updatedCandle);

    // Update the last candle in our data array
    lastCandle.close = currentPrice;
    lastCandle.high = Math.max(lastCandle.high, currentPrice);
    lastCandle.low = Math.min(lastCandle.low, currentPrice);

    // Update indicators if strategy is active
    if (this.selectedStrategy) {
      this.updateIndicatorsRealtime();
    }
  }

  private updateIndicatorsRealtime(): void {
    if (!this.selectedStrategy || this.currentCandles.length === 0) return;

    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
    if (!strategy) return;

    // Update SMA indicators
    if (strategy.parameters['useSMA'] !== false) {
      const sma20Data = this.calculateSMAData(this.currentCandles, 20);
      const sma50Data = this.calculateSMAData(this.currentCandles, 50);

      if (this.sma20Series && sma20Data.length > 0) {
        this.sma20Series.update(sma20Data[sma20Data.length - 1]);
      }

      if (this.sma50Series && sma50Data.length > 0) {
        this.sma50Series.update(sma50Data[sma50Data.length - 1]);
      }
    }

    // Update RSI indicator
    if (strategy.parameters['useRSI'] && this.rsiSeries) {
      const rsiData = this.calculateRSIData(this.currentCandles, 14);
      if (rsiData.length > 0) {
        this.rsiSeries.update(rsiData[rsiData.length - 1]);
      }
    }
  }

  onSymbolChange(): void {
    this.loadChartData();
    this.settingsService.saveChartSettings({ selectedSymbol: this.selectedSymbol });
  }

  onIntervalChange(): void {
    this.loadChartData();
    this.settingsService.saveChartSettings({ selectedInterval: this.selectedInterval });
  }

  private loadStrategies(): void {
    this.subscriptions.push(
      this.strategyService.getStrategies().subscribe(strategies => {
        this.strategies = strategies;
      })
    );
  }

  onStrategyChange(): void {
    // Save strategy selection
    this.settingsService.saveChartSettings({ selectedStrategy: this.selectedStrategy });

    if (this.selectedStrategy) {
      const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
      if (strategy) {
        // Apply all strategy parameters
        if (strategy.symbol !== this.selectedSymbol) {
          this.selectedSymbol = strategy.symbol;
        }
        if (strategy.timeframe !== this.selectedInterval) {
          this.selectedInterval = strategy.timeframe;
        }
        // Reload chart with strategy's parameters
        this.loadChartData();
      } else {
        this.updateStrategyIndicators();
      }
    } else {
      // Clear strategy indicators
      this.clearStrategyIndicators();
    }
  }

  private updateStrategyIndicators(): void {
    if (!this.selectedStrategy || this.currentCandles.length === 0) return;

    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
    if (!strategy) return;

    // Calculate indicators
    const closes = this.currentCandles.map(c => c.close);

    // Add SMA lines
    if (strategy.parameters['useSMA'] !== false) {
      const sma20Data = this.calculateSMAData(this.currentCandles, 20);
      const sma50Data = this.calculateSMAData(this.currentCandles, 50);

      if (!this.sma20Series && this.chart) {
        this.sma20Series = this.chart.addSeries(LineSeries, {
          color: '#2196F3',
          lineWidth: 2,
          title: 'SMA 20',
        });
      }

      if (!this.sma50Series && this.chart) {
        this.sma50Series = this.chart.addSeries(LineSeries, {
          color: '#FF9800',
          lineWidth: 2,
          title: 'SMA 50',
        });
      }

      if (this.sma20Series) {
        this.sma20Series.setData(sma20Data);
      }

      if (this.sma50Series) {
        this.sma50Series.setData(sma50Data);
      }
    }

    // Add RSI indicator as subchart
    if (strategy.parameters['useRSI']) {
      this.initRSIChart();
      const rsiData = this.calculateRSIData(this.currentCandles, 14);

      if (this.rsiSeries) {
        this.rsiSeries.setData(rsiData);
      }

      // Auto-fit RSI chart
      if (this.rsiChart) {
        this.rsiChart.timeScale().fitContent();
      }

      // Hide time axis on main chart when RSI is visible and resize
      if (this.chart && this.chartContainer) {
        this.chart.applyOptions({
          timeScale: {
            visible: false,
          },
        });

        // Trigger resize after DOM updates
        setTimeout(() => {
          if (this.chart && this.chartContainer) {
            const newHeight = this.chartContainer.nativeElement.clientHeight;
            this.chart.applyOptions({
              height: newHeight,
            });
          }
        }, 0);
      }
    }
  }

  private clearStrategyIndicators(): void {
    if (this.sma20Series && this.chart) {
      this.chart.removeSeries(this.sma20Series);
      this.sma20Series = undefined;
    }

    if (this.sma50Series && this.chart) {
      this.chart.removeSeries(this.sma50Series);
      this.sma50Series = undefined;
    }

    if (this.rsiChart) {
      this.rsiChart.remove();
      this.rsiChart = undefined;
      this.rsiSeries = undefined;

      // Show time axis on main chart again when RSI is removed and resize
      if (this.chart && this.chartContainer) {
        this.chart.applyOptions({
          timeScale: {
            visible: true,
          },
        });

        // Trigger resize after DOM updates
        setTimeout(() => {
          if (this.chart && this.chartContainer) {
            const newHeight = this.chartContainer.nativeElement.clientHeight;
            this.chart.applyOptions({
              height: newHeight,
            });
          }
        }, 0);
      }
    }
  }

  private calculateSMAData(candles: Candle[], period: number): LineData[] {
    const data: LineData[] = [];

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      const sma = sum / period;

      data.push({
        time: Math.floor(candles[i].time / 1000) as any,
        value: sma,
      });
    }

    return data;
  }

  getStrategyName(strategyId: string): string {
    const strategy = this.strategies.find(s => s.id === strategyId);
    return strategy ? strategy.name : '';
  }

  hasRSIIndicator(): boolean {
    if (!this.selectedStrategy) return false;
    const strategy = this.strategies.find(s => s.id === this.selectedStrategy);
    return strategy ? !!strategy.parameters['useRSI'] : false;
  }

  private initRSIChart(): void {
    if (this.rsiChart || !this.rsiContainer) return;

    const container = this.rsiContainer.nativeElement;

    this.rsiChart = createChart(container, {
      width: container.clientWidth,
      height: 180,
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
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    this.rsiSeries = this.rsiChart.addSeries(LineSeries, {
      color: '#9C27B0',
      lineWidth: 2,
      title: 'RSI (14)',
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: true,
    });

    // Set fixed price scale for RSI (0-100)
    this.rsiSeries.applyOptions({
      autoscaleInfoProvider: () => ({
        priceRange: {
          minValue: 0,
          maxValue: 100,
        },
      }),
    } as any);

    // Synchronize time scales with main chart
    if (this.chart) {
      const mainTimeScale = this.chart.timeScale();
      const rsiTimeScale = this.rsiChart.timeScale();

      // Sync from main chart to RSI chart
      mainTimeScale.subscribeVisibleLogicalRangeChange(() => {
        const logicalRange = mainTimeScale.getVisibleLogicalRange();
        if (logicalRange) {
          rsiTimeScale.setVisibleLogicalRange(logicalRange);
        }
      });

      // Sync from RSI chart to main chart
      rsiTimeScale.subscribeVisibleLogicalRangeChange(() => {
        const logicalRange = rsiTimeScale.getVisibleLogicalRange();
        if (logicalRange) {
          mainTimeScale.setVisibleLogicalRange(logicalRange);
        }
      });
    }

    // Handle window resize for RSI chart
    window.addEventListener('resize', () => {
      if (this.rsiChart && this.rsiContainer) {
        this.rsiChart.applyOptions({
          width: this.rsiContainer.nativeElement.clientWidth,
        });
      }
    });
  }

  private calculateRSIData(candles: Candle[], period: number = 14): LineData[] {
    const data: LineData[] = [];
    const closes = candles.map(c => c.close);

    if (closes.length < period + 1) return data;

    // Calculate RSI
    for (let i = period; i < closes.length; i++) {
      let gains = 0;
      let losses = 0;

      for (let j = i - period; j < i; j++) {
        const change = closes[j + 1] - closes[j];
        if (change > 0) {
          gains += change;
        } else {
          losses += Math.abs(change);
        }
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      data.push({
        time: Math.floor(candles[i].time / 1000) as any,
        value: rsi,
      });
    }

    return data;
  }
}
