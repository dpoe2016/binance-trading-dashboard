import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, Observable } from 'rxjs';
import {
  CreateOrderRequest,
  OrderType,
  OrderSide,
  TimeInForce,
  OrderValidation,
  OrderConfirmation,
  AccountBalance,
  OrderFillNotification
} from '../../models/trading.model';
import { OrderService } from '../../services/order.service';
import { BinanceService } from '../../services/binance.service';

@Component({
  selector: 'app-order-placement',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './order-placement.component.html',
  styleUrls: ['./order-placement.component.scss']
})
export class OrderPlacementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  orderForm: FormGroup;
  confirmationDialog = false;
  orderValidation: OrderValidation | null = null;
  orderConfirmation: OrderConfirmation | null = null;
  accountBalance: AccountBalance[] = [];
  currentPrice: number = 0;
  isPlacingOrder = false;
  notifications: OrderFillNotification[] = [];

  // Enums for template
  OrderType = OrderType;
  OrderSide = OrderSide;
  TimeInForce = TimeInForce;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private binanceService: BinanceService
  ) {
    this.orderForm = this.createOrderForm();
  }

  ngOnInit(): void {
    this.loadAccountBalance();
    this.setupFormValidation();
    this.loadNotifications();
    this.requestNotificationPermission();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createOrderForm(): FormGroup {
    return this.fb.group({
      symbol: ['BTCUSDT', Validators.required],
      side: [OrderSide.BUY, Validators.required],
      type: [OrderType.MARKET, Validators.required],
      quantity: ['', [Validators.required, Validators.min(0.00001)]],
      price: [''],
      stopPrice: [''],
      timeInForce: [TimeInForce.GTC],
      reduceOnly: [false],
      closePosition: [false]
    });
  }

  private setupFormValidation(): void {
    // Update validators when order type changes
    this.orderForm.get('type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((orderType: OrderType) => {
        this.updateValidators(orderType);
        this.validateForm();
      });

    // Validate form on any change
    this.orderForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.validateForm();
      });
  }

  private updateValidators(orderType: OrderType): void {
    const priceControl = this.orderForm.get('price');
    const stopPriceControl = this.orderForm.get('stopPrice');

    // Clear existing validators
    priceControl?.clearValidators();
    stopPriceControl?.clearValidators();

    // Set validators based on order type
    switch (orderType) {
      case OrderType.LIMIT:
      case OrderType.STOP_LOSS_LIMIT:
      case OrderType.TAKE_PROFIT_LIMIT:
        priceControl?.setValidators([Validators.required, Validators.min(0.00000001)]);
        break;
      case OrderType.STOP_LOSS:
      case OrderType.TAKE_PROFIT:
        stopPriceControl?.setValidators([Validators.required, Validators.min(0.00000001)]);
        break;
      case OrderType.STOP_LOSS_LIMIT:
      case OrderType.TAKE_PROFIT_LIMIT:
        stopPriceControl?.setValidators([Validators.required, Validators.min(0.00000001)]);
        break;
    }

    priceControl?.updateValueAndValidity();
    stopPriceControl?.updateValueAndValidity();
  }

  private validateForm(): void {
    if (this.orderForm.valid) {
      const orderRequest: CreateOrderRequest = this.getOrderRequest();
      this.orderValidation = this.orderService.validateOrder(orderRequest, this.accountBalance);
    } else {
      this.orderValidation = null;
    }
  }

  private loadAccountBalance(): void {
    this.binanceService.getAccountBalances()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (balance: AccountBalance[]) => {
          this.accountBalance = balance;
          this.validateForm();
        },
        error: (error: any) => {
          console.error('Error loading account balance:', error);
        }
      });
  }

  onSymbolChange(): void {
    const symbol = this.orderForm.get('symbol')?.value;
    if (symbol) {
      this.loadCurrentPrice(symbol);
    }
  }

  private loadCurrentPrice(symbol: string): void {
    // Subscribe to price updates from WebSocket
    const unsubscribe = this.binanceService.subscribeToPriceUpdates(symbol, (price: string) => {
      this.currentPrice = parseFloat(price);

      // Auto-fill price for limit orders
      if (this.orderForm.get('type')?.value === OrderType.LIMIT) {
        this.orderForm.patchValue({ price: price });
      }
    });

    // Unsubscribe on destroy
    this.destroy$.subscribe(() => unsubscribe());
  }

  onOrderTypeChange(): void {
    const orderType = this.orderForm.get('type')?.value;

    // Clear price and stop price when switching order types
    if (orderType === OrderType.MARKET) {
      this.orderForm.patchValue({ price: '', stopPrice: '' });
    } else if (orderType === OrderType.LIMIT && this.currentPrice) {
      this.orderForm.patchValue({ price: this.currentPrice.toFixed(8) });
    }
  }

  useMaxQuantity(): void {
    const symbol = this.orderForm.get('symbol')?.value;
    const side = this.orderForm.get('side')?.value;
    const price = this.orderForm.get('price')?.value || this.currentPrice;

    if (!symbol || !price) return;

    let maxQuantity = 0;

    if (side === OrderSide.BUY) {
      const quoteAsset = this.getQuoteAsset(symbol);
      const balance = this.accountBalance.find(b => b.asset === quoteAsset);
      if (balance) {
        maxQuantity = parseFloat(balance.free) / price * 0.99; // 99% to account for fees
      }
    } else {
      const baseAsset = this.getBaseAsset(symbol);
      const balance = this.accountBalance.find(b => b.asset === baseAsset);
      if (balance) {
        maxQuantity = parseFloat(balance.free) * 0.99; // 99% to account for fees
      }
    }

    if (maxQuantity > 0) {
      this.orderForm.patchValue({ quantity: maxQuantity.toFixed(8) });
    }
  }

  private getOrderRequest(): CreateOrderRequest {
    const formValue = this.orderForm.value;

    const orderRequest: CreateOrderRequest = {
      symbol: formValue.symbol,
      side: formValue.side,
      type: formValue.type,
      quantity: formValue.quantity,
      timeInForce: formValue.timeInForce,
      reduceOnly: formValue.reduceOnly,
      closePosition: formValue.closePosition
    };

    // Add optional fields based on order type
    if (formValue.price && [OrderType.LIMIT, OrderType.STOP_LOSS_LIMIT, OrderType.TAKE_PROFIT_LIMIT].includes(formValue.type)) {
      orderRequest.price = formValue.price;
    }

    if (formValue.stopPrice && [OrderType.STOP_LOSS, OrderType.STOP_LOSS_LIMIT, OrderType.TAKE_PROFIT, OrderType.TAKE_PROFIT_LIMIT].includes(formValue.type)) {
      orderRequest.stopPrice = formValue.stopPrice;
    }

    return orderRequest;
  }

  openConfirmationDialog(): void {
    if (!this.orderValidation?.isValid) return;

    const orderRequest = this.getOrderRequest();
    this.orderService.createOrderConfirmation(orderRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (confirmation) => {
          this.orderConfirmation = confirmation;
          this.confirmationDialog = true;
        },
        error: (error) => {
          console.error('Error creating order confirmation:', error);
        }
      });
  }

  confirmOrder(): void {
    if (!this.orderConfirmation) return;

    this.isPlacingOrder = true;

    this.orderService.placeOrder(this.orderConfirmation.order)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          console.log('Order placed successfully:', order);
          this.closeConfirmationDialog();
          this.resetForm();
          this.isPlacingOrder = false;
          // You could show a success notification here
        },
        error: (error) => {
          console.error('Error placing order:', error);
          this.isPlacingOrder = false;
          // You could show an error notification here
        }
      });
  }

  closeConfirmationDialog(): void {
    this.confirmationDialog = false;
    this.orderConfirmation = null;
  }

  private resetForm(): void {
    this.orderForm.reset({
      symbol: 'BTCUSDT',
      side: OrderSide.BUY,
      type: OrderType.MARKET,
      timeInForce: TimeInForce.GTC,
      reduceOnly: false,
      closePosition: false
    });
    this.orderValidation = null;
  }

  private getQuoteAsset(symbol: string): string {
    if (symbol.endsWith('USDT')) return 'USDT';
    if (symbol.endsWith('BUSD')) return 'BUSD';
    if (symbol.endsWith('BTC')) return 'BTC';
    return 'USDT';
  }

  private getBaseAsset(symbol: string): string {
    if (symbol.endsWith('USDT')) return symbol.slice(0, -4);
    if (symbol.endsWith('BUSD')) return symbol.slice(0, -4);
    if (symbol.endsWith('BTC')) return symbol.slice(0, -3);
    return symbol.slice(0, -4);
  }

  private loadNotifications(): void {
    this.orderService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications.slice(0, 5); // Show only last 5
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        }
      });
  }

  private requestNotificationPermission(): void {
    this.orderService.requestNotificationPermission();
  }

  dismissNotification(index: number): void {
    this.notifications.splice(index, 1);
  }

  clearAllNotifications(): void {
    this.orderService.clearNotifications();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'FILLED': return '✅';
      case 'PARTIALLY_FILLED': return '⏳';
      case 'CANCELED': return '🚫';
      case 'REJECTED': return '❌';
      default: return '📢';
    }
  }

  getNotificationClass(type: string): string {
    switch (type) {
      case 'FILLED': return 'notification-success';
      case 'PARTIALLY_FILLED': return 'notification-info';
      case 'CANCELED': return 'notification-warning';
      case 'REJECTED': return 'notification-error';
      default: return 'notification-default';
    }
  }

  // Helper methods for template
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

  isFieldRequired(fieldName: string): boolean {
    const field = this.orderForm.get(fieldName);
    return field?.hasError('required') && field?.touched || false;
  }

  getFieldError(fieldName: string): string {
    const field = this.orderForm.get(fieldName);
    if (field?.hasError('required')) return `${fieldName} is required`;
    if (field?.hasError('min')) return `${fieldName} must be greater than 0`;
    return '';
  }
}
