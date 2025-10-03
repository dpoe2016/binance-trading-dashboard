import { Injectable } from '@angular/core';
import { TradingStrategy, Candle } from '../models/trading.model';

export interface BacktestSignal {
  time: number;
  type: 'BUY' | 'SELL' | 'GOLDEN_CROSS' | 'DEATH_CROSS';
  price: number;
  reason: string;
  rsi?: number;
  sma20?: number;
  sma50?: number;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  type: 'LONG' | 'SHORT';
  quantity: number;
  profit?: number;
  profitPercent?: number;
  isOpen: boolean;
  entrySignal: BacktestSignal;
  exitSignal?: BacktestSignal;
}

export interface BacktestResults {
  signals: BacktestSignal[];
  trades: BacktestTrade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalProfitPercent: number;
  averageProfit: number;
  averageProfitPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  sharpeRatio: number;
  startBalance: number;
  endBalance: number;
  roi: number;
}

@Injectable({
  providedIn: 'root'
})
export class BacktestingService {
  private readonly DEFAULT_CAPITAL = 10000; // Default starting capital in USDT

  constructor() {}

  /**
   * Run backtest for a strategy on historical candles
   */
  runBacktest(
    strategy: TradingStrategy,
    candles: Candle[],
    initialCapital: number = this.DEFAULT_CAPITAL
  ): BacktestResults {
    // Generate signals
    const signals = this.generateSignals(strategy, candles);

    // Execute trades based on signals
    const trades = this.executeTrades(signals, initialCapital);

    // Calculate performance metrics
    const metrics = this.calculateMetrics(trades, initialCapital);

    return {
      signals,
      trades,
      ...metrics
    };
  }

  /**
   * Generate trading signals based on strategy parameters
   */
  private generateSignals(strategy: TradingStrategy, candles: Candle[]): BacktestSignal[] {
    const signals: BacktestSignal[] = [];

    // Calculate indicators
    const rsiData = strategy.parameters['useRSI'] ? this.calculateRSI(candles, 14) : null;
    const sma20Data = strategy.parameters['useSMA'] !== false ? this.calculateSMA(candles, 20) : null;
    const sma50Data = strategy.parameters['useSMA'] !== false ? this.calculateSMA(candles, 50) : null;
    const sma200Data = strategy.parameters['useSMA200'] ? this.calculateSMA(candles, 200) : null;

    // Generate RSI signals
    if (rsiData && strategy.parameters['useRSI']) {
      const rsiOversold = strategy.parameters['rsiOversold'] || 30;
      const rsiOverbought = strategy.parameters['rsiOverbought'] || 70;

      for (let i = 1; i < rsiData.length; i++) {
        const prevRSI = rsiData[i - 1];
        const currRSI = rsiData[i];
        const candleIndex = i + 14; // Offset by RSI period

        if (candleIndex >= candles.length) continue;
        const candle = candles[candleIndex];

        // Buy signal: RSI crosses below oversold level
        if (prevRSI >= rsiOversold && currRSI < rsiOversold) {
          signals.push({
            time: candle.time,
            type: 'BUY',
            price: candle.close,
            reason: `RSI oversold (${currRSI.toFixed(2)})`,
            rsi: currRSI,
            sma20: sma20Data ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data ? sma50Data[candleIndex] : undefined,
          });
        }

        // Sell signal: RSI crosses above overbought level
        if (prevRSI <= rsiOverbought && currRSI > rsiOverbought) {
          signals.push({
            time: candle.time,
            type: 'SELL',
            price: candle.close,
            reason: `RSI overbought (${currRSI.toFixed(2)})`,
            rsi: currRSI,
            sma20: sma20Data ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data ? sma50Data[candleIndex] : undefined,
          });
        }
      }
    }

    // Generate SMA crossover signals
    if (sma20Data && sma50Data && strategy.parameters['useSMA'] !== false) {
      for (let i = 1; i < Math.min(sma20Data.length, sma50Data.length); i++) {
        const prevSMA20 = sma20Data[i - 1];
        const prevSMA50 = sma50Data[i - 1];
        const currSMA20 = sma20Data[i];
        const currSMA50 = sma50Data[i];

        if (i >= candles.length) continue;
        const candle = candles[i];

        // Golden cross: SMA20 crosses above SMA50 (bullish)
        if (prevSMA20 <= prevSMA50 && currSMA20 > currSMA50) {
          signals.push({
            time: candle.time,
            type: 'GOLDEN_CROSS',
            price: candle.close,
            reason: 'SMA20 crossed above SMA50',
            rsi: rsiData ? rsiData[i - 14] : undefined,
            sma20: currSMA20,
            sma50: currSMA50,
          });
        }

        // Death cross: SMA20 crosses below SMA50 (bearish)
        if (prevSMA20 >= prevSMA50 && currSMA20 < currSMA50) {
          signals.push({
            time: candle.time,
            type: 'DEATH_CROSS',
            price: candle.close,
            reason: 'SMA20 crossed below SMA50',
            rsi: rsiData ? rsiData[i - 14] : undefined,
            sma20: currSMA20,
            sma50: currSMA50,
          });
        }
      }
    }

    // Sort signals by time
    signals.sort((a, b) => a.time - b.time);

    return signals;
  }

  /**
   * Execute trades based on signals
   */
  private executeTrades(signals: BacktestSignal[], initialCapital: number): BacktestTrade[] {
    const trades: BacktestTrade[] = [];
    let currentBalance = initialCapital;
    let openTrade: BacktestTrade | null = null;

    for (const signal of signals) {
      const isBuySignal = signal.type === 'BUY' || signal.type === 'GOLDEN_CROSS';
      const isSellSignal = signal.type === 'SELL' || signal.type === 'DEATH_CROSS';

      // Open long position
      if (isBuySignal && !openTrade) {
        const quantity = (currentBalance * 0.95) / signal.price; // Use 95% of balance, keep 5% for fees
        openTrade = {
          entryTime: signal.time,
          entryPrice: signal.price,
          type: 'LONG',
          quantity,
          isOpen: true,
          entrySignal: signal,
        };
      }
      // Close long position
      else if (isSellSignal && openTrade && openTrade.type === 'LONG') {
        const profit = (signal.price - openTrade.entryPrice) * openTrade.quantity;
        const profitPercent = ((signal.price - openTrade.entryPrice) / openTrade.entryPrice) * 100;

        openTrade.exitTime = signal.time;
        openTrade.exitPrice = signal.price;
        openTrade.profit = profit;
        openTrade.profitPercent = profitPercent;
        openTrade.isOpen = false;
        openTrade.exitSignal = signal;

        currentBalance += profit;
        trades.push(openTrade);
        openTrade = null;
      }
    }

    // Close any open trade at the last signal price
    if (openTrade && signals.length > 0) {
      const lastSignal = signals[signals.length - 1];
      const profit = (lastSignal.price - openTrade.entryPrice) * openTrade.quantity;
      const profitPercent = ((lastSignal.price - openTrade.entryPrice) / openTrade.entryPrice) * 100;

      openTrade.exitTime = lastSignal.time;
      openTrade.exitPrice = lastSignal.price;
      openTrade.profit = profit;
      openTrade.profitPercent = profitPercent;
      openTrade.isOpen = false;

      trades.push(openTrade);
    }

    return trades;
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(trades: BacktestTrade[], initialCapital: number): Omit<BacktestResults, 'signals' | 'trades'> {
    const closedTrades = trades.filter(t => !t.isOpen);

    if (closedTrades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfit: 0,
        totalProfitPercent: 0,
        averageProfit: 0,
        averageProfitPercent: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        startBalance: initialCapital,
        endBalance: initialCapital,
        roi: 0,
      };
    }

    const winningTrades = closedTrades.filter(t => (t.profit || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.profit || 0) < 0);

    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalProfitPercent = (totalProfit / initialCapital) * 100;

    const averageProfit = totalProfit / closedTrades.length;
    const averageProfitPercent = closedTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / closedTrades.length;

    // Calculate max drawdown
    let peak = initialCapital;
    let maxDrawdown = 0;
    let currentBalance = initialCapital;

    for (const trade of closedTrades) {
      currentBalance += (trade.profit || 0);
      if (currentBalance > peak) {
        peak = currentBalance;
      }
      const drawdown = peak - currentBalance;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const maxDrawdownPercent = (maxDrawdown / initialCapital) * 100;

    // Calculate profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;

    // Calculate Sharpe ratio (simplified)
    const returns = closedTrades.map(t => (t.profitPercent || 0) / 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualized

    const endBalance = initialCapital + totalProfit;
    const roi = totalProfitPercent;

    return {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / closedTrades.length) * 100,
      totalProfit,
      totalProfitPercent,
      averageProfit,
      averageProfitPercent,
      maxDrawdown,
      maxDrawdownPercent,
      profitFactor,
      sharpeRatio,
      startBalance: initialCapital,
      endBalance,
      roi,
    };
  }

  /**
   * Calculate RSI indicator
   */
  private calculateRSI(candles: Candle[], period: number = 14): number[] {
    const rsi: number[] = [];
    const closes = candles.map(c => c.close);

    if (closes.length < period + 1) return rsi;

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
      const rsiValue = 100 - (100 / (1 + rs));

      rsi.push(rsiValue);
    }

    return rsi;
  }

  /**
   * Calculate SMA indicator
   */
  private calculateSMA(candles: Candle[], period: number): number[] {
    const sma: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        sma.push(0); // Not enough data yet
        continue;
      }

      const slice = candles.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      sma.push(sum / period);
    }

    return sma;
  }
}
