import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of, interval } from 'rxjs';
import { map, catchError, takeWhile } from 'rxjs/operators';
import {
  Order,
  CreateOrderRequest,
  OrderValidation,
  OrderConfirmation,
  OrderStatus,
  OrderType,
  OrderSide,
  TimeInForce,
  AccountBalance,
  OrderFillNotification
} from '../models/trading.model';
import { BinanceService } from './binance.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  private orderHistorySubject = new BehaviorSubject<Order[]>([]);
  private notificationsSubject = new BehaviorSubject<OrderFillNotification[]>([]);

  public orders$ = this.ordersSubject.asObservable();
  public orderHistory$ = this.orderHistorySubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  // Track orders being monitored for status updates
  private monitoredOrders = new Set<number>();

  constructor(private binanceService: BinanceService) {
    this.loadOpenOrders();
    this.loadOrderHistory();
    this.startOrderMonitoring();
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
    // Calculate without symbol info for now
    const estimatedFees = this.calculateEstimatedFees(orderRequest, null);
    const estimatedTotal = this.calculateEstimatedTotal(orderRequest, estimatedFees);

    return of({
      order: orderRequest,
      estimatedFees: estimatedFees.toFixed(8),
      estimatedTotal: estimatedTotal.toFixed(8),
      marketImpact: this.estimateMarketImpact(orderRequest),
      confirmation: false
    });
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

    return new Observable(observer => {
      this.binanceService.cancelOrder(symbol, orderId).then((response: any) => {
        const canceledOrder: Order = {
          ...response,
          symbol,
          orderId,
          clientOrderId: response.clientOrderId || '',
          price: '0',
          origQty: '0',
          executedQty: '0',
          status: OrderStatus.CANCELED,
          type: OrderType.MARKET,
          side: OrderSide.BUY,
          time: Date.now(),
          updateTime: Date.now()
        };

        this.updateOrderInList(canceledOrder);
        observer.next(canceledOrder);
        observer.complete();
      }).catch(error => {
        console.error('Error canceling order:', error);
        observer.error(new Error(`Failed to cancel order: ${error.message}`));
      });
    });
  }

  /**
   * Modify an existing order (cancel and replace)
   */
  modifyOrder(originalOrderId: number, newOrderRequest: CreateOrderRequest): Observable<Order> {
    console.log('Modifying order:', originalOrderId, newOrderRequest);

    return new Observable(observer => {
      this.cancelOrder(newOrderRequest.symbol, originalOrderId).subscribe({
        next: () => {
          this.placeOrder(newOrderRequest).subscribe({
            next: (order) => {
              observer.next(order);
              observer.complete();
            },
            error: (error) => {
              console.error('Error placing replacement order:', error);
              observer.error(new Error(`Failed to place replacement order: ${error.message}`));
            }
          });
        },
        error: (error) => {
          console.error('Error modifying order:', error);
          observer.error(new Error(`Failed to modify order: ${error.message}`));
        }
      });
    });
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

  /**
   * Start monitoring open orders for status updates
   */
  private startOrderMonitoring(): void {
    // Check order statuses every 3 seconds
    interval(3000).subscribe(() => {
      this.checkOrderUpdates();
    });
  }

  /**
   * Check for order status updates
   */
  private checkOrderUpdates(): void {
    const openOrders = this.ordersSubject.value;

    openOrders.forEach(order => {
      if (!this.monitoredOrders.has(order.orderId)) {
        this.monitoredOrders.add(order.orderId);
        this.monitorOrderStatus(order);
      }
    });
  }

  /**
   * Monitor a specific order until it's filled or canceled
   */
  private monitorOrderStatus(order: Order): void {
    interval(2000)
      .pipe(
        takeWhile(() => {
          const currentOrder = this.ordersSubject.value.find(o => o.orderId === order.orderId);
          return currentOrder !== undefined &&
            currentOrder.status !== OrderStatus.FILLED &&
            currentOrder.status !== OrderStatus.CANCELED &&
            currentOrder.status !== OrderStatus.REJECTED &&
            currentOrder.status !== OrderStatus.EXPIRED;
        })
      )
      .subscribe({
        next: () => {
          this.getOrderStatus(order.symbol, order.orderId).subscribe({
            next: (updatedOrder) => {
              this.handleOrderStatusUpdate(order, updatedOrder);
            },
            error: (error) => {
              console.error('Error monitoring order status:', error);
            }
          });
        },
        complete: () => {
          this.monitoredOrders.delete(order.orderId);
        }
      });
  }

  /**
   * Handle order status update and send notifications
   */
  private handleOrderStatusUpdate(originalOrder: Order, updatedOrder: Order): void {
    // Check if status has changed
    if (originalOrder.status !== updatedOrder.status) {
      this.updateOrderInList(updatedOrder);

      // Send notification
      this.sendOrderNotification(updatedOrder);
    }

    // Check for partial fills
    if (updatedOrder.executedQty !== originalOrder.executedQty &&
        parseFloat(updatedOrder.executedQty) > 0 &&
        updatedOrder.status !== OrderStatus.FILLED) {
      this.sendOrderNotification(updatedOrder, true);
    }
  }

  /**
   * Send order fill notification
   */
  private sendOrderNotification(order: Order, isPartialFill: boolean = false): void {
    let notificationType: 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELED' | 'REJECTED';
    let message: string;

    if (isPartialFill || order.status === OrderStatus.PARTIALLY_FILLED) {
      notificationType = 'PARTIALLY_FILLED';
      const fillPercent = (parseFloat(order.executedQty) / parseFloat(order.origQty)) * 100;
      message = `Order partially filled: ${order.symbol} ${order.side} ${order.executedQty}/${order.origQty} (${fillPercent.toFixed(1)}%)`;
    } else if (order.status === OrderStatus.FILLED) {
      notificationType = 'FILLED';
      const totalValue = parseFloat(order.executedQty) * parseFloat(order.price);
      message = `Order filled: ${order.side} ${order.executedQty} ${order.symbol} @ ${order.price} (Total: ${totalValue.toFixed(2)})`;
    } else if (order.status === OrderStatus.CANCELED) {
      notificationType = 'CANCELED';
      message = `Order canceled: ${order.symbol} ${order.side} ${order.origQty}`;
    } else if (order.status === OrderStatus.REJECTED) {
      notificationType = 'REJECTED';
      message = `Order rejected: ${order.symbol} ${order.side} ${order.origQty}`;
    } else {
      return;
    }

    const notification: OrderFillNotification = {
      order,
      message,
      timestamp: new Date(),
      type: notificationType
    };

    // Add to notifications list
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...currentNotifications.slice(0, 99)]);

    // Send browser notification
    this.sendBrowserNotification(notification);

    // Log to console
    console.log(`📢 ORDER NOTIFICATION: ${message}`);
  }

  /**
   * Send browser notification
   */
  private sendBrowserNotification(notification: OrderFillNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = notification.type === 'FILLED' ? '✅' :
                   notification.type === 'PARTIALLY_FILLED' ? '⏳' :
                   notification.type === 'CANCELED' ? '🚫' : '❌';

      new Notification(`${icon} Order ${notification.type}`, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: `order_${notification.order.orderId}`
      });
    }
  }

  /**
   * Get order notifications
   */
  getNotifications(): Observable<OrderFillNotification[]> {
    return this.notifications$;
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Request notification permission
   */
  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log(`Notification permission: ${permission}`);
      });
    }
  }
}
