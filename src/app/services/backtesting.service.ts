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
    const macdData = strategy.parameters['useMACD'] ? this.calculateMACD(
      candles,
      strategy.parameters['macdFastPeriod'] || 12,
      strategy.parameters['macdSlowPeriod'] || 26,
      strategy.parameters['macdSignalPeriod'] || 9
    ) : null;
    const choppinessData = strategy.parameters['useChoppiness'] ? this.calculateChoppinessIndex(
      candles,
      strategy.parameters['choppinessPeriod'] || 14
    ) : null;
    const bbData = strategy.parameters['useBollingerBands'] ? this.calculateBollingerBands(
      candles,
      strategy.parameters['bbPeriod'] || 20,
      strategy.parameters['bbStdDev'] || 2
    ) : null;
    const stochData = strategy.parameters['useStochastic'] ? this.calculateStochastic(
      candles,
      strategy.parameters['stochKPeriod'] || 14,
      strategy.parameters['stochDPeriod'] || 3
    ) : null;

    // Generate Bollinger Bands signals
    if (bbData && strategy.parameters['useBollingerBands']) {
      const bbPeriod = strategy.parameters['bbPeriod'] || 20;

      for (let i = 1; i < bbData.length; i++) {
        const candleIndex = bbPeriod - 1 + i;
        if (candleIndex >= candles.length) continue;

        const current = bbData[i];
        const previous = bbData[i - 1];
        const candle = candles[candleIndex];
        const prevCandle = candles[candleIndex - 1];

        // Check choppiness filter
        const choppinessValue = choppinessData && candleIndex < choppinessData.length
          ? choppinessData[candleIndex]
          : 0;
        const passesChoppinessFilter = !choppinessData || choppinessValue < 38.2;

        // Upper band breakout (buy)
        if (prevCandle.close <= previous.upper && candle.close > current.upper && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'BUY',
            price: candle.close,
            reason: 'BB Upper Band Breakout',
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }

        // Lower band breakout (sell)
        if (prevCandle.close >= previous.lower && candle.close < current.lower && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'SELL',
            price: candle.close,
            reason: 'BB Lower Band Breakout',
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }

        // Lower band bounce (mean reversion buy)
        if (prevCandle.close < previous.lower && candle.close >= current.lower && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'BUY',
            price: candle.close,
            reason: 'BB Lower Band Bounce',
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }

        // Upper band bounce (mean reversion sell)
        if (prevCandle.close > previous.upper && candle.close <= current.upper && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'SELL',
            price: candle.close,
            reason: 'BB Upper Band Bounce',
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }
      }
    }

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

        // Check choppiness filter
        const choppinessValue = choppinessData && candleIndex < choppinessData.length
          ? choppinessData[candleIndex]
          : 0;
        const passesChoppinessFilter = !choppinessData || choppinessValue < 38.2;

        // Buy signal: RSI crosses below oversold level
        if (prevRSI >= rsiOversold && currRSI < rsiOversold && passesChoppinessFilter) {
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
        if (prevRSI <= rsiOverbought && currRSI > rsiOverbought && passesChoppinessFilter) {
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

        // Check choppiness filter
        const choppinessValue = choppinessData && i < choppinessData.length
          ? choppinessData[i]
          : 0;
        const passesChoppinessFilter = !choppinessData || choppinessValue < 38.2;

        // Golden cross: SMA20 crosses above SMA50 (bullish)
        if (prevSMA20 <= prevSMA50 && currSMA20 > currSMA50 && passesChoppinessFilter) {
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
        if (prevSMA20 >= prevSMA50 && currSMA20 < currSMA50 && passesChoppinessFilter) {
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

    // Generate MACD crossover signals
    if (macdData && strategy.parameters['useMACD']) {
      const slowPeriod = strategy.parameters['macdSlowPeriod'] || 26;
      const signalPeriod = strategy.parameters['macdSignalPeriod'] || 9;
      const startIndex = slowPeriod + signalPeriod - 2;

      for (let i = 1; i < macdData.length; i++) {
        const prevMACD = macdData[i - 1];
        const currMACD = macdData[i];
        const candleIndex = startIndex + i;

        if (candleIndex >= candles.length) continue;
        const candle = candles[candleIndex];

        // Check choppiness filter
        const choppinessValue = choppinessData && candleIndex < choppinessData.length
          ? choppinessData[candleIndex]
          : 0;
        const passesChoppinessFilter = !choppinessData || choppinessValue < 38.2;

        // Bullish crossover: MACD crosses above signal line
        if (prevMACD.histogram <= 0 && currMACD.histogram > 0 && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'BUY',
            price: candle.close,
            reason: `MACD bullish crossover (${currMACD.histogram.toFixed(4)})`,
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }

        // Bearish crossover: MACD crosses below signal line
        if (prevMACD.histogram >= 0 && currMACD.histogram < 0 && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'SELL',
            price: candle.close,
            reason: `MACD bearish crossover (${currMACD.histogram.toFixed(4)})`,
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }
      }
    }

    // Generate Stochastic signals
    if (stochData && strategy.parameters['useStochastic']) {
      const stochKPeriod = strategy.parameters['stochKPeriod'] || 14;
      const stochDPeriod = strategy.parameters['stochDPeriod'] || 3;
      const stochOversold = strategy.parameters['stochOversold'] || 20;
      const stochOverbought = strategy.parameters['stochOverbought'] || 80;
      const startIndex = stochKPeriod + stochDPeriod - 2;

      for (let i = 1; i < stochData.length; i++) {
        const prevStoch = stochData[i - 1];
        const currStoch = stochData[i];
        const candleIndex = startIndex + i;

        if (candleIndex >= candles.length) continue;
        const candle = candles[candleIndex];

        // Check choppiness filter
        const choppinessValue = choppinessData && candleIndex < choppinessData.length
          ? choppinessData[candleIndex]
          : 0;
        const passesChoppinessFilter = !choppinessData || choppinessValue < 38.2;

        // Bullish crossover: %K crosses above %D in oversold territory
        if (prevStoch.k <= prevStoch.d && currStoch.k > currStoch.d &&
            currStoch.k < stochOversold + 10 && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'BUY',
            price: candle.close,
            reason: `Stochastic bullish crossover (%K: ${currStoch.k.toFixed(2)}, %D: ${currStoch.d.toFixed(2)})`,
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }

        // Bearish crossover: %K crosses below %D in overbought territory
        if (prevStoch.k >= prevStoch.d && currStoch.k < currStoch.d &&
            currStoch.k > stochOverbought - 10 && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'SELL',
            price: candle.close,
            reason: `Stochastic bearish crossover (%K: ${currStoch.k.toFixed(2)}, %D: ${currStoch.d.toFixed(2)})`,
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }

        // Oversold bounce: %K crosses above oversold level
        if (prevStoch.k <= stochOversold && currStoch.k > stochOversold && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'BUY',
            price: candle.close,
            reason: `Stochastic oversold bounce (%K: ${currStoch.k.toFixed(2)})`,
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
          });
        }

        // Overbought reversal: %K crosses below overbought level
        if (prevStoch.k >= stochOverbought && currStoch.k < stochOverbought && passesChoppinessFilter) {
          signals.push({
            time: candle.time,
            type: 'SELL',
            price: candle.close,
            reason: `Stochastic overbought reversal (%K: ${currStoch.k.toFixed(2)})`,
            rsi: rsiData && (candleIndex - 14) >= 0 && (candleIndex - 14) < rsiData.length
              ? rsiData[candleIndex - 14]
              : undefined,
            sma20: sma20Data && candleIndex < sma20Data.length ? sma20Data[candleIndex] : undefined,
            sma50: sma50Data && candleIndex < sma50Data.length ? sma50Data[candleIndex] : undefined,
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

  private calculateMACD(
    candles: Candle[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): Array<{macd: number, signal: number, histogram: number}> {
    if (candles.length < slowPeriod) {
      return [];
    }

    const closes = candles.map(c => c.close);

    // Helper function to calculate EMA array
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

  private calculateChoppinessIndex(candles: Candle[], period: number = 14): number[] {
    const choppiness: number[] = [];

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
      const range = highestHigh - lowestLow;

      if (range > 0 && sumTrueRange > 0) {
        const ci = 100 * Math.log10(sumTrueRange / range) / Math.log10(period);
        choppiness.push(ci);
      } else {
        choppiness.push(100); // High value indicates choppy
      }
    }

    return choppiness;
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

  private calculateStochastic(
    candles: Candle[],
    kPeriod: number = 14,
    dPeriod: number = 3
  ): Array<{k: number, d: number}> {
    const result: Array<{k: number, d: number}> = [];

    if (candles.length < kPeriod) {
      return result;
    }

    // Calculate %K values
    const kValues: number[] = [];
    for (let i = kPeriod - 1; i < candles.length; i++) {
      const slice = candles.slice(i - kPeriod + 1, i + 1);

      // Find highest high and lowest low
      let highestHigh = slice[0].high;
      let lowestLow = slice[0].low;

      for (let j = 1; j < slice.length; j++) {
        if (slice[j].high > highestHigh) highestHigh = slice[j].high;
        if (slice[j].low < lowestLow) lowestLow = slice[j].low;
      }

      // Calculate %K: ((Current Close - Lowest Low) / (Highest High - Lowest Low)) * 100
      const currentClose = candles[i].close;
      const range = highestHigh - lowestLow;
      const kValue = range > 0 ? ((currentClose - lowestLow) / range) * 100 : 50;

      kValues.push(kValue);
    }

    // Calculate %D (SMA of %K)
    for (let i = dPeriod - 1; i < kValues.length; i++) {
      const slice = kValues.slice(i - dPeriod + 1, i + 1);
      const sum = slice.reduce((acc, val) => acc + val, 0);
      const dValue = sum / dPeriod;

      result.push({
        k: kValues[i],
        d: dValue
      });
    }

    return result;
  }

  private calculateATR(candles: Candle[], period: number = 14): number[] {
    const atr: number[] = [];

    if (candles.length < 2) {
      return atr;
    }

    // Calculate true range for each candle
    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const trueRange = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(trueRange);
    }

    if (trueRanges.length < period) {
      return atr;
    }

    // First ATR is SMA of first 'period' true ranges
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += trueRanges[i];
    }
    atr.push(sum / period);

    // Subsequent ATRs use Wilder's smoothing: ATR = (prevATR * (period - 1) + currentTR) / period
    for (let i = period; i < trueRanges.length; i++) {
      const prevATR = atr[atr.length - 1];
      const currentTR = trueRanges[i];
      const newATR = (prevATR * (period - 1) + currentTR) / period;
      atr.push(newATR);
    }

    return atr;
  }
}
