import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Order,
  CreateOrderRequest,
  OrderValidation,
  OrderConfirmation,
  OrderStatus,
  OrderType,
  OrderSide,
  TimeInForce,
  AccountBalance
} from '../models/trading.model';
import { BinanceService } from './binance.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  private orderHistorySubject = new BehaviorSubject<Order[]>([]);

  public orders$ = this.ordersSubject.asObservable();
  public orderHistory$ = this.orderHistorySubject.asObservable();

  constructor(private binanceService: BinanceService) {
    this.loadOpenOrders();
    this.loadOrderHistory();
  }

  /**
   * Validate order before placement
   */
  validateOrder(orderRequest: CreateOrderRequest, balance?: AccountBalance[]): OrderValidation {
    const validation: OrderValidation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Basic validation
    if (!orderRequest.symbol) {
      validation.errors.push('Symbol is required');
    }

    if (!orderRequest.quantity || parseFloat(orderRequest.quantity) <= 0) {
      validation.errors.push('Quantity must be greater than 0');
    }

    if (orderRequest.type === OrderType.LIMIT && (!orderRequest.price || parseFloat(orderRequest.price) <= 0)) {
      validation.errors.push('Price is required for limit orders');
    }

    if (orderRequest.type === OrderType.STOP_LOSS && (!orderRequest.stopPrice || parseFloat(orderRequest.stopPrice) <= 0)) {
      validation.errors.push('Stop price is required for stop loss orders');
    }

    // Balance validation if available
    if (balance && orderRequest.side === OrderSide.BUY) {
      const requiredBalance = this.calculateRequiredBalance(orderRequest);
      const availableBalance = this.getAvailableBalance(balance, this.getQuoteAsset(orderRequest.symbol));

      if (requiredBalance > availableBalance) {
        validation.errors.push(`Insufficient balance. Required: ${requiredBalance.toFixed(8)}, Available: ${availableBalance.toFixed(8)}`);
      }
    }

    // Risk validation warnings
    if (orderRequest.type === OrderType.MARKET) {
      validation.warnings.push('Market orders may experience slippage');
    }

    const quantity = parseFloat(orderRequest.quantity);
    if (quantity > 1000) {
      validation.warnings.push('Large order size may impact market price');
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  }

  /**
   * Create order confirmation details
   */
  createOrderConfirmation(orderRequest: CreateOrderRequest): Observable<OrderConfirmation> {
    return this.binanceService.getSymbolInfo(orderRequest.symbol).pipe(
      map(symbolInfo => {
        const estimatedFees = this.calculateEstimatedFees(orderRequest, symbolInfo);
        const estimatedTotal = this.calculateEstimatedTotal(orderRequest, estimatedFees);

        return {
          order: orderRequest,
          estimatedFees: estimatedFees.toFixed(8),
          estimatedTotal: estimatedTotal.toFixed(8),
          marketImpact: this.estimateMarketImpact(orderRequest),
          confirmation: false
        };
      }),
      catchError(error => {
        console.error('Error creating order confirmation:', error);
        return of({
          order: orderRequest,
          estimatedFees: '0',
          estimatedTotal: '0',
          confirmation: false
        });
      })
    );
  }

  /**
   * Place a new order
   */
  placeOrder(orderRequest: CreateOrderRequest): Observable<Order> {
    console.log('Placing order:', orderRequest);

    return this.binanceService.createOrder(orderRequest).pipe(
      map((response: any) => {
        const order: Order = {
          symbol: response.symbol,
          orderId: response.orderId,
          clientOrderId: response.clientOrderId,
          price: response.price || '0',
          origQty: response.origQty,
          executedQty: response.executedQty || '0',
          status: response.status as OrderStatus,
          type: response.type as OrderType,
          side: response.side as OrderSide,
          time: response.transactTime || Date.now(),
          updateTime: response.transactTime || Date.now(),
          timeInForce: response.timeInForce as TimeInForce,
          stopPrice: response.stopPrice,
          fills: response.fills || []
        };

        this.addOrderToList(order);
        return order;
      }),
      catchError(error => {
        console.error('Error placing order:', error);
        return throwError(() => new Error(`Failed to place order: ${error.message}`));
      })
    );
  }

  /**
   * Cancel an existing order
   */
  cancelOrder(symbol: string, orderId: number): Observable<Order> {
    console.log('Canceling order:', orderId);

    return this.binanceService.cancelOrder(symbol, orderId).pipe(
      map((response: any) => {
        const canceledOrder: Order = {
          ...response,
          status: OrderStatus.CANCELED,
          updateTime: Date.now()
        };

        this.updateOrderInList(canceledOrder);
        return canceledOrder;
      }),
      catchError(error => {
        console.error('Error canceling order:', error);
        return throwError(() => new Error(`Failed to cancel order: ${error.message}`));
      })
    );
  }

  /**
   * Modify an existing order (cancel and replace)
   */
  modifyOrder(originalOrderId: number, newOrderRequest: CreateOrderRequest): Observable<Order> {
    console.log('Modifying order:', originalOrderId, newOrderRequest);

    return this.cancelOrder(newOrderRequest.symbol, originalOrderId).pipe(
      map(() => this.placeOrder(newOrderRequest))
    ).pipe(
      map(result => result as Order),
      catchError(error => {
        console.error('Error modifying order:', error);
        return throwError(() => new Error(`Failed to modify order: ${error.message}`));
      })
    );
  }

  /**
   * Get order status
   */
  getOrderStatus(symbol: string, orderId: number): Observable<Order> {
    return this.binanceService.getOrder(symbol, orderId).pipe(
      map((response: any) => ({
        symbol: response.symbol,
        orderId: response.orderId,
        clientOrderId: response.clientOrderId,
        price: response.price,
        origQty: response.origQty,
        executedQty: response.executedQty,
        status: response.status as OrderStatus,
        type: response.type as OrderType,
        side: response.side as OrderSide,
        time: response.time,
        updateTime: response.updateTime,
        timeInForce: response.timeInForce as TimeInForce,
        stopPrice: response.stopPrice
      })),
      catchError(error => {
        console.error('Error getting order status:', error);
        return throwError(() => new Error(`Failed to get order status: ${error.message}`));
      })
    );
  }

  /**
   * Load open orders
   */
  loadOpenOrders(): void {
    this.binanceService.getOpenOrders().subscribe({
      next: (orders: Order[]) => {
        this.ordersSubject.next(orders);
      },
      error: (error) => {
        console.error('Error loading open orders:', error);
      }
    });
  }

  /**
   * Load order history
   */
  loadOrderHistory(): void {
    this.binanceService.getOrderHistory().subscribe({
      next: (orders: Order[]) => {
        this.orderHistorySubject.next(orders);
      },
      error: (error) => {
        console.error('Error loading order history:', error);
      }
    });
  }

  // Private helper methods
  private addOrderToList(order: Order): void {
    const currentOrders = this.ordersSubject.value;
    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELED) {
      // Add to history
      const currentHistory = this.orderHistorySubject.value;
      this.orderHistorySubject.next([order, ...currentHistory]);
    } else {
      // Add to open orders
      this.ordersSubject.next([order, ...currentOrders]);
    }
  }

  private updateOrderInList(order: Order): void {
    const currentOrders = this.ordersSubject.value;
    const updatedOrders = currentOrders.map(o =>
      o.orderId === order.orderId ? order : o
    );

    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELED) {
      // Remove from open orders and add to history
      const openOrders = updatedOrders.filter(o => o.orderId !== order.orderId);
      this.ordersSubject.next(openOrders);

      const currentHistory = this.orderHistorySubject.value;
      this.orderHistorySubject.next([order, ...currentHistory]);
    } else {
      this.ordersSubject.next(updatedOrders);
    }
  }

  private calculateRequiredBalance(orderRequest: CreateOrderRequest): number {
    const quantity = parseFloat(orderRequest.quantity);
    const price = parseFloat(orderRequest.price || '0');

    if (orderRequest.type === OrderType.MARKET) {
      // For market orders, estimate with some buffer
      return quantity * price * 1.05;
    }

    return quantity * price;
  }

  private getAvailableBalance(balances: AccountBalance[], asset: string): number {
    const balance = balances.find(b => b.asset === asset);
    return balance ? parseFloat(balance.free) : 0;
  }

  private getQuoteAsset(symbol: string): string {
    // Simple logic - assumes USDT/BUSD/BTC as quote assets
    if (symbol.endsWith('USDT')) return 'USDT';
    if (symbol.endsWith('BUSD')) return 'BUSD';
    if (symbol.endsWith('BTC')) return 'BTC';
    return 'USDT'; // default
  }

  private calculateEstimatedFees(orderRequest: CreateOrderRequest, symbolInfo: any): number {
    // Simplified fee calculation - typically 0.1% for spot trading
    const quantity = parseFloat(orderRequest.quantity);
    const price = parseFloat(orderRequest.price || '1');
    const notionalValue = quantity * price;

    return notionalValue * 0.001; // 0.1% fee
  }

  private calculateEstimatedTotal(orderRequest: CreateOrderRequest, fees: number): number {
    const quantity = parseFloat(orderRequest.quantity);
    const price = parseFloat(orderRequest.price || '1');

    if (orderRequest.side === OrderSide.BUY) {
      return (quantity * price) + fees;
    } else {
      return (quantity * price) - fees;
    }
  }

  private estimateMarketImpact(orderRequest: CreateOrderRequest): number {
    // Simplified market impact estimation
    const quantity = parseFloat(orderRequest.quantity);

    if (quantity > 1000) return 0.5; // High impact
    if (quantity > 100) return 0.2;  // Medium impact
    return 0.1; // Low impact
  }
}
