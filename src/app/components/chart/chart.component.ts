import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { BinanceService } from '../../services/binance.service';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  @Input() symbol: string = 'BTCUSDT';

  private chart?: IChartApi;
  private candlestickSeries?: ISeriesApi<'Candlestick'>;
  private priceUpdateCleanup?: () => void;

  selectedSymbol: string = 'BTCUSDT';
  selectedInterval: string = '15m';

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

  constructor(private binanceService: BinanceService) {}

  ngOnInit(): void {
    this.selectedSymbol = this.symbol;
    this.initChart();
    this.loadChartData();
  }

  ngOnDestroy(): void {
    if (this.priceUpdateCleanup) {
      this.priceUpdateCleanup();
    }
    if (this.chart) {
      this.chart.remove();
    }
  }

  private initChart(): void {
    const container = this.chartContainer.nativeElement;

    // Create chart with proper configuration
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

    // Add candlestick series using the v5.x addSeries method
    try {
      // Try the new v5 API first
      this.candlestickSeries = (this.chart as any).addSeries?.('Candlestick', {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      // Fallback to legacy method if new API doesn't exist
      if (!this.candlestickSeries) {
        this.candlestickSeries = (this.chart as any).addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
      }
    } catch (error) {
      console.error('Error creating chart series:', error);
    }

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    if (this.chart && this.chartContainer) {
      this.chart.applyOptions({
        width: this.chartContainer.nativeElement.clientWidth,
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
    }

    // Subscribe to price updates
    this.priceUpdateCleanup = this.binanceService.subscribeToPriceUpdates(
      this.selectedSymbol,
      (price: string) => {
        // Update last candle with new price
        // In a real implementation, you'd want to track the current candle
        // and update it properly. This is a simplified version.
        console.log(`${this.selectedSymbol} price update: ${price}`);
      }
    );
  }

  onSymbolChange(): void {
    this.loadChartData();
  }

  onIntervalChange(): void {
    this.loadChartData();
  }
}
