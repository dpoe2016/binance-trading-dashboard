import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, interval, combineLatest } from 'rxjs';
import { map, filter, distinctUntilChanged } from 'rxjs/operators';
import { Candle } from '../models/trading.model';
import { BinanceService } from './binance.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';

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
  SUPPORT_RESISTANCE = 'SUPPORT_RESISTANCE',
  ATR_HIGH = 'ATR_HIGH',
  ATR_LOW = 'ATR_LOW',
  VOLATILITY_SPIKE = 'VOLATILITY_SPIKE'
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

  constructor(
    private binanceService: BinanceService,
    private emailService: EmailService,
    private emailTemplateService: EmailTemplateService
  ) {
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

      case AlertType.RSI_CROSS_ABOVE:
        return this.evaluateRSICross(candles, 'above', value);

      case AlertType.RSI_CROSS_BELOW:
        return this.evaluateRSICross(candles, 'below', value);

      case AlertType.MACD_CROSS_ABOVE:
        return this.evaluateMACDCross(candles, 'above');

      case AlertType.MACD_CROSS_BELOW:
        return this.evaluateMACDCross(candles, 'below');

      case AlertType.SMA_CROSS_ABOVE:
        return this.evaluateSMACross(candles, value, 'above');

      case AlertType.SMA_CROSS_BELOW:
        return this.evaluateSMACross(candles, value, 'below');

      case AlertType.BOLLINGER_BREAKOUT_UPPER:
        return this.evaluateBollingerBreakout(candles, 'upper');

      case AlertType.BOLLINGER_BREAKOUT_LOWER:
        return this.evaluateBollingerBreakout(candles, 'lower');

      case AlertType.ATR_HIGH:
        return this.evaluateATRHigh(candles, value, alert.condition.period || 14);

      case AlertType.ATR_LOW:
        return this.evaluateATRLow(candles, value, alert.condition.period || 14);

      case AlertType.VOLATILITY_SPIKE:
        return this.evaluateVolatilitySpike(candles, value, alert.condition.period || 14);

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
   * Evaluate RSI crossover condition
   */
  private evaluateRSICross(candles: Candle[], direction: 'above' | 'below', threshold: number): boolean {
    if (candles.length < 16) return false;

    const rsi = this.calculateRSI(candles, 14);
    if (rsi.length < 2) return false;

    const currentRSI = rsi[rsi.length - 1];
    const previousRSI = rsi[rsi.length - 2];

    if (direction === 'above') {
      return previousRSI <= threshold && currentRSI > threshold;
    } else {
      return previousRSI >= threshold && currentRSI < threshold;
    }
  }

  /**
   * Evaluate MACD crossover
   */
  private evaluateMACDCross(candles: Candle[], direction: 'above' | 'below'): boolean {
    if (candles.length < 35) return false; // Need at least 26 + 9 candles for MACD

    const macdData = this.calculateMACD(candles);
    if (macdData.length < 2) return false;

    const current = macdData[macdData.length - 1];
    const previous = macdData[macdData.length - 2];

    if (direction === 'above') {
      // MACD crosses above signal line (bullish)
      return previous.macd <= previous.signal && current.macd > current.signal;
    } else {
      // MACD crosses below signal line (bearish)
      return previous.macd >= previous.signal && current.macd < current.signal;
    }
  }

  /**
   * Evaluate SMA crossover (price vs SMA)
   */
  private evaluateSMACross(candles: Candle[], smaPeriod: number, direction: 'above' | 'below'): boolean {
    if (candles.length < smaPeriod + 1) return false;

    const smaValues = this.calculateSMAArray(candles, smaPeriod);
    if (smaValues.length < 2) return false;

    const currentPrice = candles[candles.length - 1].close;
    const previousPrice = candles[candles.length - 2].close;
    const currentSMA = smaValues[smaValues.length - 1];
    const previousSMA = smaValues[smaValues.length - 2];

    if (direction === 'above') {
      // Price crosses above SMA (bullish)
      return previousPrice <= previousSMA && currentPrice > currentSMA;
    } else {
      // Price crosses below SMA (bearish)
      return previousPrice >= previousSMA && currentPrice < currentSMA;
    }
  }

  /**
   * Evaluate Bollinger Band breakout
   */
  private evaluateBollingerBreakout(candles: Candle[], band: 'upper' | 'lower'): boolean {
    if (candles.length < 21) return false;

    const bbData = this.calculateBollingerBands(candles, 20, 2);
    if (bbData.length < 2) return false;

    const current = bbData[bbData.length - 1];
    const previous = bbData[bbData.length - 2];
    const currentPrice = candles[candles.length - 1].close;
    const previousPrice = candles[candles.length - 2].close;

    if (band === 'upper') {
      // Price breaks out above upper band
      return previousPrice <= previous.upper && currentPrice > current.upper;
    } else {
      // Price breaks out below lower band
      return previousPrice >= previous.lower && currentPrice < current.lower;
    }
  }

  /**
   * Evaluate ATR High alert (volatility is above threshold)
   */
  private evaluateATRHigh(candles: Candle[], threshold: number, period: number = 14): boolean {
    if (candles.length < period + 1) return false;

    const atrValues = this.calculateATR(candles, period);
    if (atrValues.length === 0) return false;

    const currentATR = atrValues[atrValues.length - 1];
    return currentATR > threshold;
  }

  /**
   * Evaluate ATR Low alert (volatility is below threshold)
   */
  private evaluateATRLow(candles: Candle[], threshold: number, period: number = 14): boolean {
    if (candles.length < period + 1) return false;

    const atrValues = this.calculateATR(candles, period);
    if (atrValues.length === 0) return false;

    const currentATR = atrValues[atrValues.length - 1];
    return currentATR < threshold;
  }

  /**
   * Evaluate volatility spike alert (ATR suddenly increases significantly)
   */
  private evaluateVolatilitySpike(candles: Candle[], multiplier: number, period: number = 14): boolean {
    if (candles.length < period + 10) return false; // Need extra data for average

    const atrValues = this.calculateATR(candles, period);
    if (atrValues.length < 10) return false;

    const currentATR = atrValues[atrValues.length - 1];
    const recentATRs = atrValues.slice(-10, -1); // Last 9 ATR values (excluding current)
    const avgATR = recentATRs.reduce((sum, atr) => sum + atr, 0) / recentATRs.length;

    return currentATR >= avgATR * multiplier;
  }

  /**
   * Calculate ATR (Average True Range)
   */
  private calculateATR(candles: Candle[], period: number = 14): number[] {
    if (candles.length < period + 1) return [];

    const trueRanges: number[] = [];

    // Calculate True Range for each period
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      const highLow = current.high - current.low;
      const highClose = Math.abs(current.high - previous.close);
      const lowClose = Math.abs(current.low - previous.close);

      const trueRange = Math.max(highLow, highClose, lowClose);
      trueRanges.push(trueRange);
    }

    const atrValues: number[] = [];

    // Calculate initial SMA for first ATR
    if (trueRanges.length >= period) {
      const initialSum = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0);
      atrValues.push(initialSum / period);
    }

    // Calculate subsequent ATR values using smoothed moving average
    for (let i = period; i < trueRanges.length; i++) {
      const prevATR = atrValues[atrValues.length - 1];
      const currentTR = trueRanges[i];
      const smoothedATR = (prevATR * (period - 1) + currentTR) / period;
      atrValues.push(smoothedATR);
    }

    return atrValues;
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
      case AlertType.RSI_ABOVE:
        return `${symbol} RSI above ${value}`;
      case AlertType.RSI_BELOW:
        return `${symbol} RSI below ${value}`;
      case AlertType.RSI_CROSS_ABOVE:
        return `${symbol} RSI crossed above ${value}`;
      case AlertType.RSI_CROSS_BELOW:
        return `${symbol} RSI crossed below ${value}`;
      case AlertType.MACD_CROSS_ABOVE:
        return `${symbol} MACD bullish crossover (price: ${currentPrice.toFixed(4)})`;
      case AlertType.MACD_CROSS_BELOW:
        return `${symbol} MACD bearish crossover (price: ${currentPrice.toFixed(4)})`;
      case AlertType.SMA_CROSS_ABOVE:
        return `${symbol} price crossed above SMA(${value}) (current: ${currentPrice.toFixed(4)})`;
      case AlertType.SMA_CROSS_BELOW:
        return `${symbol} price crossed below SMA(${value}) (current: ${currentPrice.toFixed(4)})`;
      case AlertType.BOLLINGER_BREAKOUT_UPPER:
        return `${symbol} broke above upper Bollinger Band (price: ${currentPrice.toFixed(4)})`;
      case AlertType.BOLLINGER_BREAKOUT_LOWER:
        return `${symbol} broke below lower Bollinger Band (price: ${currentPrice.toFixed(4)})`;
      case AlertType.VOLUME_SPIKE:
        return `${symbol} volume spike detected (${value}x average)`;
      case AlertType.ATR_HIGH:
        return `${symbol} volatility is high - ATR above ${value.toFixed(6)} (price: ${currentPrice.toFixed(4)})`;
      case AlertType.ATR_LOW:
        return `${symbol} volatility is low - ATR below ${value.toFixed(6)} (price: ${currentPrice.toFixed(4)})`;
      case AlertType.VOLATILITY_SPIKE:
        return `${symbol} volatility spike detected - ATR increased by ${value}x (price: ${currentPrice.toFixed(4)})`;
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
      const notification = new Notification(`🔔 Alert: ${alert.symbol}`, {
        body: message,
        icon: '/favicon.ico',
        tag: alert.id,
        requireInteraction: false,
        silent: !settings.soundAlerts
      });

      // Handle notification click - focus window and navigate to alerts
      notification.onclick = () => {
        window.focus();
        // Try to navigate to alerts page if routing is available
        if (window.location.pathname !== '/alerts') {
          window.location.href = '/alerts';
        }
        notification.close();
      };
    }

    // Email notification
    if (settings.emailNotifications) {
      this.sendEmailNotification(alert, currentPrice, message);
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
   * Send email notification for alert
   */
  private async sendEmailNotification(alert: Alert, currentPrice: number, message: string): Promise<void> {
    try {
      const alertTypeMap: { [key in AlertType]?: string } = {
        [AlertType.PRICE_ABOVE]: 'price',
        [AlertType.PRICE_BELOW]: 'price',
        [AlertType.PRICE_CROSS_ABOVE]: 'price',
        [AlertType.PRICE_CROSS_BELOW]: 'price',
        [AlertType.PERCENTAGE_CHANGE]: 'price',
        [AlertType.RSI_ABOVE]: 'indicator',
        [AlertType.RSI_BELOW]: 'indicator',
        [AlertType.RSI_CROSS_ABOVE]: 'indicator',
        [AlertType.RSI_CROSS_BELOW]: 'indicator',
        [AlertType.MACD_CROSS_ABOVE]: 'indicator',
        [AlertType.MACD_CROSS_BELOW]: 'indicator',
        [AlertType.SMA_CROSS_ABOVE]: 'indicator',
        [AlertType.SMA_CROSS_BELOW]: 'indicator',
        [AlertType.BOLLINGER_BREAKOUT_UPPER]: 'indicator',
        [AlertType.BOLLINGER_BREAKOUT_LOWER]: 'indicator',
        [AlertType.VOLUME_SPIKE]: 'indicator',
        [AlertType.ATR_HIGH]: 'volatility',
        [AlertType.ATR_LOW]: 'volatility',
        [AlertType.VOLATILITY_SPIKE]: 'volatility'
      };

      const emailAlertType = alertTypeMap[alert.type] || 'price';

      // Get appropriate email template based on alert type
      let emailTemplate;

      if (emailAlertType === 'price') {
        const condition = this.getAlertConditionText(alert);
        emailTemplate = this.emailTemplateService.getPriceAlertTemplate(
          alert.symbol,
          currentPrice,
          condition,
          alert.value
        );
      } else if (emailAlertType === 'indicator') {
        const indicatorName = this.getIndicatorName(alert.type);
        const condition = this.getAlertConditionText(alert);
        emailTemplate = this.emailTemplateService.getIndicatorAlertTemplate(
          alert.symbol,
          indicatorName,
          condition,
          alert.value
        );
      } else if (emailAlertType === 'volatility') {
        emailTemplate = this.emailTemplateService.getVolatilityAlertTemplate(
          alert.symbol,
          currentPrice,
          alert.value
        );
      } else {
        // Fallback to generic alert email
        await this.emailService.sendAlertEmail(emailAlertType, message, {
          symbol: alert.symbol,
          price: currentPrice,
          alertName: alert.name
        });
        return;
      }

      // Send email with template
      await this.emailService.sendEmail(
        emailTemplate.subject,
        emailTemplate.body,
        emailTemplate.html
      );

      console.log(`📧 Email notification sent for alert: ${alert.name}`);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Get alert condition text
   */
  private getAlertConditionText(alert: Alert): string {
    switch (alert.type) {
      case AlertType.PRICE_ABOVE:
        return 'Price Above';
      case AlertType.PRICE_BELOW:
        return 'Price Below';
      case AlertType.PRICE_CROSS_ABOVE:
        return 'Crossed Above';
      case AlertType.PRICE_CROSS_BELOW:
        return 'Crossed Below';
      case AlertType.PERCENTAGE_CHANGE:
        return 'Percentage Change';
      case AlertType.RSI_ABOVE:
        return 'RSI Above';
      case AlertType.RSI_BELOW:
        return 'RSI Below';
      case AlertType.RSI_CROSS_ABOVE:
        return 'RSI Crossed Above';
      case AlertType.RSI_CROSS_BELOW:
        return 'RSI Crossed Below';
      case AlertType.MACD_CROSS_ABOVE:
        return 'MACD Bullish Crossover';
      case AlertType.MACD_CROSS_BELOW:
        return 'MACD Bearish Crossover';
      case AlertType.SMA_CROSS_ABOVE:
        return 'Price Crossed Above SMA';
      case AlertType.SMA_CROSS_BELOW:
        return 'Price Crossed Below SMA';
      case AlertType.BOLLINGER_BREAKOUT_UPPER:
        return 'Upper Bollinger Breakout';
      case AlertType.BOLLINGER_BREAKOUT_LOWER:
        return 'Lower Bollinger Breakout';
      case AlertType.VOLUME_SPIKE:
        return 'Volume Spike';
      default:
        return 'Alert Triggered';
    }
  }

  /**
   * Get indicator name from alert type
   */
  private getIndicatorName(type: AlertType): string {
    switch (type) {
      case AlertType.RSI_ABOVE:
      case AlertType.RSI_BELOW:
      case AlertType.RSI_CROSS_ABOVE:
      case AlertType.RSI_CROSS_BELOW:
        return 'RSI';
      case AlertType.MACD_CROSS_ABOVE:
      case AlertType.MACD_CROSS_BELOW:
        return 'MACD';
      case AlertType.SMA_CROSS_ABOVE:
      case AlertType.SMA_CROSS_BELOW:
        return 'SMA';
      case AlertType.BOLLINGER_BREAKOUT_UPPER:
      case AlertType.BOLLINGER_BREAKOUT_LOWER:
        return 'Bollinger Bands';
      case AlertType.VOLUME_SPIKE:
        return 'Volume';
      default:
        return 'Indicator';
    }
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

    // Fetch fresh data using available methods
    return new Observable(observer => {
      let price = 0;
      const unsubscribe = this.binanceService.subscribeToPriceUpdates(symbol, (priceStr: string) => {
        price = parseFloat(priceStr);
      });

      // Get candles
      this.binanceService.getCandles(symbol, '1m', 100).then(candles => {
        const marketData = { price: price || (candles.length > 0 ? candles[candles.length - 1].close : 0), candles, lastUpdate: now };
        this.marketDataCache.set(symbol, marketData);
        observer.next(marketData);
        observer.complete();
        unsubscribe();
      }).catch(error => {
        console.error('Error fetching market data:', error);
        observer.error(error);
        unsubscribe();
      });
    });
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
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): Array<{macd: number, signal: number, histogram: number}> {
    if (candles.length < slowPeriod) {
      return [];
    }

    const closes = candles.map(c => c.close);

    // Calculate EMAs using proper EMA calculation
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

  /**
   * Calculate SMA array (returns array of SMA values for each candle)
   */
  private calculateSMAArray(candles: Candle[], period: number): number[] {
    const result: number[] = [];

    if (candles.length < period) {
      return result;
    }

    for (let i = period - 1; i < candles.length; i++) {
      const slice = candles.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      const sma = sum / period;
      result.push(sma);
    }

    return result;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(candles: Candle[], period: number = 20, stdDev: number = 2): Array<{upper: number, middle: number, lower: number}> {
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
