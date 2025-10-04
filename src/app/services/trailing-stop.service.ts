import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { map, filter, switchMap, catchError, takeWhile } from 'rxjs/operators';
import { Position, Order, OrderSide, OrderType, CreateOrderRequest } from '../models/trading.model';
import { PositionService } from './position.service';
import { OrderService } from './order.service';
import { BinanceService } from './binance.service';

export enum TrailingStopType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  ATR_BASED = 'ATR_BASED'
}

export interface TrailingStop {
  id: string;
  symbol: string;
  positionSide: 'LONG' | 'SHORT';
  type: TrailingStopType;
  trailAmount: number; // Percentage or fixed amount or ATR multiplier
  activationPrice?: number; // Optional activation price
  highestPrice: number; // Highest price reached (for LONG)
  lowestPrice: number; // Lowest price reached (for SHORT)
  stopPrice: number; // Current stop price
  quantity: number;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: Date;
  lastUpdated: Date;
  atrPeriod?: number; // For ATR-based trailing stops
  currentATR?: number;
}

export interface TrailingStopAlert {
  id: string;
  trailingStopId: string;
  symbol: string;
  type: 'CREATED' | 'UPDATED' | 'TRIGGERED' | 'CANCELLED';
  message: string;
  timestamp: Date;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class TrailingStopService {
  private trailingStops: Map<string, TrailingStop> = new Map();
  private trailingStopsSubject = new BehaviorSubject<TrailingStop[]>([]);
  private alertsSubject = new BehaviorSubject<TrailingStopAlert[]>([]);
  private alerts: TrailingStopAlert[] = [];

  // Observable streams
  public trailingStops$ = this.trailingStopsSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();

  // Monitoring interval
  private monitoringInterval = 2000; // 2 seconds
  private isMonitoring = false;

  constructor(
    private positionService: PositionService,
    private orderService: OrderService,
    private binanceService: BinanceService
  ) {
    this.initializeMonitoring();
  }

  /**
   * Initialize trailing stop monitoring
   */
  private initializeMonitoring(): void {
    // Monitor trailing stops every 2 seconds
    interval(this.monitoringInterval).pipe(
      filter(() => this.trailingStops.size > 0),
      switchMap(() => this.updateAllTrailingStops())
    ).subscribe();
  }

  /**
   * Create a trailing stop
   */
  createTrailingStop(
    symbol: string,
    positionSide: 'LONG' | 'SHORT',
    type: TrailingStopType,
    trailAmount: number,
    quantity: number,
    activationPrice?: number,
    atrPeriod?: number
  ): Observable<TrailingStop> {
    return new Observable(observer => {
      // Get current price
      this.binanceService.subscribeToPriceUpdates(symbol, (priceStr: string) => {
        const currentPrice = parseFloat(priceStr);

        const trailingStop: TrailingStop = {
          id: this.generateId(),
          symbol,
          positionSide,
          type,
          trailAmount,
          activationPrice,
          highestPrice: positionSide === 'LONG' ? currentPrice : 0,
          lowestPrice: positionSide === 'SHORT' ? currentPrice : Infinity,
          stopPrice: this.calculateInitialStopPrice(currentPrice, positionSide, type, trailAmount),
          quantity,
          isActive: activationPrice ? currentPrice >= activationPrice : true,
          isTriggered: false,
          createdAt: new Date(),
          lastUpdated: new Date(),
          atrPeriod,
          currentATR: undefined
        };

        this.trailingStops.set(trailingStop.id, trailingStop);
        this.emitTrailingStops();

        // Create alert
        this.createAlert(trailingStop.id, symbol, 'CREATED',
          `Trailing stop created for ${symbol} (${type}, ${trailAmount}${type === TrailingStopType.PERCENTAGE ? '%' : ''})`);

        console.log('🎯 Trailing stop created:', trailingStop);
        observer.next(trailingStop);
        observer.complete();
      });
    });
  }

  /**
   * Update all trailing stops
   */
  private updateAllTrailingStops(): Observable<void> {
    const updates: Observable<void>[] = [];

    this.trailingStops.forEach(trailingStop => {
      if (!trailingStop.isTriggered) {
        updates.push(this.updateTrailingStop(trailingStop));
      }
    });

    if (updates.length === 0) {
      return of(undefined);
    }

    return new Observable(observer => {
      Promise.all(updates.map(update => update.toPromise()))
        .then(() => {
          observer.next();
          observer.complete();
        })
        .catch(error => {
          console.error('Error updating trailing stops:', error);
          observer.error(error);
        });
    });
  }

  /**
   * Update a single trailing stop
   */
  private updateTrailingStop(trailingStop: TrailingStop): Observable<void> {
    return new Observable(observer => {
      this.binanceService.subscribeToPriceUpdates(trailingStop.symbol, (priceStr: string) => {
        const currentPrice = parseFloat(priceStr);
        let updated = false;

        // Check activation
        if (!trailingStop.isActive && trailingStop.activationPrice) {
          if (trailingStop.positionSide === 'LONG' && currentPrice >= trailingStop.activationPrice) {
            trailingStop.isActive = true;
            updated = true;
            this.createAlert(trailingStop.id, trailingStop.symbol, 'UPDATED',
              `Trailing stop activated at ${currentPrice}`);
          } else if (trailingStop.positionSide === 'SHORT' && currentPrice <= trailingStop.activationPrice) {
            trailingStop.isActive = true;
            updated = true;
            this.createAlert(trailingStop.id, trailingStop.symbol, 'UPDATED',
              `Trailing stop activated at ${currentPrice}`);
          }
        }

        if (trailingStop.isActive) {
          // Update highest/lowest price
          if (trailingStop.positionSide === 'LONG') {
            if (currentPrice > trailingStop.highestPrice) {
              trailingStop.highestPrice = currentPrice;
              const newStopPrice = this.calculateStopPrice(
                currentPrice,
                trailingStop.positionSide,
                trailingStop.type,
                trailingStop.trailAmount,
                trailingStop.currentATR
              );

              if (newStopPrice > trailingStop.stopPrice) {
                trailingStop.stopPrice = newStopPrice;
                updated = true;
                console.log(`🎯 Trailing stop updated for ${trailingStop.symbol}: Stop price now ${newStopPrice}`);
              }
            }

            // Check if stop is triggered
            if (currentPrice <= trailingStop.stopPrice) {
              this.triggerTrailingStop(trailingStop, currentPrice);
            }
          } else {
            // SHORT position
            if (currentPrice < trailingStop.lowestPrice) {
              trailingStop.lowestPrice = currentPrice;
              const newStopPrice = this.calculateStopPrice(
                currentPrice,
                trailingStop.positionSide,
                trailingStop.type,
                trailingStop.trailAmount,
                trailingStop.currentATR
              );

              if (newStopPrice < trailingStop.stopPrice) {
                trailingStop.stopPrice = newStopPrice;
                updated = true;
                console.log(`🎯 Trailing stop updated for ${trailingStop.symbol}: Stop price now ${newStopPrice}`);
              }
            }

            // Check if stop is triggered
            if (currentPrice >= trailingStop.stopPrice) {
              this.triggerTrailingStop(trailingStop, currentPrice);
            }
          }
        }

        if (updated) {
          trailingStop.lastUpdated = new Date();
          this.emitTrailingStops();
        }

        observer.next();
        observer.complete();
      });
    });
  }

  /**
   * Calculate initial stop price
   */
  private calculateInitialStopPrice(
    currentPrice: number,
    positionSide: 'LONG' | 'SHORT',
    type: TrailingStopType,
    trailAmount: number
  ): number {
    return this.calculateStopPrice(currentPrice, positionSide, type, trailAmount);
  }

  /**
   * Calculate stop price
   */
  private calculateStopPrice(
    currentPrice: number,
    positionSide: 'LONG' | 'SHORT',
    type: TrailingStopType,
    trailAmount: number,
    atr?: number
  ): number {
    switch (type) {
      case TrailingStopType.PERCENTAGE:
        if (positionSide === 'LONG') {
          return currentPrice * (1 - trailAmount / 100);
        } else {
          return currentPrice * (1 + trailAmount / 100);
        }

      case TrailingStopType.FIXED_AMOUNT:
        if (positionSide === 'LONG') {
          return currentPrice - trailAmount;
        } else {
          return currentPrice + trailAmount;
        }

      case TrailingStopType.ATR_BASED:
        if (!atr) {
          // Fallback to percentage if ATR not available
          return this.calculateStopPrice(currentPrice, positionSide, TrailingStopType.PERCENTAGE, 2);
        }
        if (positionSide === 'LONG') {
          return currentPrice - (atr * trailAmount);
        } else {
          return currentPrice + (atr * trailAmount);
        }

      default:
        return currentPrice;
    }
  }

  /**
   * Trigger trailing stop
   */
  private triggerTrailingStop(trailingStop: TrailingStop, currentPrice: number): void {
    if (trailingStop.isTriggered) return;

    trailingStop.isTriggered = true;
    trailingStop.lastUpdated = new Date();

    // Create market order to close position
    const orderSide = trailingStop.positionSide === 'LONG' ? OrderSide.SELL : OrderSide.BUY;

    const orderRequest: CreateOrderRequest = {
      symbol: trailingStop.symbol,
      side: orderSide,
      type: OrderType.MARKET,
      quantity: trailingStop.quantity.toString()
    };

    this.orderService.placeOrder(orderRequest).subscribe({
      next: (order) => {
        console.log(`🎯 Trailing stop triggered for ${trailingStop.symbol}:`, order);
        this.createAlert(trailingStop.id, trailingStop.symbol, 'TRIGGERED',
          `Trailing stop triggered at ${currentPrice}. Position closed.`,
          { order, triggerPrice: currentPrice });

        // Remove trailing stop after trigger
        setTimeout(() => {
          this.trailingStops.delete(trailingStop.id);
          this.emitTrailingStops();
        }, 5000);
      },
      error: (error) => {
        console.error(`Error triggering trailing stop for ${trailingStop.symbol}:`, error);
        // Don't remove on error, allow retry
        trailingStop.isTriggered = false;
      }
    });

    this.emitTrailingStops();
  }

  /**
   * Cancel trailing stop
   */
  cancelTrailingStop(trailingStopId: string): void {
    const trailingStop = this.trailingStops.get(trailingStopId);
    if (trailingStop) {
      this.trailingStops.delete(trailingStopId);
      this.emitTrailingStops();

      this.createAlert(trailingStopId, trailingStop.symbol, 'CANCELLED',
        `Trailing stop cancelled for ${trailingStop.symbol}`);

      console.log('🎯 Trailing stop cancelled:', trailingStopId);
    }
  }

  /**
   * Get trailing stop by ID
   */
  getTrailingStop(trailingStopId: string): TrailingStop | undefined {
    return this.trailingStops.get(trailingStopId);
  }

  /**
   * Get trailing stops for symbol
   */
  getTrailingStopsForSymbol(symbol: string): TrailingStop[] {
    return Array.from(this.trailingStops.values()).filter(ts => ts.symbol === symbol);
  }

  /**
   * Get all trailing stops
   */
  getAllTrailingStops(): TrailingStop[] {
    return Array.from(this.trailingStops.values());
  }

  /**
   * Create alert
   */
  private createAlert(
    trailingStopId: string,
    symbol: string,
    type: 'CREATED' | 'UPDATED' | 'TRIGGERED' | 'CANCELLED',
    message: string,
    data?: any
  ): void {
    const alert: TrailingStopAlert = {
      id: this.generateId(),
      trailingStopId,
      symbol,
      type,
      message,
      timestamp: new Date(),
      data
    };

    this.alerts.push(alert);
    this.alertsSubject.next([...this.alerts]);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.alertsSubject.next([]);
  }

  /**
   * Emit trailing stops
   */
  private emitTrailingStops(): void {
    this.trailingStopsSubject.next(Array.from(this.trailingStops.values()));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all trailing stops
   */
  clearAllTrailingStops(): void {
    this.trailingStops.clear();
    this.emitTrailingStops();
    console.log('🎯 All trailing stops cleared');
  }
}
