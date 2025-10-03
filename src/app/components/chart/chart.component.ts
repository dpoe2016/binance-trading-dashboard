import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries, LineSeries, LineData, HistogramSeries, HistogramData, createSeriesMarkers } from 'lightweight-charts';

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
  @ViewChild('chartWrapper', { static: true }) chartWrapper!: ElementRef;
  @Input() symbol: string = 'BTCUSDT';

  private chart?: IChartApi;
  private candlestickSeries?: any;
  private sma20Series?: any;
  private sma50Series?: any;
  private sma200Series?: any;
  private rsiSeries?: any;
  private aroonUpSeries?: any;
  private aroonDownSeries?: any;
  private macdLineSeries?: any;
  private macdSignalSeries?: any;
  private macdHistogramSeries?: any;
  private choppinessSeries?: any;
  private bbUpperSeries?: any;
  private bbMiddleSeries?: any;
  private bbLowerSeries?: any;
  private seriesMarkers?: any; // v5 marker primitive
  private signalMarkers: Array<{time: number, position: string, type: string, price: number}> = [];
  private chartResizeObserver?: ResizeObserver;
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
    if (this.chartResizeObserver) {
      this.chartResizeObserver.disconnect();
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initChart(): void {
    const container = this.chartContainer.nativeElement;

    // Calculate initial height
    const containerHeight = container.clientHeight || 400;

    // Create chart with proper configuration
    this.chart = createChart(container, {
      width: this.chartWrapper.nativeElement.clientWidth - 40,
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
    });

    // Handle container resize using ResizeObserver
    this.chartResizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === container && this.chart) {
          const { height } = entry.contentRect;
          this.chart.applyOptions({ width: this.chartWrapper.nativeElement.clientWidth - 40, height });
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
      }
    }

    // Update Aroon indicator
    if (strategy.parameters['useAroon'] && this.aroonUpSeries && this.aroonDownSeries) {
      const aroonPeriod = strategy.parameters['aroonPeriod'] || 25;
      const aroonData = this.calculateAroonData(this.currentCandles, aroonPeriod);
      if (aroonData.aroonUp.length > 0 && aroonData.aroonDown.length > 0) {
        this.aroonUpSeries.update(aroonData.aroonUp[aroonData.aroonUp.length - 1]);
        this.aroonDownSeries.update(aroonData.aroonDown[aroonData.aroonDown.length - 1]);
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

    // Add Bollinger Bands
    if (strategy.parameters['useBollingerBands']) {
      console.log('📊 Adding Bollinger Bands to chart');
      const bbPeriod = strategy.parameters['bbPeriod'] || 20;
      const bbStdDev = strategy.parameters['bbStdDev'] || 2;
      const bbData = this.calculateBollingerBands(this.currentCandles, bbPeriod, bbStdDev);
      console.log(`📊 Bollinger Bands data calculated: ${bbData.middle.length} data points`);

      // Add Upper Band
      if (!this.bbUpperSeries && this.chart) {
        this.bbUpperSeries = this.chart.addSeries(LineSeries, {
          color: 'rgba(33, 150, 243, 0.5)', // Semi-transparent blue
          lineWidth: 1,
          title: 'BB Upper',
          lastValueVisible: false,
          priceLineVisible: false,
        }, 0); // Same pane as price (pane 0)
        console.log('📊 BB Upper series added to chart');
      }

      // Add Middle Band (SMA)
      if (!this.bbMiddleSeries && this.chart) {
        this.bbMiddleSeries = this.chart.addSeries(LineSeries, {
          color: 'rgba(33, 150, 243, 0.8)', // Blue
          lineWidth: 1,
          lineStyle: 2, // Dashed line
          title: 'BB Middle',
          lastValueVisible: false,
          priceLineVisible: false,
        }, 0); // Same pane as price
        console.log('📊 BB Middle series added to chart');
      }

      // Add Lower Band
      if (!this.bbLowerSeries && this.chart) {
        this.bbLowerSeries = this.chart.addSeries(LineSeries, {
          color: 'rgba(33, 150, 243, 0.5)', // Semi-transparent blue
          lineWidth: 1,
          title: 'BB Lower',
          lastValueVisible: false,
          priceLineVisible: false,
        }, 0); // Same pane as price
        console.log('📊 BB Lower series added to chart');
      }

      // Set data for Bollinger Bands
      if (this.bbUpperSeries && bbData.upper.length > 0) {
        this.bbUpperSeries.setData(bbData.upper);
        console.log('📊 BB Upper data set');
      }

      if (this.bbMiddleSeries && bbData.middle.length > 0) {
        this.bbMiddleSeries.setData(bbData.middle);
        console.log('📊 BB Middle data set');
      }

      if (this.bbLowerSeries && bbData.lower.length > 0) {
        this.bbLowerSeries.setData(bbData.lower);
        console.log('📊 BB Lower data set');
      }
    } else {
      console.log('📊 Bollinger Bands not enabled in strategy parameters:', strategy.parameters);
    }

    // Add RSI indicator as subchart
    if (strategy.parameters['useRSI']) {
      // Add RSI series to the main chart on a new price scale
      if (!this.rsiSeries && this.chart) {
        this.rsiSeries = this.chart.addSeries(LineSeries, {
          color: '#9C27B0',
          lineWidth: 2,
          title: 'RSI (14)',
          priceScaleId: 'right', // Use the default right price scale
          lastValueVisible: true,
          priceLineVisible: true,
        }, 1); // Move to a new pane
      }

      const rsiData = this.calculateRSIData(this.currentCandles, 14);
      if (this.rsiSeries) {
        this.rsiSeries.setData(rsiData);
      }
    }

    // Add Aroon indicator as subchart
    if (strategy.parameters['useAroon']) {
      console.log('📊 Adding Aroon indicator to chart');
      const aroonPeriod = strategy.parameters['aroonPeriod'] || 25;
      const aroonData = this.calculateAroonData(this.currentCandles, aroonPeriod);
      console.log(`📊 Aroon data calculated: ${aroonData.aroonUp.length} data points`);

      // Add Aroon Up series
      if (!this.aroonUpSeries && this.chart) {
        this.aroonUpSeries = this.chart.addSeries(LineSeries, {
          color: '#22c55e',
          lineWidth: 2,
          title: 'Aroon Up',
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: true,
        }, 2); // Move to a new pane (pane 2)
        console.log('📊 Aroon Up series added to chart');
      }

      // Add Aroon Down series
      if (!this.aroonDownSeries && this.chart) {
        this.aroonDownSeries = this.chart.addSeries(LineSeries, {
          color: '#ef4444',
          lineWidth: 2,
          title: 'Aroon Down',
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: true,
        }, 2); // Same pane as Aroon Up
        console.log('📊 Aroon Down series added to chart');
      }

      if (this.aroonUpSeries && aroonData.aroonUp.length > 0) {
        this.aroonUpSeries.setData(aroonData.aroonUp);
        console.log('📊 Aroon Up data set');
      }

      if (this.aroonDownSeries && aroonData.aroonDown.length > 0) {
        this.aroonDownSeries.setData(aroonData.aroonDown);
        console.log('📊 Aroon Down data set');
      }
    } else {
      console.log('📊 Aroon not enabled in strategy parameters:', strategy.parameters);
    }

    // Add MACD indicator as subchart
    if (strategy.parameters['useMACD']) {
      console.log('📊 Adding MACD indicator to chart');
      const macdFastPeriod = strategy.parameters['macdFastPeriod'] || 12;
      const macdSlowPeriod = strategy.parameters['macdSlowPeriod'] || 26;
      const macdSignalPeriod = strategy.parameters['macdSignalPeriod'] || 9;
      const macdData = this.calculateMACDData(this.currentCandles, macdFastPeriod, macdSlowPeriod, macdSignalPeriod);
      console.log(`📊 MACD data calculated: ${macdData.macdLine.length} data points`);

      // Add MACD Line series
      if (!this.macdLineSeries && this.chart) {
        this.macdLineSeries = this.chart.addSeries(LineSeries, {
          color: '#2962FF',
          lineWidth: 2,
          title: 'MACD',
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: true,
        }, 3); // New pane (pane 3)
        console.log('📊 MACD Line series added to chart');
      }

      // Add MACD Signal Line series
      if (!this.macdSignalSeries && this.chart) {
        this.macdSignalSeries = this.chart.addSeries(LineSeries, {
          color: '#FF6D00',
          lineWidth: 2,
          title: 'Signal',
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: true,
        }, 3); // Same pane as MACD line
        console.log('📊 MACD Signal series added to chart');
      }

      // Add MACD Histogram series
      if (!this.macdHistogramSeries && this.chart) {
        this.macdHistogramSeries = this.chart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'right',
        }, 3); // Same pane as MACD lines
        console.log('📊 MACD Histogram series added to chart');
      }

      // Set data for MACD series
      if (this.macdLineSeries && macdData.macdLine.length > 0) {
        this.macdLineSeries.setData(macdData.macdLine);
        console.log('📊 MACD Line data set');
      }

      if (this.macdSignalSeries && macdData.signalLine.length > 0) {
        this.macdSignalSeries.setData(macdData.signalLine);
        console.log('📊 MACD Signal data set');
      }

      if (this.macdHistogramSeries && macdData.histogram.length > 0) {
        // Convert LineData to HistogramData
        const histogramData: HistogramData[] = macdData.histogram.map(d => ({
          time: d.time,
          value: d.value,
          color: d.value >= 0 ? '#26a69a' : '#ef5350'
        }));
        this.macdHistogramSeries.setData(histogramData);
        console.log('📊 MACD Histogram data set');
      }
    } else {
      console.log('📊 MACD not enabled in strategy parameters:', strategy.parameters);
    }

    // Add Choppiness Index as subchart
    if (strategy.parameters['useChoppiness']) {
      console.log('📊 Adding Choppiness Index to chart');
      const choppinessPeriod = strategy.parameters['choppinessPeriod'] || 14;
      const choppinessData = this.calculateChoppinessIndex(this.currentCandles, choppinessPeriod);
      console.log(`📊 Choppiness Index data calculated: ${choppinessData.length} data points`);

      // Add Choppiness Index series with histogram
      if (!this.choppinessSeries && this.chart) {
        this.choppinessSeries = this.chart.addSeries(HistogramSeries, {
          priceFormat: {
            type: 'price',
            precision: 2,
          },
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: false,
        }, 4); // New pane (pane 4)
        console.log('📊 Choppiness Index series added to chart');
      }

      // Set data for Choppiness series with color coding
      if (this.choppinessSeries && choppinessData.length > 0) {
        // Convert LineData to HistogramData with color zones
        const histogramData: HistogramData[] = choppinessData.map(d => {
          let color: string;
          if (d.value > 61.8) {
            color = '#ef5350'; // Red: Choppy/Consolidating
          } else if (d.value < 38.2) {
            color = '#26a69a'; // Green: Trending
          } else {
            color = '#FFA726'; // Orange: Neutral
          }

          return {
            time: d.time,
            value: d.value,
            color: color
          };
        });

        this.choppinessSeries.setData(histogramData);
        console.log('📊 Choppiness Index data set with color zones');
      }
    } else {
      console.log('📊 Choppiness Index not enabled in strategy parameters:', strategy.parameters);
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
      const rsiOversold = strategy.parameters['rsiOversold'] || 30;
      const rsiOverbought = strategy.parameters['rsiOverbought'] || 70;

      for (let i = 1; i < rsiData.length; i++) {
        const prevRSI = rsiData[i - 1].value;
        const currRSI = rsiData[i].value;
        const candleIndex = i + 14; // Offset by RSI period

        // Check bounds
        if (candleIndex >= this.currentCandles.length) continue;
        const candle = this.currentCandles[candleIndex];

        // Buy signal: RSI crosses below oversold level
        if (prevRSI >= rsiOversold && currRSI < rsiOversold) {
          this.signalMarkers.push({
            time: Math.floor(candle.time / 1000),
            position: 'belowBar',
            type: 'BUY',
            price: candle.low
          });
          buySignals++;
        }

        // Sell signal: RSI crosses above overbought level
        if (prevRSI <= rsiOverbought && currRSI > rsiOverbought) {
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

      // Start from index 1 and ensure we don't go out of bounds
      const startIndex = 20; // SMA20 period
      for (let i = startIndex; i < this.currentCandles.length; i++) {
        const sma20Index = i - 20 + 1;
        const sma50Index = i - 50 + 1;

        // Skip if we don't have enough data for SMA50
        if (sma50Index < 1 || sma20Index < 1) continue;
        if (sma20Index >= sma20Data.length || sma50Index >= sma50Data.length) continue;

        const prevSMA20 = sma20Data[sma20Index - 1].value;
        const prevSMA50 = sma50Data[sma50Index - 1].value;
        const currSMA20 = sma20Data[sma20Index].value;
        const currSMA50 = sma50Data[sma50Index].value;
        const candle = this.currentCandles[i];

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

    // Apply markers to the candlestick series using v5 API
    if (this.candlestickSeries) {
      const markers = this.signalMarkers.map(marker => ({
        time: marker.time,
        position: marker.position as 'aboveBar' | 'belowBar' | 'inBar',
        price: marker.price, // v5 requires price property
        color: marker.type === 'BUY' || marker.type === 'GOLDEN_CROSS' ? '#22c55e' : '#ef4444',
        shape: (marker.type === 'BUY' || marker.type === 'GOLDEN_CROSS' ? 'arrowUp' : 'arrowDown') as 'arrowUp' | 'arrowDown' | 'circle' | 'square',
        text: marker.type
      }));

      // Create or update markers using v5 API
      if (!this.seriesMarkers) {
        this.seriesMarkers = createSeriesMarkers(this.candlestickSeries, markers);
        console.log('📊 Created series markers primitive with', markers.length, 'markers');
      } else {
        this.seriesMarkers.setMarkers(markers);
        console.log('📊 Updated series markers with', markers.length, 'markers');
      }
    }
  }

  private clearStrategyIndicators(): void {
    // Clear signal markers
    this.signalMarkers = [];

    // Clear signal markers from chart using v5 API
    if (this.seriesMarkers) {
      this.seriesMarkers.setMarkers([]);
      console.log('📊 Cleared all markers');
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
    if (this.rsiSeries && this.chart) {
      this.chart.removeSeries(this.rsiSeries);
      this.rsiSeries = undefined;

      // Show time axis on main chart again when RSI is removed
      if (this.chart && this.chartContainer) {
        this.chart.applyOptions({
          timeScale: {
            visible: true,
          },
        });
      }
    }

    // Clear Aroon series
    if (this.aroonUpSeries && this.chart) {
      this.chart.removeSeries(this.aroonUpSeries);
      this.aroonUpSeries = undefined;
    }

    if (this.aroonDownSeries && this.chart) {
      this.chart.removeSeries(this.aroonDownSeries);
      this.aroonDownSeries = undefined;
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

  private calculateAroonData(candles: Candle[], period: number = 25): { aroonUp: LineData[], aroonDown: LineData[] } {
    const aroonUp: LineData[] = [];
    const aroonDown: LineData[] = [];

    if (candles.length < period) {
      return { aroonUp, aroonDown };
    }

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);

      // Find the index of highest high in the period
      let highestIndex = 0;
      let highestHigh = slice[0].high;
      for (let j = 1; j < slice.length; j++) {
        if (slice[j].high > highestHigh) {
          highestHigh = slice[j].high;
          highestIndex = j;
        }
      }

      // Find the index of lowest low in the period
      let lowestIndex = 0;
      let lowestLow = slice[0].low;
      for (let j = 1; j < slice.length; j++) {
        if (slice[j].low < lowestLow) {
          lowestLow = slice[j].low;
          lowestIndex = j;
        }
      }

      // Calculate Aroon Up and Aroon Down
      // Aroon Up = ((period - periods since highest high) / period) * 100
      // Aroon Down = ((period - periods since lowest low) / period) * 100
      const periodsSinceHigh = period - 1 - highestIndex;
      const periodsSinceLow = period - 1 - lowestIndex;

      const aroonUpValue = ((period - periodsSinceHigh) / period) * 100;
      const aroonDownValue = ((period - periodsSinceLow) / period) * 100;

      aroonUp.push({
        time: Math.floor(candles[i].time / 1000) as any,
        value: aroonUpValue,
      });

      aroonDown.push({
        time: Math.floor(candles[i].time / 1000) as any,
        value: aroonDownValue,
      });
    }

    return { aroonUp, aroonDown };
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param candles - Array of candlestick data
   * @param fastPeriod - Fast EMA period (default 12)
   * @param slowPeriod - Slow EMA period (default 26)
   * @param signalPeriod - Signal line EMA period (default 9)
   * @returns Object with MACD line, signal line, and histogram data
   */
  private calculateMACDData(
    candles: Candle[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macdLine: LineData[], signalLine: LineData[], histogram: LineData[] } {
    const macdLine: LineData[] = [];
    const signalLine: LineData[] = [];
    const histogram: LineData[] = [];

    if (candles.length < slowPeriod) {
      return { macdLine, signalLine, histogram };
    }

    // Helper function to calculate EMA
    const calculateEMA = (data: number[], period: number): number[] => {
      const ema: number[] = [];
      const multiplier = 2 / (period + 1);

      // First EMA is SMA
      let sum = 0;
      for (let i = 0; i < period; i++) {
        sum += data[i];
      }
      ema.push(sum / period);

      // Calculate remaining EMAs
      for (let i = period; i < data.length; i++) {
        const currentEMA = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
        ema.push(currentEMA);
      }

      return ema;
    };

    // Extract close prices
    const closePrices = candles.map(c => c.close);

    // Calculate fast and slow EMAs
    const fastEMA = calculateEMA(closePrices, fastPeriod);
    const slowEMA = calculateEMA(closePrices, slowPeriod);

    // Calculate MACD line (fast EMA - slow EMA)
    const macdValues: number[] = [];
    const startIndex = slowPeriod - 1;

    for (let i = 0; i < slowEMA.length; i++) {
      const fastIndex = i + (slowPeriod - fastPeriod);
      if (fastIndex >= 0 && fastIndex < fastEMA.length) {
        macdValues.push(fastEMA[fastIndex] - slowEMA[i]);
      }
    }

    // Calculate signal line (EMA of MACD line)
    const signalEMA = calculateEMA(macdValues, signalPeriod);

    // Build output arrays with timestamps
    for (let i = 0; i < signalEMA.length; i++) {
      const candleIndex = startIndex + i + (signalPeriod - 1);
      if (candleIndex < candles.length) {
        const time = Math.floor(candles[candleIndex].time / 1000) as any;
        const macdValue = macdValues[i + (signalPeriod - 1)];
        const signalValue = signalEMA[i];
        const histogramValue = macdValue - signalValue;

        macdLine.push({ time, value: macdValue });
        signalLine.push({ time, value: signalValue });
        histogram.push({ time, value: histogramValue });
      }
    }

    console.log('📊 MACD calculated:', {
      dataPoints: macdLine.length,
      fastPeriod,
      slowPeriod,
      signalPeriod
    });

    return { macdLine, signalLine, histogram };
  }

  /**
   * Calculate Choppiness Index
   * Values > 61.8: Market is choppy/consolidating
   * Values < 38.2: Market is trending
   * @param candles - Array of candlestick data
   * @param period - Lookback period (default 14)
   * @returns Array of Choppiness Index values
   */
  private calculateChoppinessIndex(candles: Candle[], period: number = 14): LineData[] {
    const choppiness: LineData[] = [];

    if (candles.length < period) {
      return choppiness;
    }

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);

      // Find highest high and lowest low in the period
      let highestHigh = slice[0].high;
      let lowestLow = slice[0].low;

      for (let j = 1; j < slice.length; j++) {
        if (slice[j].high > highestHigh) highestHigh = slice[j].high;
        if (slice[j].low < lowestLow) lowestLow = slice[j].low;
      }

      // Calculate sum of true ranges
      let sumTrueRange = 0;
      for (let j = 1; j < slice.length; j++) {
        const high = slice[j].high;
        const low = slice[j].low;
        const prevClose = slice[j - 1].close;

        const trueRange = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        );

        sumTrueRange += trueRange;
      }

      // Calculate Choppiness Index
      // CI = 100 * log10(sumTR / (HH - LL)) / log10(period)
      const range = highestHigh - lowestLow;

      if (range > 0 && sumTrueRange > 0) {
        const ci = 100 * Math.log10(sumTrueRange / range) / Math.log10(period);

        choppiness.push({
          time: Math.floor(candles[i].time / 1000) as any,
          value: ci,
        });
      }
    }

    console.log('📊 Choppiness Index calculated:', {
      dataPoints: choppiness.length,
      period
    });

    return choppiness;
  }

  /**
   * Calculate Bollinger Bands
   * @param candles - Array of candlestick data
   * @param period - Period for moving average (default 20)
   * @param stdDev - Number of standard deviations (default 2)
   * @returns Object with upper, middle, and lower bands
   */
  private calculateBollingerBands(
    candles: Candle[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: LineData[], middle: LineData[], lower: LineData[] } {
    const upper: LineData[] = [];
    const middle: LineData[] = [];
    const lower: LineData[] = [];

    if (candles.length < period) {
      return { upper, middle, lower };
    }

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);

      // Calculate SMA (middle band)
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      const sma = sum / period;

      // Calculate standard deviation
      const squaredDiffs = slice.map(c => Math.pow(c.close - sma, 2));
      const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
      const standardDeviation = Math.sqrt(variance);

      // Calculate bands
      const upperBand = sma + (stdDev * standardDeviation);
      const lowerBand = sma - (stdDev * standardDeviation);

      const time = Math.floor(candles[i].time / 1000) as any;

      upper.push({ time, value: upperBand });
      middle.push({ time, value: sma });
      lower.push({ time, value: lowerBand });
    }

    console.log('📊 Bollinger Bands calculated:', {
      dataPoints: middle.length,
      period,
      stdDev
    });

    return { upper, middle, lower };
  }
}
