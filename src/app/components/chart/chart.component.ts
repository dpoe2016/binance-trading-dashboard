import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries, LineSeries, LineData, SeriesMarker } from 'lightweight-charts';

interface ICandlestickSeriesApiWithMarkers extends ISeriesApi<'Candlestick'> {
  setMarkers(markers: SeriesMarker<any>[]): void;
}

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
  @ViewChild('chartWrapper', { static: true }) chartWrapper!: ElementRef;
  @Input() symbol: string = 'BTCUSDT';

  private chart?: IChartApi;
  private rsiChart?: IChartApi;
  private candlestickSeries?: ICandlestickSeriesApiWithMarkers;
  private sma20Series?: ISeriesApi<'Line'>;
  private sma50Series?: ISeriesApi<'Line'>;
  private sma200Series?: ISeriesApi<'Line'>;
  private rsiSeries?: ISeriesApi<'Line'>;
  private signalMarkers: Array<{time: number, position: string, type: string, price: number}> = [];
  private chartResizeObserver?: ResizeObserver;
  private rsiChartResizeObserver?: ResizeObserver;
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
    if (this.chartResizeObserver) {
      this.chartResizeObserver.disconnect();
    }
    if (this.rsiChartResizeObserver) {
      this.rsiChartResizeObserver.disconnect();
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initChart(): void {
    const container = this.chartContainer.nativeElement;

    // Calculate initial height
    const containerHeight = container.clientHeight || 400;

    // Create chart with proper configuration
    this.chart = createChart(container, {
      width: this.chartWrapper.nativeElement.clientWidth,
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
        tickMarkFormatter: (time: any, tickMarkType: any, locale: string) => {
          // Convert UTC timestamp to local time for x-axis labels
          const date = new Date(time * 1000);

          // Different formatting based on tick mark type
          if (tickMarkType === 0) {
            // Year
            return date.getFullYear().toString();
          } else if (tickMarkType === 1) {
            // Month
            return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
          } else if (tickMarkType === 2) {
            // Day
            return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
          } else {
            // Time
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          }
        },
        rightOffset: 10, // Add a small offset to prevent price scale overlap
        alignLabelsAndScales: true, // Align time scale with other charts
      },
      localization: {
        locale: navigator.language,
        timeFormatter: (timestamp: number) => {
          // timestamp is in seconds (Unix timestamp)
          const date = new Date(timestamp * 1000);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        },
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
    }) as ICandlestickSeriesApiWithMarkers;

    // Handle container resize using ResizeObserver
    this.chartResizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === container && this.chart) {
          const { height } = entry.contentRect;
          this.chart.applyOptions({ width: this.chartWrapper.nativeElement.clientWidth, height });
        }
      }
    });
    this.chartResizeObserver.observe(container);
  }



  async loadChartData(): Promise<void> {
    try {
      const candles = await this.binanceService.getCandles(
        this.selectedSymbol,
        this.selectedInterval,
        500
      );

      this.currentCandles = candles;

      // Convert UTC timestamps to local time for display
      const chartData: CandlestickData[] = candles.map(c => {
        const utcTime = c.time;
        const localTime = Math.floor(utcTime / 1000) as any;
        return {
          time: localTime,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        };
      });

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

    // Update SMA 200 indicator
    if (strategy.parameters['useSMA200']) {
      const sma200Data = this.calculateSMAData(this.currentCandles, 200);
      if (this.sma200Series && sma200Data.length > 0) {
        this.sma200Series.update(sma200Data[sma200Data.length - 1]);
      }
    }

    // Update RSI indicator
    if (strategy.parameters['useRSI'] && this.rsiSeries) {
      const rsiData = this.calculateRSIData(this.currentCandles, 14);
      if (rsiData.length > 0) {
        this.rsiSeries.update(rsiData[rsiData.length - 1]);
        this.updateRsiPriceScale(rsiData);
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

    // Add SMA 200 line
    if (strategy.parameters['useSMA200']) {
      if (!this.sma200Series && this.chart) {
        this.sma200Series = this.chart.addSeries(LineSeries, {
          color: '#FF00FF', // Magenta color for SMA 200
          lineWidth: 2,
          title: 'SMA 200',
        });
      }

      if (this.sma200Series) {
        const sma200Data = this.calculateSMAData(this.currentCandles, 200);
        this.sma200Series.setData(sma200Data);
      }
    }

    // Add RSI indicator as subchart
    if (strategy.parameters['useRSI']) {
      // Use setTimeout to ensure DOM has updated before initializing RSI chart
      setTimeout(() => {
        this.initRSIChart();
        const rsiData = this.calculateRSIData(this.currentCandles, 14);

        if (this.rsiSeries) {
          this.rsiSeries.setData(rsiData);
          this.updateRsiPriceScale(rsiData);
        }

        // Auto-fit RSI chart
        if (this.rsiChart) {
          this.rsiChart.timeScale().fitContent();
        }

        // Hide time axis on main chart when RSI is visible
        if (this.chart && this.chartContainer) {
          this.chart.applyOptions({
            timeScale: {
              visible: false,
            },
          });
        }
      }, 100);
    }

    // Generate and add strategy signals as markers
    this.addStrategySignals(strategy);
  }

  private addStrategySignals(strategy: TradingStrategy): void {
    if (!this.candlestickSeries || this.currentCandles.length === 0) return;

    this.signalMarkers = [];
    let buySignals = 0;
    let sellSignals = 0;

    // RSI Strategy signals
    if (strategy.parameters['useRSI']) {
      const rsiData = this.calculateRSIData(this.currentCandles, 14);

      for (let i = 1; i < rsiData.length; i++) {
        const prevRSI = rsiData[i - 1].value;
        const currRSI = rsiData[i].value;
        const candle = this.currentCandles[i + 14]; // Offset by RSI period

        // Buy signal: RSI crosses below 30 (oversold)
        if (prevRSI >= 30 && currRSI < 30) {
          this.signalMarkers.push({
            time: Math.floor(candle.time / 1000),
            position: 'belowBar',
            type: 'BUY',
            price: candle.low
          });
          buySignals++;
        }

        // Sell signal: RSI crosses above 70 (overbought)
        if (prevRSI <= 70 && currRSI > 70) {
          this.signalMarkers.push({
            time: Math.floor(candle.time / 1000),
            position: 'aboveBar',
            type: 'SELL',
            price: candle.high
          });
          sellSignals++;
        }
      }
    }

    // SMA Strategy signals (SMA crossover)
    if (strategy.parameters['useSMA'] !== false) {
      const sma20Data = this.calculateSMAData(this.currentCandles, 20);
      const sma50Data = this.calculateSMAData(this.currentCandles, 50);

      for (let i = 1; i < Math.min(sma20Data.length, sma50Data.length); i++) {
        const prevSMA20 = sma20Data[i - 1].value;
        const prevSMA50 = sma50Data[i - 1].value;
        const currSMA20 = sma20Data[i].value;
        const currSMA50 = sma50Data[i].value;
        const candle = this.currentCandles[i + 19]; // Offset by SMA period

        // Golden cross: SMA20 crosses above SMA50 (bullish)
        if (prevSMA20 <= prevSMA50 && currSMA20 > currSMA50) {
          this.signalMarkers.push({
            time: Math.floor(candle.time / 1000),
            position: 'belowBar',
            type: 'GOLDEN_CROSS',
            price: candle.low
          });
          buySignals++;
        }

        // Death cross: SMA20 crosses below SMA50 (bearish)
        if (prevSMA20 >= prevSMA50 && currSMA20 < currSMA50) {
          this.signalMarkers.push({
            time: Math.floor(candle.time / 1000),
            position: 'aboveBar',
            type: 'DEATH_CROSS',
            price: candle.high
          });
          sellSignals++;
        }
      }
    }

    // Log signals found
    if (this.signalMarkers.length > 0) {
      console.log(`📊 Strategy signals detected: ${buySignals} buy signals, ${sellSignals} sell signals`);
    }

    // Apply markers to the candlestick series
    if (this.candlestickSeries) {
      if (typeof this.candlestickSeries.setMarkers === 'function') {
        this.candlestickSeries.setMarkers(this.signalMarkers.map(marker => ({
          time: marker.time,
          position: marker.position as any,
          color: marker.type === 'BUY' || marker.type === 'GOLDEN_CROSS' ? '#22c55e' : '#ef4444',
          shape: marker.type === 'BUY' || marker.type === 'GOLDEN_CROSS' ? 'arrowUp' : 'arrowDown',
          text: marker.type
        })));
      } else {
        console.error("Error: setMarkers function not found on candlestickSeries. Cannot display markers.");
      }
    }
  }

  private clearStrategyIndicators(): void {
    // Clear signal markers
    this.signalMarkers = [];

    // Clear signal markers from chart
    if (this.candlestickSeries) {
      if (typeof this.candlestickSeries.setMarkers === 'function') {
        this.candlestickSeries.setMarkers([]);
      } else {
        console.error("Error: setMarkers function not found on candlestickSeries. Cannot clear markers.");
      }
    }

    if (this.sma20Series && this.chart) {
      this.chart.removeSeries(this.sma20Series);
      this.sma20Series = undefined;
    }

    if (this.sma50Series && this.chart) {
      this.chart.removeSeries(this.sma50Series);
      this.sma50Series = undefined;
    }

    // Clear SMA 200 series
    if (this.sma200Series && this.chart) {
      this.chart.removeSeries(this.sma200Series);
      this.sma200Series = undefined;
    }

    if (this.sma200Series && this.chart) {
      this.chart.removeSeries(this.sma200Series);
      this.sma200Series = undefined;
    }

    // Clear RSI chart and series
    if (this.rsiSeries && this.rsiChart) {
      this.rsiChart.removeSeries(this.rsiSeries);
      this.rsiSeries = undefined;
    }

    if (this.rsiChart) {
      this.rsiChart.remove();
      this.rsiChart = undefined;

      // Show time axis on main chart again when RSI is removed
      if (this.chart && this.chartContainer) {
        this.chart.applyOptions({
          timeScale: {
            visible: true,
          },
        });
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
      width: this.chartWrapper.nativeElement.clientWidth,
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
        visible: true,
        borderVisible: true,
        tickMarkFormatter: (time: any, tickMarkType: any, locale: string) => {
          // Convert UTC timestamp to local time for x-axis labels
          const date = new Date(time * 1000);

          // Different formatting based on tick mark type
          if (tickMarkType === 0) {
            // Year
            return date.getFullYear().toString();
          } else if (tickMarkType === 1) {
            // Month
            return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
          } else if (tickMarkType === 2) {
            // Day
            return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
          } else {
            // Time
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          }
        },
        rightOffset: 10, // Add a small offset to prevent price scale overlap
        alignLabelsAndScales: true, // Align time scale with other charts
      },
      rightPriceScale: {
        borderVisible: true,
      },
      localization: {
        locale: navigator.language,
        timeFormatter: (timestamp: number) => {
          // timestamp is in seconds (Unix timestamp)
          const date = new Date(timestamp * 1000);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        },
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

    // Handle container resize using ResizeObserver
    this.rsiChartResizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === container && this.rsiChart) {
          this.rsiChart.applyOptions({ width: this.chartWrapper.nativeElement.clientWidth });
        }
      }
    });
    this.rsiChartResizeObserver.observe(container);
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

  private updateRsiPriceScale(rsiData: LineData[]): void {
    if (!this.rsiSeries || rsiData.length === 0) return;

    const values = rsiData.map(d => d.value);
    const minRsi = Math.min(...values);
    const maxRsi = Math.max(...values);

    // Add some padding to the min/max values
    const padding = (maxRsi - minRsi) * 0.1; // 10% padding
    const minValue = Math.max(0, minRsi - padding);
    const maxValue = Math.min(100, maxRsi + padding);

    this.rsiSeries.applyOptions({
      autoscaleInfoProvider: () => ({
        priceRange: {
          minValue: minValue,
          maxValue: maxValue,
        },
      }),
    } as any);
  }
}
