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

    // Check Choppiness Index filter (only trade in trending markets)
    let choppinessFilter = true;
    if (strategy.parameters['useChoppiness']) {
      const choppinessPeriod = strategy.parameters['choppinessPeriod'] || 14;
      const choppinessValue = this.calculateChoppinessIndex(candles, choppinessPeriod);

      // Only allow signals when market is trending (CI < 38.2)
      if (choppinessValue > 38.2) {
        choppinessFilter = false;
        console.log(`🚫 Signal filtered: Market is choppy (CI: ${choppinessValue.toFixed(2)})`);
      }
    }

    // MACD crossover signals
    if (strategy.parameters['useMACD']) {
      const fastPeriod = strategy.parameters['macdFastPeriod'] || 12;
      const slowPeriod = strategy.parameters['macdSlowPeriod'] || 26;
      const signalPeriod = strategy.parameters['macdSignalPeriod'] || 9;

      const macdData = this.calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);

      if (macdData.length >= 2) {
        const current = macdData[macdData.length - 1];
        const previous = macdData[macdData.length - 2];

        // Bullish crossover: MACD crosses above signal line
        if (current.histogram > 0 && previous.histogram <= 0 && choppinessFilter) {
          return {
            strategyId: strategy.id,
            symbol: strategy.symbol,
            action: 'BUY',
            price: lastCandle.close,
            quantity: parseFloat(strategy.parameters['quantity'] || '0'),
            timestamp: new Date(),
            reason: 'MACD Bullish Crossover'
          };
        }

        // Bearish crossover: MACD crosses below signal line
        if (current.histogram < 0 && previous.histogram >= 0 && choppinessFilter) {
          return {
            strategyId: strategy.id,
            symbol: strategy.symbol,
            action: 'SELL',
            price: lastCandle.close,
            quantity: parseFloat(strategy.parameters['quantity'] || '0'),
            timestamp: new Date(),
            reason: 'MACD Bearish Crossover'
          };
        }
      }
    }

    // Bollinger Bands breakout signals
    if (strategy.parameters['useBollingerBands'] && candles.length >= 2) {
      const bbPeriod = strategy.parameters['bbPeriod'] || 20;
      const bbStdDev = strategy.parameters['bbStdDev'] || 2;
      const bbData = this.calculateBollingerBands(candles, bbPeriod, bbStdDev);

      if (bbData.length >= 2) {
        const current = bbData[bbData.length - 1];
        const previous = bbData[bbData.length - 2];
        const prevCandle = candles[candles.length - 2];

        // Bullish breakout: Price crosses above upper band
        if (prevCandle.close <= previous.upper && lastCandle.close > current.upper && choppinessFilter) {
          return {
            strategyId: strategy.id,
            symbol: strategy.symbol,
            action: 'BUY',
            price: lastCandle.close,
            quantity: parseFloat(strategy.parameters['quantity'] || '0'),
            timestamp: new Date(),
            reason: 'BB Upper Band Breakout'
          };
        }

        // Bearish breakout: Price crosses below lower band
        if (prevCandle.close >= previous.lower && lastCandle.close < current.lower && choppinessFilter) {
          return {
            strategyId: strategy.id,
            symbol: strategy.symbol,
            action: 'SELL',
            price: lastCandle.close,
            quantity: parseFloat(strategy.parameters['quantity'] || '0'),
            timestamp: new Date(),
            reason: 'BB Lower Band Breakout'
          };
        }

        // Mean reversion: Price bounces off lower band (buy)
        if (prevCandle.close < previous.lower && lastCandle.close >= current.lower && choppinessFilter) {
          return {
            strategyId: strategy.id,
            symbol: strategy.symbol,
            action: 'BUY',
            price: lastCandle.close,
            quantity: parseFloat(strategy.parameters['quantity'] || '0'),
            timestamp: new Date(),
            reason: 'BB Lower Band Bounce'
          };
        }

        // Mean reversion: Price bounces off upper band (sell)
        if (prevCandle.close > previous.upper && lastCandle.close <= current.upper && choppinessFilter) {
          return {
            strategyId: strategy.id,
            symbol: strategy.symbol,
            action: 'SELL',
            price: lastCandle.close,
            quantity: parseFloat(strategy.parameters['quantity'] || '0'),
            timestamp: new Date(),
            reason: 'BB Upper Band Bounce'
          };
        }
      }
    }

    // Example: Simple RSI strategy
    if (strategy.parameters['useRSI']) {
      if (indicators.rsi < 30 && choppinessFilter) {
        return {
          strategyId: strategy.id,
          symbol: strategy.symbol,
          action: 'BUY',
          price: lastCandle.close,
          quantity: parseFloat(strategy.parameters['quantity'] || '0'),
          timestamp: new Date(),
          reason: 'RSI Oversold'
        };
      } else if (indicators.rsi > 70 && choppinessFilter) {
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

  private calculateMACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): Array<{macd: number, signal: number, histogram: number}> {
    if (candles.length < slowPeriod) {
      return [];
    }

    const closes = candles.map(c => c.close);

    // Calculate EMAs using proper EMA calculation
    const calculateEMAArray = (data: number[], period: number): number[] => {
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

    // Calculate fast and slow EMAs
    const fastEMA = calculateEMAArray(closes, fastPeriod);
    const slowEMA = calculateEMAArray(closes, slowPeriod);

    // Calculate MACD line (fast EMA - slow EMA)
    const macdValues: number[] = [];
    for (let i = 0; i < slowEMA.length; i++) {
      const fastIndex = i + (slowPeriod - fastPeriod);
      if (fastIndex >= 0 && fastIndex < fastEMA.length) {
        macdValues.push(fastEMA[fastIndex] - slowEMA[i]);
      }
    }

    // Calculate signal line (EMA of MACD line)
    const signalEMA = calculateEMAArray(macdValues, signalPeriod);

    // Build output array
    const result: Array<{macd: number, signal: number, histogram: number}> = [];
    for (let i = 0; i < signalEMA.length; i++) {
      const macdValue = macdValues[i + (signalPeriod - 1)];
      const signalValue = signalEMA[i];
      const histogramValue = macdValue - signalValue;

      result.push({
        macd: macdValue,
        signal: signalValue,
        histogram: histogramValue
      });
    }

    return result;
  }

  private calculateChoppinessIndex(candles: Candle[], period: number = 14): number {
    if (candles.length < period) {
      return 100; // Return high value (choppy) if not enough data
    }

    const slice = candles.slice(-period);

    // Find highest high and lowest low in the period
    let highestHigh = slice[0].high;
    let lowestLow = slice[0].low;

    for (let i = 1; i < slice.length; i++) {
      if (slice[i].high > highestHigh) highestHigh = slice[i].high;
      if (slice[i].low < lowestLow) lowestLow = slice[i].low;
    }

    // Calculate sum of true ranges
    let sumTrueRange = 0;
    for (let i = 1; i < slice.length; i++) {
      const high = slice[i].high;
      const low = slice[i].low;
      const prevClose = slice[i - 1].close;

      const trueRange = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      sumTrueRange += trueRange;
    }

    // Calculate Choppiness Index
    const range = highestHigh - lowestLow;

    if (range > 0 && sumTrueRange > 0) {
      return 100 * Math.log10(sumTrueRange / range) / Math.log10(period);
    }

    return 100; // Return high value if calculation fails
  }

  private calculateBollingerBands(
    candles: Candle[],
    period: number = 20,
    stdDev: number = 2
  ): Array<{upper: number, middle: number, lower: number}> {
    const result: Array<{upper: number, middle: number, lower: number}> = [];

    if (candles.length < period) {
      return result;
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
      const upper = sma + (stdDev * standardDeviation);
      const lower = sma - (stdDev * standardDeviation);

      result.push({ upper, middle: sma, lower });
    }

    return result;
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
