import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import {
  Order,
  OrderStatus,
  OrderType,
  OrderSide,
  CreateOrderRequest
} from '../../models/trading.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  openOrders: Order[] = [];
  orderHistory: Order[] = [];
  selectedTab = 'open';
  isLoading = false;
  cancellingOrderId: number | null = null;

  // Enums for template
  OrderStatus = OrderStatus;
  OrderType = OrderType;
  OrderSide = OrderSide;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
    this.subscribeToOrderUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrders(): void {
    this.isLoading = true;
    this.orderService.loadOpenOrders();
    this.orderService.loadOrderHistory();

    // Loading will be complete when subscriptions receive data
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  private subscribeToOrderUpdates(): void {
    // Subscribe to open orders
    this.orderService.orders$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders) => {
          this.openOrders = orders.sort((a, b) => b.time - a.time);
        },
        error: (error) => {
          console.error('Error loading open orders:', error);
        }
      });

    // Subscribe to order history
    this.orderService.orderHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders) => {
          this.orderHistory = orders.sort((a, b) => b.updateTime - a.updateTime);
        },
        error: (error) => {
          console.error('Error loading order history:', error);
        }
      });
  }

  selectTab(tab: 'open' | 'history'): void {
    this.selectedTab = tab;
  }

  refreshOrders(): void {
    this.loadOrders();
  }

  cancelOrder(order: Order): void {
    if (this.cancellingOrderId === order.orderId) return;

    this.cancellingOrderId = order.orderId;

    this.orderService.cancelOrder(order.symbol, order.orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cancelledOrder) => {
          console.log('Order cancelled successfully:', cancelledOrder);
          this.cancellingOrderId = null;
          // Order will be automatically moved to history via the service
        },
        error: (error) => {
          console.error('Error cancelling order:', error);
          this.cancellingOrderId = null;
          // You could show an error notification here
        }
      });
  }

  modifyOrder(order: Order): void {
    // This would open a modify order dialog
    // For now, just log the action
    console.log('Modify order:', order);
    // You could implement a modify order modal here
  }

  getOrderStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.NEW:
        return 'status-new';
      case OrderStatus.PARTIALLY_FILLED:
        return 'status-partial';
      case OrderStatus.FILLED:
        return 'status-filled';
      case OrderStatus.CANCELED:
        return 'status-cancelled';
      case OrderStatus.REJECTED:
        return 'status-rejected';
      case OrderStatus.EXPIRED:
        return 'status-expired';
      default:
        return 'status-default';
    }
  }

  getOrderTypeLabel(type: OrderType): string {
    switch (type) {
      case OrderType.MARKET: return 'Market';
      case OrderType.LIMIT: return 'Limit';
      case OrderType.STOP_LOSS: return 'Stop Loss';
      case OrderType.STOP_LOSS_LIMIT: return 'Stop Loss Limit';
      case OrderType.TAKE_PROFIT: return 'Take Profit';
      case OrderType.TAKE_PROFIT_LIMIT: return 'Take Profit Limit';
      case OrderType.LIMIT_MAKER: return 'Limit Maker';
      default: return type;
    }
  }

  getSideClass(side: OrderSide): string {
    return side === OrderSide.BUY ? 'side-buy' : 'side-sell';
  }

  formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString() + ' ' +
           new Date(timestamp).toLocaleTimeString();
  }

  formatPrice(price: string): string {
    const num = parseFloat(price);
    return num.toFixed(8).replace(/\.?0+$/, '');
  }

  calculateFilled(order: Order): number {
    const executed = parseFloat(order.executedQty || '0');
    const original = parseFloat(order.origQty);
    return original > 0 ? (executed / original) * 100 : 0;
  }

  canCancelOrder(order: Order): boolean {
    return order.status === OrderStatus.NEW ||
           order.status === OrderStatus.PARTIALLY_FILLED;
  }

  canModifyOrder(order: Order): boolean {
    return order.status === OrderStatus.NEW;
  }

  getOrderValue(order: Order): number {
    const quantity = parseFloat(order.origQty);
    const price = parseFloat(order.price || '0');
    return quantity * price;
  }

  getTotalValue(orders: Order[]): number {
    return orders.reduce((total, order) => total + this.getOrderValue(order), 0);
  }

  getOrderCount(status?: OrderStatus): number {
    if (!status) {
      return this.selectedTab === 'open' ? this.openOrders.length : this.orderHistory.length;
    }

    const orders = this.selectedTab === 'open' ? this.openOrders : this.orderHistory;
    return orders.filter(order => order.status === status).length;
  }

  trackByOrderId(index: number, order: Order): number {
    return order.orderId;
  }
}
