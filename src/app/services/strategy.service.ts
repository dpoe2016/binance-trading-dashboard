import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { TradingStrategy, StrategySignal, Candle } from '../models/trading.model';
import { BinanceService } from './binance.service';

@Injectable({
  providedIn: 'root'
})
export class StrategyService {
  private strategies$ = new BehaviorSubject<TradingStrategy[]>([]);
  private signals$ = new BehaviorSubject<StrategySignal[]>([]);
  private executionSubscriptions: Map<string, Subscription> = new Map();

  constructor(private binanceService: BinanceService) {
    this.loadStrategies();
  }

  // Strategy Management
  getStrategies(): Observable<TradingStrategy[]> {
    return this.strategies$.asObservable();
  }

  getSignals(): Observable<StrategySignal[]> {
    return this.signals$.asObservable();
  }

  addStrategy(strategy: Omit<TradingStrategy, 'id' | 'createdAt'>): void {
    const newStrategy: TradingStrategy = {
      ...strategy,
      id: this.generateId(),
      createdAt: new Date(),
      isActive: false
    };

    const strategies = [...this.strategies$.value, newStrategy];
    this.strategies$.next(strategies);
    this.saveStrategies();
  }

  updateStrategy(id: string, updates: Partial<TradingStrategy>): void {
    const strategies = this.strategies$.value.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    this.strategies$.next(strategies);
    this.saveStrategies();
  }

  deleteStrategy(id: string): void {
    this.stopStrategy(id);
    const strategies = this.strategies$.value.filter(s => s.id !== id);
    this.strategies$.next(strategies);
    this.saveStrategies();
  }

  activateStrategy(id: string): void {
    this.updateStrategy(id, { isActive: true });
    this.startStrategyExecution(id);
  }

  deactivateStrategy(id: string): void {
    this.updateStrategy(id, { isActive: false });
    this.stopStrategy(id);
  }

  // Strategy Execution
  private startStrategyExecution(strategyId: string): void {
    const strategy = this.strategies$.value.find(s => s.id === strategyId);
    if (!strategy) return;

    // Execute strategy every minute (adjust based on timeframe)
    const intervalMs = this.getIntervalMs(strategy.timeframe);
    const subscription = interval(intervalMs).subscribe(async () => {
      await this.executeStrategy(strategy);
    });

    this.executionSubscriptions.set(strategyId, subscription);
  }

  private stopStrategy(strategyId: string): void {
    const subscription = this.executionSubscriptions.get(strategyId);
    if (subscription) {
      subscription.unsubscribe();
      this.executionSubscriptions.delete(strategyId);
    }
  }

  private async executeStrategy(strategy: TradingStrategy): Promise<void> {
    try {
      // Fetch market data
      const candles = await this.binanceService.getCandles(
        strategy.symbol,
        strategy.timeframe,
        100
      );

      // Evaluate strategy (Pine Script or custom logic)
      const signal = strategy.pineScript
        ? await this.evaluatePineScript(strategy, candles)
        : await this.evaluateCustomStrategy(strategy, candles);

      if (signal) {
        this.addSignal(signal);

        // Auto-execute if configured
        if (strategy.parameters['autoExecute']) {
          await this.executeSignal(signal);
        }
      }

      // Update last execution time
      this.updateStrategy(strategy.id, { lastExecuted: new Date() });
    } catch (error) {
      console.error(`Error executing strategy ${strategy.name}:`, error);
    }
  }

  // Pine Script Evaluation (Simplified - would need full Pine Script parser)
  private async evaluatePineScript(strategy: TradingStrategy, candles: Candle[]): Promise<StrategySignal | null> {
    // This is a simplified placeholder. Full Pine Script support would require
    // a complete Pine Script interpreter or transpiler.
    // For now, we'll provide basic indicator support

    const indicators = this.calculateBasicIndicators(candles);
    const lastCandle = candles[candles.length - 1];

    // Parse simple Pine Script conditions
    if (strategy.pineScript?.includes('crossover')) {
      // Example: MA crossover detection
      if (indicators.sma20 > indicators.sma50 && indicators.prevSma20 <= indicators.prevSma50) {
        return {
          strategyId: strategy.id,
          symbol: strategy.symbol,
          action: 'BUY',
          price: lastCandle.close,
          quantity: parseFloat(strategy.parameters['quantity'] || '0'),
          timestamp: new Date(),
          reason: 'SMA Crossover - Bullish'
        };
      }
    }

    return null;
  }

  // Custom Strategy Evaluation
  private async evaluateCustomStrategy(strategy: TradingStrategy, candles: Candle[]): Promise<StrategySignal | null> {
    const indicators = this.calculateBasicIndicators(candles);
    const lastCandle = candles[candles.length - 1];

    // Example: Simple RSI strategy
    if (strategy.parameters['useRSI']) {
      if (indicators.rsi < 30) {
        return {
          strategyId: strategy.id,
          symbol: strategy.symbol,
          action: 'BUY',
          price: lastCandle.close,
          quantity: parseFloat(strategy.parameters['quantity'] || '0'),
          timestamp: new Date(),
          reason: 'RSI Oversold'
        };
      } else if (indicators.rsi > 70) {
        return {
          strategyId: strategy.id,
          symbol: strategy.symbol,
          action: 'SELL',
          price: lastCandle.close,
          quantity: parseFloat(strategy.parameters['quantity'] || '0'),
          timestamp: new Date(),
          reason: 'RSI Overbought'
        };
      }
    }

    return null;
  }

  // Basic Technical Indicators
  private calculateBasicIndicators(candles: Candle[]): any {
    const closes = candles.map(c => c.close);

    return {
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      prevSma20: this.calculateSMA(closes.slice(0, -1), 20),
      prevSma50: this.calculateSMA(closes.slice(0, -1), 50),
      rsi: this.calculateRSI(closes, 14),
      ema12: this.calculateEMA(closes, 12),
      ema26: this.calculateEMA(closes, 26)
    };
  }

  private calculateSMA(data: number[], period: number): number {
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / slice.length;
  }

  private calculateEMA(data: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateRSI(data: number[], period: number): number {
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = data[data.length - i] - data[data.length - i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Signal Management
  private addSignal(signal: StrategySignal): void {
    const signals = [signal, ...this.signals$.value].slice(0, 100); // Keep last 100 signals
    this.signals$.next(signals);

    // Add signal to the corresponding strategy
    const strategies = this.strategies$.value.map(s => {
      if (s.id === signal.strategyId) {
        const strategySignals = s.signals ? [...s.signals, signal] : [signal];
        return { ...s, signals: strategySignals };
      }
      return s;
    });
    this.strategies$.next(strategies);
  }

  private async executeSignal(signal: StrategySignal): Promise<void> {
    try {
      if (signal.action === 'BUY') {
        await this.binanceService.placeMarketOrder(
          signal.symbol,
          'BUY',
          signal.quantity.toString()
        );
      } else if (signal.action === 'SELL') {
        await this.binanceService.placeMarketOrder(
          signal.symbol,
          'SELL',
          signal.quantity.toString()
        );
      }
    } catch (error) {
      console.error('Error executing signal:', error);
    }
  }

  // Persistence
  private saveStrategies(): void {
    localStorage.setItem('trading-strategies', JSON.stringify(this.strategies$.value));
  }

  private loadStrategies(): void {
    const saved = localStorage.getItem('trading-strategies');
    if (saved) {
      const loadedStrategies: TradingStrategy[] = JSON.parse(saved);
      // Ensure signals array is initialized for each loaded strategy
      loadedStrategies.forEach(s => {
        if (!s.signals) {
          s.signals = [];
        }
      });
      this.strategies$.next(loadedStrategies);
    }
  }

  private getIntervalMs(timeframe: string): number {
    const map: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000
    };
    return map[timeframe] || 60000;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
