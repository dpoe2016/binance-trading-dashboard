import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  AlertService,
  Alert,
  AlertType,
  AlertHistory,
  NotificationSettings
} from '../../services/alert.service';
import { BinanceService } from '../../services/binance.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})
export class AlertsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  alerts: Alert[] = [];
  alertHistory: AlertHistory[] = [];
  notificationSettings: NotificationSettings = {
    browserNotifications: true,
    emailNotifications: false,
    soundAlerts: true,
    popupAlerts: true,
    alertCooldown: 5,
    maxAlertsPerHour: 10
  };

  // UI State
  activeTab: 'active' | 'history' | 'create' | 'settings' = 'active';
  showCreateModal = false;
  editingAlert: Alert | null = null;

  // Create Alert Form
  newAlert = {
    name: '',
    symbol: 'BTCUSDT',
    type: AlertType.PRICE_ABOVE,
    value: 0,
    secondaryValue: 0,
    isActive: true
  };

  // Available symbols
  availableSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'DOGEUSDT'];

  // Expose AlertType enum to template
  AlertType = AlertType;

  // Alert types for UI
  alertTypes = [
    { value: AlertType.PRICE_ABOVE, label: 'Price Above', requiresValue: true, requiresSecondary: false },
    { value: AlertType.PRICE_BELOW, label: 'Price Below', requiresValue: true, requiresSecondary: false },
    { value: AlertType.PRICE_CROSS_ABOVE, label: 'Price Cross Above', requiresValue: true, requiresSecondary: false },
    { value: AlertType.PRICE_CROSS_BELOW, label: 'Price Cross Below', requiresValue: true, requiresSecondary: false },
    { value: AlertType.PERCENTAGE_CHANGE, label: 'Percentage Change', requiresValue: true, requiresSecondary: false },
    { value: AlertType.RSI_ABOVE, label: 'RSI Above', requiresValue: true, requiresSecondary: false },
    { value: AlertType.RSI_BELOW, label: 'RSI Below', requiresValue: true, requiresSecondary: false },
    { value: AlertType.RSI_CROSS_ABOVE, label: 'RSI Cross Above', requiresValue: true, requiresSecondary: false },
    { value: AlertType.RSI_CROSS_BELOW, label: 'RSI Cross Below', requiresValue: true, requiresSecondary: false },
    { value: AlertType.MACD_CROSS_ABOVE, label: 'MACD Cross Above Signal', requiresValue: false, requiresSecondary: false },
    { value: AlertType.MACD_CROSS_BELOW, label: 'MACD Cross Below Signal', requiresValue: false, requiresSecondary: false },
    { value: AlertType.SMA_CROSS_ABOVE, label: 'Price Cross Above SMA', requiresValue: true, requiresSecondary: false },
    { value: AlertType.SMA_CROSS_BELOW, label: 'Price Cross Below SMA', requiresValue: true, requiresSecondary: false },
    { value: AlertType.BOLLINGER_BREAKOUT_UPPER, label: 'Bollinger Upper Band Breakout', requiresValue: false, requiresSecondary: false },
    { value: AlertType.BOLLINGER_BREAKOUT_LOWER, label: 'Bollinger Lower Band Breakout', requiresValue: false, requiresSecondary: false },
    { value: AlertType.VOLUME_SPIKE, label: 'Volume Spike', requiresValue: true, requiresSecondary: false }
  ];

  // Current prices for reference
  currentPrices = new Map<string, number>();

  constructor(
    private alertService: AlertService,
    private binanceService: BinanceService
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
    this.loadAlertHistory();
    this.loadNotificationSettings();
    this.loadCurrentPrices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load alerts from service
   */
  loadAlerts(): void {
    this.alertService.getAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
      });
  }

  /**
   * Load alert history
   */
  loadAlertHistory(): void {
    this.alertService.alertHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe(history => {
        this.alertHistory = history.slice(0, 50); // Show last 50
      });
  }

  /**
   * Load notification settings
   */
  loadNotificationSettings(): void {
    this.alertService.notificationSettings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        this.notificationSettings = settings;
      });
  }

  /**
   * Load current prices for symbols
   */
  loadCurrentPrices(): void {
    this.availableSymbols.forEach(symbol => {
      this.binanceService.getCandles(symbol, '1m', 1).then(candles => {
        if (candles && candles.length > 0) {
          this.currentPrices.set(symbol, candles[0].close);
        }
      }).catch((err: Error) => {
        console.error(`Error loading price for ${symbol}:`, err);
      });
    });
  }

  /**
   * Set active tab
   */
  setTab(tab: 'active' | 'history' | 'create' | 'settings'): void {
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetCreateForm();
    }
  }

  /**
   * Create new alert
   */
  createAlert(): void {
    if (!this.newAlert.name || !this.newAlert.symbol) {
      alert('Please fill in all required fields');
      return;
    }

    const alertData = {
      name: this.newAlert.name,
      symbol: this.newAlert.symbol,
      type: this.newAlert.type,
      value: this.newAlert.value,
      secondaryValue: this.newAlert.secondaryValue,
      isActive: this.newAlert.isActive,
      condition: {
        symbol: this.newAlert.symbol,
        value: this.newAlert.value,
        secondaryValue: this.newAlert.secondaryValue
      }
    };

    this.alertService.createAlert(alertData).subscribe(alert => {
      console.log('Alert created:', alert);
      this.resetCreateForm();
      this.setTab('active');
    });
  }

  /**
   * Toggle alert active status
   */
  toggleAlert(alertId: string): void {
    this.alertService.toggleAlert(alertId).subscribe(alert => {
      if (alert) {
        console.log(`Alert ${alert.isActive ? 'activated' : 'deactivated'}`);
      }
    });
  }

  /**
   * Delete alert
   */
  deleteAlert(alertId: string): void {
    if (confirm('Are you sure you want to delete this alert?')) {
      this.alertService.deleteAlert(alertId).subscribe(success => {
        if (success) {
          console.log('Alert deleted');
        }
      });
    }
  }

  /**
   * Edit alert
   */
  editAlert(alert: Alert): void {
    this.editingAlert = alert;
    this.newAlert = {
      name: alert.name,
      symbol: alert.symbol,
      type: alert.type,
      value: alert.value,
      secondaryValue: alert.secondaryValue || 0,
      isActive: alert.isActive
    };
    this.setTab('create');
  }

  /**
   * Update existing alert
   */
  updateAlert(): void {
    if (!this.editingAlert) return;

    const updates = {
      name: this.newAlert.name,
      symbol: this.newAlert.symbol,
      type: this.newAlert.type,
      value: this.newAlert.value,
      secondaryValue: this.newAlert.secondaryValue,
      isActive: this.newAlert.isActive
    };

    this.alertService.updateAlert(this.editingAlert.id, updates).subscribe(alert => {
      if (alert) {
        console.log('Alert updated:', alert);
        this.editingAlert = null;
        this.resetCreateForm();
        this.setTab('active');
      }
    });
  }

  /**
   * Reset create form
   */
  resetCreateForm(): void {
    this.editingAlert = null;
    this.newAlert = {
      name: '',
      symbol: 'BTCUSDT',
      type: AlertType.PRICE_ABOVE,
      value: 0,
      secondaryValue: 0,
      isActive: true
    };
  }

  /**
   * Update notification settings
   */
  updateNotificationSettings(): void {
    this.alertService.updateNotificationSettings(this.notificationSettings);
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    if (confirm('Are you sure you want to clear all alert history?')) {
      this.alertService.clearAlertHistory();
    }
  }

  /**
   * Get current price for symbol
   */
  getCurrentPrice(symbol: string): number {
    return this.currentPrices.get(symbol) || 0;
  }

  /**
   * Get alert type label
   */
  getAlertTypeLabel(type: AlertType): string {
    const alertType = this.alertTypes.find(t => t.value === type);
    return alertType ? alertType.label : type;
  }

  /**
   * Get active alerts count
   */
  getActiveAlertsCount(): number {
    return this.alerts.filter(a => a.isActive && !a.triggered).length;
  }

  /**
   * Get triggered alerts count
   */
  getTriggeredAlertsCount(): number {
    return this.alerts.filter(a => a.triggered).length;
  }

  /**
   * Format date
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  }

  /**
   * Get alert status class
   */
  getAlertStatusClass(alert: Alert): string {
    if (alert.triggered) return 'triggered';
    if (alert.isActive) return 'active';
    return 'inactive';
  }

  /**
   * Get alert icon
   */
  getAlertIcon(type: AlertType): string {
    if (type.includes('PRICE')) return '💰';
    if (type.includes('RSI')) return '📊';
    if (type.includes('MACD')) return '📈';
    if (type.includes('VOLUME')) return '📢';
    return '🔔';
  }

  /**
   * Quick create price alert
   */
  quickCreatePriceAlert(symbol: string, type: 'above' | 'below'): void {
    const currentPrice = this.getCurrentPrice(symbol);
    if (!currentPrice) {
      alert('Unable to get current price. Please try again.');
      return;
    }

    const targetPrice = type === 'above' ? currentPrice * 1.05 : currentPrice * 0.95;

    this.newAlert = {
      name: `${symbol} ${type} ${targetPrice.toFixed(2)}`,
      symbol: symbol,
      type: type === 'above' ? AlertType.PRICE_ABOVE : AlertType.PRICE_BELOW,
      value: targetPrice,
      secondaryValue: 0,
      isActive: true
    };

    this.setTab('create');
  }
}
