import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, interval, combineLatest } from 'rxjs';
import { map, filter, distinctUntilChanged } from 'rxjs/operators';
import { Candle } from '../models/trading.model';
import { BinanceService } from './binance.service';

export interface Alert {
  id: string;
  name: string;
  symbol: string;
  type: AlertType;
  condition: AlertCondition;
  value: number;
  secondaryValue?: number; // For crossover alerts
  isActive: boolean;
  triggered: boolean;
  triggeredAt?: Date;
  createdAt: Date;
  lastChecked?: Date;
  message?: string;
  notificationSent?: boolean;
}

export enum AlertType {
  PRICE_ABOVE = 'PRICE_ABOVE',
  PRICE_BELOW = 'PRICE_BELOW',
  PRICE_CROSS_ABOVE = 'PRICE_CROSS_ABOVE',
  PRICE_CROSS_BELOW = 'PRICE_CROSS_BELOW',
  PERCENTAGE_CHANGE = 'PERCENTAGE_CHANGE',
  RSI_ABOVE = 'RSI_ABOVE',
  RSI_BELOW = 'RSI_BELOW',
  RSI_CROSS_ABOVE = 'RSI_CROSS_ABOVE',
  RSI_CROSS_BELOW = 'RSI_CROSS_BELOW',
  MACD_CROSS_ABOVE = 'MACD_CROSS_ABOVE',
  MACD_CROSS_BELOW = 'MACD_CROSS_BELOW',
  SMA_CROSS_ABOVE = 'SMA_CROSS_ABOVE',
  SMA_CROSS_BELOW = 'SMA_CROSS_BELOW',
  BOLLINGER_BREAKOUT_UPPER = 'BOLLINGER_BREAKOUT_UPPER',
  BOLLINGER_BREAKOUT_LOWER = 'BOLLINGER_BREAKOUT_LOWER',
  VOLUME_SPIKE = 'VOLUME_SPIKE',
  SUPPORT_RESISTANCE = 'SUPPORT_RESISTANCE'
}

export interface AlertCondition {
  symbol: string;
  timeframe?: string;
  indicator?: string;
  period?: number;
  value: number;
  secondaryValue?: number;
}

export interface NotificationSettings {
  browserNotifications: boolean;
  emailNotifications: boolean;
  soundAlerts: boolean;
  popupAlerts: boolean;
  alertCooldown: number; // Minutes between same alert
  maxAlertsPerHour: number;
}

export interface AlertHistory {
  alert: Alert;
  triggeredAt: Date;
  price: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alerts: Alert[] = [];
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  private alertHistory: AlertHistory[] = [];
  private alertHistorySubject = new BehaviorSubject<AlertHistory[]>([]);

  private notificationSettings: NotificationSettings = {
    browserNotifications: true,
    emailNotifications: false,
    soundAlerts: true,
    popupAlerts: true,
    alertCooldown: 5,
    maxAlertsPerHour: 10
  };
  private notificationSettingsSubject = new BehaviorSubject<NotificationSettings>(this.notificationSettings);

  // Alert evaluation tracking
  private alertCooldowns = new Map<string, Date>();
  private hourlyAlertCount = 0;
  private lastHourReset = new Date();

  // Observable streams
  public alerts$ = this.alertsSubject.asObservable();
  public alertHistory$ = this.alertHistorySubject.asObservable();
  public notificationSettings$ = this.notificationSettingsSubject.asObservable();

  // Market data cache for alert evaluation
  private marketDataCache = new Map<string, {
    price: number;
    candles: Candle[];
    lastUpdate: Date;
  }>();

  constructor(private binanceService: BinanceService) {
    this.loadAlerts();
    this.loadNotificationSettings();
    this.initializeAlertEvaluation();
    this.requestNotificationPermission();
  }

  /**
   * Create a new alert
   */
  createAlert(alertData: Omit<Alert, 'id' | 'createdAt' | 'triggered' | 'triggeredAt' | 'lastChecked'>): Observable<Alert> {
    const alert: Alert = {
      ...alertData,
      id: this.generateAlertId(),
      createdAt: new Date(),
      triggered: false,
      lastChecked: new Date()
    };

    this.alerts.push(alert);
    this.updateAlertsSubject();
    this.saveAlerts();

    console.log(`🔔 Alert created: ${alert.name} for ${alert.symbol}`);
    return of(alert);
  }

  /**
   * Update an existing alert
   */
  updateAlert(alertId: string, updates: Partial<Alert>): Observable<Alert | null> {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) {
      return of(null);
    }

    this.alerts[alertIndex] = { ...this.alerts[alertIndex], ...updates };
    this.updateAlertsSubject();
    this.saveAlerts();

    console.log(`🔔 Alert updated: ${this.alerts[alertIndex].name}`);
    return of(this.alerts[alertIndex]);
  }

  /**
   * Delete an alert
   */
  deleteAlert(alertId: string): Observable<boolean> {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) {
      return of(false);
    }

    const deletedAlert = this.alerts.splice(alertIndex, 1)[0];
    this.updateAlertsSubject();
    this.saveAlerts();

    console.log(`🔔 Alert deleted: ${deletedAlert.name}`);
    return of(true);
  }

  /**
   * Toggle alert active status
   */
  toggleAlert(alertId: string): Observable<Alert | null> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return of(null);
    }

    alert.isActive = !alert.isActive;
    if (alert.isActive) {
      alert.triggered = false; // Reset trigger status when reactivating
    }

    this.updateAlertsSubject();
    this.saveAlerts();

    console.log(`🔔 Alert ${alert.isActive ? 'activated' : 'deactivated'}: ${alert.name}`);
    return of(alert);
  }

  /**
   * Get all alerts
   */
  getAlerts(): Observable<Alert[]> {
    return this.alerts$;
  }

  /**
   * Get alerts by symbol
   */
  getAlertsBySymbol(symbol: string): Observable<Alert[]> {
    return this.alerts$.pipe(
      map(alerts => alerts.filter(alert => alert.symbol === symbol))
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Observable<Alert[]> {
    return this.alerts$.pipe(
      map(alerts => alerts.filter(alert => alert.isActive && !alert.triggered))
    );
  }

  /**
   * Get triggered alerts
   */
  getTriggeredAlerts(): Observable<Alert[]> {
    return this.alerts$.pipe(
      map(alerts => alerts.filter(alert => alert.triggered))
    );
  }

  /**
   * Update notification settings
   */
  updateNotificationSettings(settings: Partial<NotificationSettings>): void {
    this.notificationSettings = { ...this.notificationSettings, ...settings };
    this.notificationSettingsSubject.next(this.notificationSettings);
    this.saveNotificationSettings();
    console.log('🔔 Notification settings updated:', this.notificationSettings);
  }

  /**
   * Get notification settings
   */
  getNotificationSettings(): NotificationSettings {
    return this.notificationSettings;
  }

  /**
   * Clear alert history
   */
  clearAlertHistory(): void {
    this.alertHistory = [];
    this.alertHistorySubject.next([]);
    this.saveAlertHistory();
    console.log('🔔 Alert history cleared');
  }

  /**
   * Initialize alert evaluation system
   */
  private initializeAlertEvaluation(): void {
    // Evaluate alerts every 5 seconds
    interval(5000).subscribe(() => {
      this.evaluateAlerts();
    });

    // Reset hourly alert count
    interval(60 * 60 * 1000).subscribe(() => { // Every hour
      this.hourlyAlertCount = 0;
      this.lastHourReset = new Date();
    });
  }

  /**
   * Evaluate all active alerts
   */
  private evaluateAlerts(): void {
    const activeAlerts = this.alerts.filter(alert => alert.isActive && !alert.triggered);

    if (activeAlerts.length === 0) {
      return;
    }

    // Group alerts by symbol to minimize API calls
    const alertsBySymbol = new Map<string, Alert[]>();
    activeAlerts.forEach(alert => {
      if (!alertsBySymbol.has(alert.symbol)) {
        alertsBySymbol.set(alert.symbol, []);
      }
      alertsBySymbol.get(alert.symbol)!.push(alert);
    });

    // Evaluate alerts for each symbol
    alertsBySymbol.forEach((symbolAlerts, symbol) => {
      this.evaluateSymbolAlerts(symbol, symbolAlerts);
    });
  }

  /**
   * Evaluate alerts for a specific symbol
   */
  private evaluateSymbolAlerts(symbol: string, alerts: Alert[]): void {
    // Get market data for the symbol
    this.getMarketData(symbol).subscribe(marketData => {
      if (!marketData) return;

      alerts.forEach(alert => {
        if (this.shouldSkipAlert(alert)) return;

        const isTriggered = this.evaluateAlertCondition(alert, marketData);

        if (isTriggered) {
          this.triggerAlert(alert, marketData.price);
        }

        alert.lastChecked = new Date();
      });

      this.updateAlertsSubject();
      this.saveAlerts();
    });
  }

  /**
   * Check if alert should be skipped due to cooldown
   */
  private shouldSkipAlert(alert: Alert): boolean {
    const cooldownKey = `${alert.id}_${alert.symbol}_${alert.type}`;
    const lastTrigger = this.alertCooldowns.get(cooldownKey);

    if (lastTrigger) {
      const cooldownMs = this.notificationSettings.alertCooldown * 60 * 1000;
      const timeSinceLastTrigger = Date.now() - lastTrigger.getTime();

      if (timeSinceLastTrigger < cooldownMs) {
        return true;
      }
    }

    // Check hourly limit
    if (this.hourlyAlertCount >= this.notificationSettings.maxAlertsPerHour) {
      return true;
    }

    return false;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(alert: Alert, marketData: { price: number; candles: Candle[] }): boolean {
    const { type, value, secondaryValue } = alert;
    const currentPrice = marketData.price;
    const candles = marketData.candles;

    switch (type) {
      case AlertType.PRICE_ABOVE:
        return currentPrice > value;

      case AlertType.PRICE_BELOW:
        return currentPrice < value;

      case AlertType.PRICE_CROSS_ABOVE:
        return this.evaluatePriceCross(candles, value, 'above');

      case AlertType.PRICE_CROSS_BELOW:
        return this.evaluatePriceCross(candles, value, 'below');

      case AlertType.PERCENTAGE_CHANGE:
        return this.evaluatePercentageChange(candles, value);

      case AlertType.RSI_ABOVE:
        return this.evaluateRSI(candles, 'above', value);

      case AlertType.RSI_BELOW:
        return this.evaluateRSI(candles, 'below', value);

      case AlertType.VOLUME_SPIKE:
        return this.evaluateVolumeSpike(candles, value);

      // Add more alert types as needed
      default:
        return false;
    }
  }

  /**
   * Evaluate price cross condition
   */
  private evaluatePriceCross(candles: Candle[], targetPrice: number, direction: 'above' | 'below'): boolean {
    if (candles.length < 2) return false;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    if (direction === 'above') {
      return previous.close <= targetPrice && current.close > targetPrice;
    } else {
      return previous.close >= targetPrice && current.close < targetPrice;
    }
  }

  /**
   * Evaluate percentage change
   */
  private evaluatePercentageChange(candles: Candle[], targetPercent: number): boolean {
    if (candles.length < 2) return false;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const percentChange = ((current.close - previous.close) / previous.close) * 100;

    return Math.abs(percentChange) >= Math.abs(targetPercent);
  }

  /**
   * Evaluate RSI condition (simplified)
   */
  private evaluateRSI(candles: Candle[], condition: 'above' | 'below', threshold: number): boolean {
    if (candles.length < 15) return false; // Need enough data for RSI

    const rsi = this.calculateRSI(candles, 14);
    const currentRSI = rsi[rsi.length - 1];

    return condition === 'above' ? currentRSI > threshold : currentRSI < threshold;
  }

  /**
   * Evaluate volume spike
   */
  private evaluateVolumeSpike(candles: Candle[], multiplier: number): boolean {
    if (candles.length < 20) return false;

    const current = candles[candles.length - 1];
    const recentCandles = candles.slice(-20, -1);
    const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;

    return current.volume >= avgVolume * multiplier;
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(alert: Alert, currentPrice: number): void {
    alert.triggered = true;
    alert.triggeredAt = new Date();

    const message = this.generateAlertMessage(alert, currentPrice);
    alert.message = message;

    // Add to history
    const historyEntry: AlertHistory = {
      alert: { ...alert },
      triggeredAt: new Date(),
      price: currentPrice,
      message
    };

    this.alertHistory.unshift(historyEntry);
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(0, 1000);
    }
    this.alertHistorySubject.next([...this.alertHistory]);
    this.saveAlertHistory();

    // Set cooldown
    const cooldownKey = `${alert.id}_${alert.symbol}_${alert.type}`;
    this.alertCooldowns.set(cooldownKey, new Date());

    // Increment hourly count
    this.hourlyAlertCount++;

    // Send notifications
    this.sendNotifications(alert, currentPrice, message);

    console.log(`🔔 ALERT TRIGGERED: ${message}`);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(alert: Alert, currentPrice: number): string {
    const { symbol, type, value, name } = alert;

    switch (type) {
      case AlertType.PRICE_ABOVE:
        return `${symbol} price is above ${value} (current: ${currentPrice.toFixed(4)})`;
      case AlertType.PRICE_BELOW:
        return `${symbol} price is below ${value} (current: ${currentPrice.toFixed(4)})`;
      case AlertType.PRICE_CROSS_ABOVE:
        return `${symbol} crossed above ${value} (current: ${currentPrice.toFixed(4)})`;
      case AlertType.PRICE_CROSS_BELOW:
        return `${symbol} crossed below ${value} (current: ${currentPrice.toFixed(4)})`;
      case AlertType.PERCENTAGE_CHANGE:
        return `${symbol} moved ${value}% (price: ${currentPrice.toFixed(4)})`;
      case AlertType.VOLUME_SPIKE:
        return `${symbol} volume spike detected (${value}x average)`;
      default:
        return `${name} alert triggered for ${symbol}`;
    }
  }

  /**
   * Send notifications
   */
  private sendNotifications(alert: Alert, currentPrice: number, message: string): void {
    const settings = this.notificationSettings;

    // Browser notification
    if (settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`🔔 Alert: ${alert.symbol}`, {
        body: message,
        icon: '/favicon.ico',
        tag: alert.id
      });
    }

    // Sound alert
    if (settings.soundAlerts) {
      this.playAlertSound();
    }

    // Popup alert
    if (settings.popupAlerts) {
      this.showPopupAlert(alert, message);
    }

    alert.notificationSent = true;
  }

  /**
   * Get market data for symbol
   */
  private getMarketData(symbol: string): Observable<{ price: number; candles: Candle[] } | null> {
    // Check cache first
    const cached = this.marketDataCache.get(symbol);
    const now = new Date();

    if (cached && (now.getTime() - cached.lastUpdate.getTime()) < 10000) { // 10 second cache
      return of(cached);
    }

    // Fetch fresh data
    return combineLatest([
      this.binanceService.getSymbolPrice(symbol),
      this.binanceService.getKlines(symbol, '1m', 100)
    ]).pipe(
      map(([price, klines]) => {
        const candles = klines.map(k => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));

        const marketData = { price, candles, lastUpdate: now };
        this.marketDataCache.set(symbol, marketData);

        return marketData;
      })
    );
  }

  /**
   * Calculate RSI (simplified implementation)
   */
  private calculateRSI(candles: Candle[], period: number): number[] {
    if (candles.length < period + 1) return [];

    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));

    // Calculate remaining RSI values
    for (let i = period + 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
      rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
  }

  /**
   * Request notification permission
   */
  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log(`🔔 Notification permission: ${permission}`);
      });
    }
  }

  /**
   * Play alert sound
   */
  private playAlertSound(): void {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmweBThiYzTN8tfg');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Could not play alert sound:', e));
    } catch (error) {
      console.log('Alert sound not supported:', error);
    }
  }

  /**
   * Show popup alert
   */
  private showPopupAlert(alert: Alert, message: string): void {
    // Create a simple popup alert (in a real app, use a proper modal service)
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a1a1a;
      color: #fff;
      padding: 16px 20px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 350px;
      font-size: 14px;
      line-height: 1.4;
    `;

    popup.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">🔔 ${alert.name}</div>
      <div>${message}</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.7;">${new Date().toLocaleTimeString()}</div>
    `;

    document.body.appendChild(popup);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, 5000);

    // Click to dismiss
    popup.addEventListener('click', () => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    });
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update alerts subject
   */
  private updateAlertsSubject(): void {
    this.alertsSubject.next([...this.alerts]);
  }

  /**
   * Save/Load methods
   */
  private saveAlerts(): void {
    try {
      localStorage.setItem('alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.warn('Failed to save alerts:', error);
    }
  }

  private loadAlerts(): void {
    try {
      const saved = localStorage.getItem('alerts');
      if (saved) {
        this.alerts = JSON.parse(saved);
        this.updateAlertsSubject();
      }
    } catch (error) {
      console.warn('Failed to load alerts:', error);
    }
  }

  private saveNotificationSettings(): void {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }

  private loadNotificationSettings(): void {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        this.notificationSettings = { ...this.notificationSettings, ...JSON.parse(saved) };
        this.notificationSettingsSubject.next(this.notificationSettings);
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }

  private saveAlertHistory(): void {
    try {
      localStorage.setItem('alertHistory', JSON.stringify(this.alertHistory.slice(0, 100))); // Save only last 100
    } catch (error) {
      console.warn('Failed to save alert history:', error);
    }
  }

  private loadAlertHistory(): void {
    try {
      const saved = localStorage.getItem('alertHistory');
      if (saved) {
        this.alertHistory = JSON.parse(saved);
        this.alertHistorySubject.next([...this.alertHistory]);
      }
    } catch (error) {
      console.warn('Failed to load alert history:', error);
    }
  }

  /**
   * Clear all data (for testing)
   */
  clearAllData(): void {
    this.alerts = [];
    this.alertHistory = [];
    this.alertCooldowns.clear();
    this.marketDataCache.clear();
    this.updateAlertsSubject();
    this.alertHistorySubject.next([]);
    localStorage.removeItem('alerts');
    localStorage.removeItem('alertHistory');
    console.log('🔔 All alert data cleared');
  }
}
