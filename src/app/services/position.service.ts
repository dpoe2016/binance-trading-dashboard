import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, interval, combineLatest } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { Position, Order, OrderSide, OrderStatus, Candle } from '../models/trading.model';
import { BinanceService } from './binance.service';
import { OrderService } from './order.service';

export interface PositionSizing {
  recommendedSize: number;
  maxSize: number;
  riskAmount: number;
  riskPercentage: number;
  leverage: number;
}

export interface RiskReward {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  winProbability?: number;
}

export interface PositionMetrics {
  position: Position;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalPnL: number;
  averageEntryPrice: number;
  currentPrice: number;
  positionValue: number;
  marginUsed: number;
  liquidationPrice: number;
  daysHeld: number;
}

@Injectable({
  providedIn: 'root'
})
export class PositionService {
  private positions: Position[] = [];
  private positionsSubject = new BehaviorSubject<Position[]>([]);
  private positionMetrics: Map<string, PositionMetrics> = new Map();
  private positionMetricsSubject = new BehaviorSubject<Map<string, PositionMetrics>>(new Map());

  // Observable streams
  public positions$ = this.positionsSubject.asObservable();
  public positionMetrics$ = this.positionMetricsSubject.asObservable();

  // Default risk parameters
  private defaultRiskPercentage = 2; // 2% risk per trade
  private defaultLeverage = 1;

  constructor(
    private binanceService: BinanceService,
    private orderService: OrderService
  ) {
    this.initializePositionTracking();
  }

  /**
   * Initialize position tracking
   */
  private initializePositionTracking(): void {
    // Load positions every 5 seconds when there are active positions
    interval(5000).pipe(
      switchMap(() => this.loadPositions()),
      catchError(error => {
        console.error('Error loading positions:', error);
        return of([]);
      })
    ).subscribe(positions => {
      this.positions = positions;
      this.positionsSubject.next([...positions]);
      this.updatePositionMetrics();
    });

    // Listen to order fills to update positions
    this.orderService.orders$.subscribe(orders => {
      const filledOrders = orders.filter(order => order.status === OrderStatus.FILLED);
      this.processFilledOrders(filledOrders);
    });
  }

  /**
   * Load all positions
   */
  loadPositions(): Observable<Position[]> {
    return this.binanceService.getPositions().pipe(
      map((positions: Position[]) => positions.filter((pos: any) => parseFloat(pos.positionAmt) !== 0)),
      catchError((error: any) => {
        console.error('Error loading positions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get position by symbol
   */
  getPosition(symbol: string): Observable<Position | null> {
    const position = this.positions.find(pos => pos.symbol === symbol);
    return of(position || null);
  }

  /**
   * Get position metrics
   */
  getPositionMetrics(symbol: string): Observable<PositionMetrics | null> {
    const metrics = this.positionMetrics.get(symbol);
    return of(metrics || null);
  }

  /**
   * Calculate position sizing
   */
  calculatePositionSizing(
    accountBalance: number,
    entryPrice: number,
    stopLoss: number,
    riskPercentage?: number,
    leverage?: number
  ): PositionSizing {
    const risk = riskPercentage || this.defaultRiskPercentage;
    const lev = leverage || this.defaultLeverage;

    const riskAmount = accountBalance * (risk / 100);
    const priceDistance = Math.abs(entryPrice - stopLoss);
    const priceDistancePercent = priceDistance / entryPrice;

    // Calculate position size based on risk
    const recommendedSize = (riskAmount / priceDistance) * lev;

    // Calculate maximum size based on balance and leverage
    const maxSize = (accountBalance * lev) / entryPrice;

    return {
      recommendedSize: Math.min(recommendedSize, maxSize),
      maxSize,
      riskAmount,
      riskPercentage: risk,
      leverage: lev
    };
  }

  /**
   * Calculate risk/reward ratio
   */
  calculateRiskReward(
    entryPrice: number,
    stopLoss: number,
    takeProfit: number,
    positionSize: number
  ): RiskReward {
    const riskDistance = Math.abs(entryPrice - stopLoss);
    const rewardDistance = Math.abs(takeProfit - entryPrice);

    const riskAmount = riskDistance * positionSize;
    const rewardAmount = rewardDistance * positionSize;

    const riskRewardRatio = rewardAmount / riskAmount;

    return {
      entryPrice,
      stopLoss,
      takeProfit,
      riskAmount,
      rewardAmount,
      riskRewardRatio,
      winProbability: this.estimateWinProbability(riskRewardRatio)
    };
  }

  /**
   * Close position (market order)
   */
  closePosition(symbol: string, percentage: number = 100): Observable<Order> {
    const position = this.positions.find(pos => pos.symbol === symbol);

    if (!position) {
      throw new Error('Position not found');
    }

    const positionSize = Math.abs(parseFloat(position.positionAmt));
    const closeQuantity = (positionSize * percentage / 100).toFixed(6);
    const closeSide = parseFloat(position.positionAmt) > 0 ? OrderSide.SELL : OrderSide.BUY;

    const closeOrderRequest = {
      symbol,
      side: closeSide,
      type: 'MARKET' as any,
      quantity: closeQuantity,
      reduceOnly: true
    };

    return this.orderService.placeOrder(closeOrderRequest);
  }

  /**
   * Partially close position
   */
  partialClose(symbol: string, percentage: number): Observable<Order> {
    if (percentage <= 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    return this.closePosition(symbol, percentage);
  }

  /**
   * Update stop loss for position
   */
  updateStopLoss(symbol: string, newStopPrice: number): Observable<Order> {
    const position = this.positions.find(pos => pos.symbol === symbol);

    if (!position) {
      throw new Error('Position not found');
    }

    const positionSize = Math.abs(parseFloat(position.positionAmt));
    const stopSide = parseFloat(position.positionAmt) > 0 ? OrderSide.SELL : OrderSide.BUY;

    const stopOrderRequest = {
      symbol,
      side: stopSide,
      type: 'STOP_MARKET' as any,
      quantity: positionSize.toFixed(6),
      stopPrice: newStopPrice.toString(),
      reduceOnly: true
    };

    return this.orderService.placeOrder(stopOrderRequest);
  }

  /**
   * Calculate average entry price from filled orders
   */
  calculateAverageEntryPrice(symbol: string, orders: Order[]): number {
    const relevantOrders = orders.filter(order =>
      order.symbol === symbol &&
      order.status === OrderStatus.FILLED &&
      order.fills && order.fills.length > 0
    );

    if (relevantOrders.length === 0) {
      return 0;
    }

    let totalQuantity = 0;
    let totalValue = 0;

    relevantOrders.forEach(order => {
      order.fills?.forEach(fill => {
        const quantity = parseFloat(fill.qty);
        const price = parseFloat(fill.price);

        if (order.side === OrderSide.BUY) {
          totalQuantity += quantity;
          totalValue += quantity * price;
        } else {
          totalQuantity -= quantity;
          totalValue -= quantity * price;
        }
      });
    });

    return totalQuantity !== 0 ? Math.abs(totalValue / totalQuantity) : 0;
  }

  /**
   * Get position summary
   */
  getPositionSummary(): Observable<{
    totalPositions: number;
    totalUnrealizedPnL: number;
    totalRealizedPnL: number;
    totalPositionValue: number;
    totalMarginUsed: number;
    profitablePositions: number;
    losingPositions: number;
  }> {
    const summary = {
      totalPositions: this.positions.length,
      totalUnrealizedPnL: 0,
      totalRealizedPnL: 0,
      totalPositionValue: 0,
      totalMarginUsed: 0,
      profitablePositions: 0,
      losingPositions: 0
    };

    this.positionMetrics.forEach(metrics => {
      summary.totalUnrealizedPnL += metrics.unrealizedPnL;
      summary.totalPositionValue += metrics.positionValue;
      summary.totalMarginUsed += metrics.marginUsed;

      if (metrics.unrealizedPnL > 0) {
        summary.profitablePositions++;
      } else if (metrics.unrealizedPnL < 0) {
        summary.losingPositions++;
      }
    });

    return of(summary);
  }

  /**
   * Process filled orders to update position tracking
   */
  private processFilledOrders(filledOrders: Order[]): void {
    // Group orders by symbol
    const ordersBySymbol = new Map<string, Order[]>();

    filledOrders.forEach(order => {
      if (!ordersBySymbol.has(order.symbol)) {
        ordersBySymbol.set(order.symbol, []);
      }
      ordersBySymbol.get(order.symbol)!.push(order);
    });

    // Update position metrics for each symbol
    ordersBySymbol.forEach((orders, symbol) => {
      this.updatePositionMetricsForSymbol(symbol, orders);
    });
  }

  /**
   * Update position metrics for a specific symbol
   */
  private updatePositionMetricsForSymbol(symbol: string, orders: Order[]): void {
    const position = this.positions.find(pos => pos.symbol === symbol);
    if (!position) return;

    // Get current price using subscribeToPriceUpdates
    const unsubscribe = this.binanceService.subscribeToPriceUpdates(symbol, (priceStr: string) => {
      const currentPrice = parseFloat(priceStr);
      const averageEntryPrice = this.calculateAverageEntryPrice(symbol, orders);
      const positionSize = parseFloat(position.positionAmt);
      const positionValue = Math.abs(positionSize) * currentPrice;

      const unrealizedPnL = parseFloat(position.unRealizedProfit);
      const unrealizedPnLPercent = averageEntryPrice > 0 ?
        ((currentPrice - averageEntryPrice) / averageEntryPrice) * 100 * Math.sign(positionSize) : 0;

      const metrics: PositionMetrics = {
        position,
        unrealizedPnL,
        unrealizedPnLPercent,
        realizedPnL: 0, // Would need to track this separately
        totalPnL: unrealizedPnL,
        averageEntryPrice,
        currentPrice,
        positionValue,
        marginUsed: positionValue / parseFloat(position.leverage),
        liquidationPrice: parseFloat(position.liquidationPrice),
        daysHeld: this.calculateDaysHeld(orders)
      };

      this.positionMetrics.set(symbol, metrics);
      this.positionMetricsSubject.next(new Map(this.positionMetrics));

      // Unsubscribe after first update
      unsubscribe();
    });
  }

  /**
   * Update position metrics for all positions
   */
  private updatePositionMetrics(): void {
    this.positions.forEach(position => {
      this.orderService.orderHistory$.subscribe((orders: any) => {
        const symbolOrders = orders.filter((o: any) => o.symbol === position.symbol);
        this.updatePositionMetricsForSymbol(position.symbol, symbolOrders);
      });
    });
  }

  /**
   * Calculate days held for position
   */
  private calculateDaysHeld(orders: Order[]): number {
    const firstOrder = orders
      .filter(order => order.status === OrderStatus.FILLED)
      .sort((a, b) => a.time - b.time)[0];

    if (!firstOrder) return 0;

    const daysDiff = (Date.now() - firstOrder.time) / (1000 * 60 * 60 * 24);
    return Math.floor(daysDiff);
  }

  /**
   * Estimate win probability based on risk/reward ratio
   */
  private estimateWinProbability(riskRewardRatio: number): number {
    // Simple heuristic: higher R/R ratio allows for lower win rate
    // This is a simplified model - in practice you'd use historical data
    if (riskRewardRatio >= 3) return 0.35;
    if (riskRewardRatio >= 2) return 0.45;
    if (riskRewardRatio >= 1.5) return 0.55;
    if (riskRewardRatio >= 1) return 0.65;
    return 0.75;
  }

  /**
   * Set default risk parameters
   */
  setDefaultRiskParameters(riskPercentage: number, leverage: number): void {
    this.defaultRiskPercentage = Math.max(0.1, Math.min(10, riskPercentage)); // 0.1% - 10%
    this.defaultLeverage = Math.max(1, Math.min(100, leverage)); // 1x - 100x
  }

  /**
   * Get default risk parameters
   */
  getDefaultRiskParameters(): { riskPercentage: number; leverage: number } {
    return {
      riskPercentage: this.defaultRiskPercentage,
      leverage: this.defaultLeverage
    };
  }

  /**
   * Clear all position data (for testing)
   */
  clearPositionData(): void {
    this.positions = [];
    this.positionMetrics.clear();
    this.positionsSubject.next([]);
    this.positionMetricsSubject.next(new Map());
    console.log('📊 Position data cleared');
  }
}
