import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Position, Order, OrderStatus, CreateOrderRequest, OrderSide } from '../models/trading.model';
import { PositionService } from './position.service';
import { OrderService } from './order.service';
import { BinanceService } from './binance.service';

export interface RiskParameters {
  maxPositionSize: number; // Max position size per trade (%)
  maxDailyLoss: number; // Max daily loss (%)
  maxDrawdown: number; // Max account drawdown (%)
  riskPerTrade: number; // Risk per trade (%)
  maxOpenPositions: number; // Max number of open positions
  maxLeverage: number; // Max leverage allowed
  maxCorrelation: number; // Max correlation between positions (0-1)
  stopLossRequired: boolean; // Require stop loss for all positions
  maxPositionHoldTime: number; // Max days to hold position (0 = no limit)
}

export interface RiskMetrics {
  currentDrawdown: number;
  dailyPnL: number;
  totalPositions: number;
  totalExposure: number;
  leverageUsed: number;
  marginUtilization: number;
  riskScore: number; // 0-100 (0 = low risk, 100 = high risk)
  violatedRules: string[];
  warnings: string[];
}

export interface RiskAlert {
  id: string;
  type: 'warning' | 'danger' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class RiskManagementService {
  private defaultRiskParameters: RiskParameters = {
    maxPositionSize: 10, // 10% of account per position
    maxDailyLoss: 5, // 5% daily loss limit
    maxDrawdown: 20, // 20% max drawdown
    riskPerTrade: 2, // 2% risk per trade
    maxOpenPositions: 5,
    maxLeverage: 10,
    maxCorrelation: 0.7,
    stopLossRequired: true,
    maxPositionHoldTime: 30 // 30 days
  };

  private riskParameters = new BehaviorSubject<RiskParameters>(this.defaultRiskParameters);
  private riskMetrics = new BehaviorSubject<RiskMetrics>({
    currentDrawdown: 0,
    dailyPnL: 0,
    totalPositions: 0,
    totalExposure: 0,
    leverageUsed: 0,
    marginUtilization: 0,
    riskScore: 0,
    violatedRules: [],
    warnings: []
  });

  private riskAlerts: RiskAlert[] = [];
  private riskAlertsSubject = new BehaviorSubject<RiskAlert[]>([]);

  // Observable streams
  public riskParameters$ = this.riskParameters.asObservable();
  public riskMetrics$ = this.riskMetrics.asObservable();
  public riskAlerts$ = this.riskAlertsSubject.asObservable();

  // Account tracking
  private initialAccountValue = 0;
  private dailyStartValue = 0;
  private peakAccountValue = 0;

  constructor(
    private positionService: PositionService,
    private orderService: OrderService,
    private binanceService: BinanceService
  ) {
    this.loadRiskParameters();
    this.initializeRiskMonitoring();
  }

  /**
   * Initialize risk monitoring
   */
  private initializeRiskMonitoring(): void {
    // Monitor positions and account changes
    combineLatest([
      this.positionService.positions$,
      this.positionService.positionMetrics$
    ]).subscribe(([positions, metricsMap]) => {
      this.updateRiskMetrics(positions, metricsMap);
    });

    // Set up daily reset
    this.setupDailyReset();
  }

  /**
   * Update risk parameters
   */
  updateRiskParameters(parameters: Partial<RiskParameters>): void {
    const current = this.riskParameters.value;
    const updated = { ...current, ...parameters };
    this.riskParameters.next(updated);
    this.saveRiskParameters(updated);
    console.log('🛡️ Risk parameters updated:', updated);
  }

  /**
   * Get current risk parameters
   */
  getRiskParameters(): RiskParameters {
    return this.riskParameters.value;
  }

  /**
   * Validate order against risk rules
   */
  validateOrder(orderRequest: CreateOrderRequest, accountBalance: number): Observable<{
    allowed: boolean;
    violations: string[];
    warnings: string[];
    adjustedQuantity?: string;
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];
    const params = this.riskParameters.value;
    const metrics = this.riskMetrics.value;

    // Check max positions
    if (metrics.totalPositions >= params.maxOpenPositions) {
      violations.push(`Maximum open positions exceeded (${params.maxOpenPositions})`);
    }

    // Check daily loss limit
    if (metrics.dailyPnL < -Math.abs(params.maxDailyLoss / 100 * accountBalance)) {
      violations.push(`Daily loss limit exceeded (${params.maxDailyLoss}%)`);
    }

    // Check drawdown limit
    if (metrics.currentDrawdown > params.maxDrawdown) {
      violations.push(`Maximum drawdown exceeded (${params.maxDrawdown}%)`);
    }

    // Check position size
    const orderValue = parseFloat(orderRequest.quantity) * (parseFloat(orderRequest.price || '0') || this.getEstimatedPrice(orderRequest.symbol));
    const positionSizePercent = (orderValue / accountBalance) * 100;

    let adjustedQuantity: string | undefined;
    if (positionSizePercent > params.maxPositionSize) {
      const maxOrderValue = accountBalance * (params.maxPositionSize / 100);
      const maxQuantity = maxOrderValue / (parseFloat(orderRequest.price || '0') || this.getEstimatedPrice(orderRequest.symbol));
      adjustedQuantity = maxQuantity.toFixed(6);
      warnings.push(`Position size reduced to ${params.maxPositionSize}% limit`);
    }

    // Check leverage (for futures)
    if (orderRequest.positionSide && parseFloat(orderRequest.quantity) > accountBalance * params.maxLeverage) {
      violations.push(`Leverage exceeds maximum allowed (${params.maxLeverage}x)`);
    }

    // Check stop loss requirement
    if (params.stopLossRequired && !orderRequest.stopPrice && orderRequest.type !== 'STOP_LOSS') {
      warnings.push('Stop loss is recommended for risk management');
    }

    // Calculate risk score impact
    const riskImpact = this.calculateOrderRiskImpact(orderRequest, accountBalance);
    if (metrics.riskScore + riskImpact > 80) {
      warnings.push('Order would significantly increase portfolio risk');
    }

    return of({
      allowed: violations.length === 0,
      violations,
      warnings,
      adjustedQuantity
    });
  }

  /**
   * Update risk metrics
   */
  private updateRiskMetrics(positions: Position[], metricsMap: Map<string, any>): void {
    const currentMetrics = this.riskMetrics.value;

    // Calculate total exposure and leverage
    let totalExposure = 0;
    let totalMarginUsed = 0;
    let totalUnrealizedPnL = 0;

    positions.forEach(position => {
      const metrics = metricsMap.get(position.symbol);
      if (metrics) {
        totalExposure += metrics.positionValue;
        totalMarginUsed += metrics.marginUsed;
        totalUnrealizedPnL += metrics.unrealizedPnL;
      }
    });

    // Get account balance
    this.binanceService.getAccountBalances().subscribe((balances: any) => {
      const totalBalance = this.calculateTotalBalance(balances);

      // Initialize account values if needed
      if (this.initialAccountValue === 0) {
        this.initialAccountValue = totalBalance;
        this.dailyStartValue = totalBalance;
        this.peakAccountValue = totalBalance;
      }

      // Update peak value
      if (totalBalance > this.peakAccountValue) {
        this.peakAccountValue = totalBalance;
      }

      // Calculate metrics
      const currentDrawdown = ((this.peakAccountValue - totalBalance) / this.peakAccountValue) * 100;
      const dailyPnL = totalBalance - this.dailyStartValue;
      const leverageUsed = totalExposure / totalBalance;
      const marginUtilization = (totalMarginUsed / totalBalance) * 100;

      // Calculate risk score
      const riskScore = this.calculateRiskScore({
        drawdown: currentDrawdown,
        leverage: leverageUsed,
        marginUtil: marginUtilization,
        positions: positions.length,
        dailyLoss: Math.abs(Math.min(dailyPnL, 0)) / totalBalance * 100
      });

      // Check for violations
      const { violations, warnings } = this.checkRiskViolations({
        currentDrawdown,
        dailyPnL,
        totalPositions: positions.length,
        leverageUsed,
        marginUtilization,
        totalBalance
      });

      const updatedMetrics: RiskMetrics = {
        currentDrawdown,
        dailyPnL,
        totalPositions: positions.length,
        totalExposure,
        leverageUsed,
        marginUtilization,
        riskScore,
        violatedRules: violations,
        warnings
      };

      this.riskMetrics.next(updatedMetrics);

      // Generate alerts for new violations
      this.processRiskViolations(violations, warnings);
    });
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(factors: {
    drawdown: number;
    leverage: number;
    marginUtil: number;
    positions: number;
    dailyLoss: number;
  }): number {
    const params = this.riskParameters.value;

    let score = 0;

    // Drawdown component (0-30 points)
    score += Math.min(30, (factors.drawdown / params.maxDrawdown) * 30);

    // Leverage component (0-25 points)
    score += Math.min(25, (factors.leverage / params.maxLeverage) * 25);

    // Position count component (0-15 points)
    score += Math.min(15, (factors.positions / params.maxOpenPositions) * 15);

    // Daily loss component (0-20 points)
    score += Math.min(20, (factors.dailyLoss / params.maxDailyLoss) * 20);

    // Margin utilization component (0-10 points)
    score += Math.min(10, factors.marginUtil / 10);

    return Math.min(100, Math.round(score));
  }

  /**
   * Check for risk violations
   */
  private checkRiskViolations(data: {
    currentDrawdown: number;
    dailyPnL: number;
    totalPositions: number;
    leverageUsed: number;
    marginUtilization: number;
    totalBalance: number;
  }): { violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];
    const params = this.riskParameters.value;

    // Check hard limits (violations)
    if (data.currentDrawdown > params.maxDrawdown) {
      violations.push(`Maximum drawdown exceeded: ${data.currentDrawdown.toFixed(2)}% > ${params.maxDrawdown}%`);
    }

    if (data.dailyPnL < -(params.maxDailyLoss / 100 * data.totalBalance)) {
      violations.push(`Daily loss limit exceeded: ${(Math.abs(data.dailyPnL) / data.totalBalance * 100).toFixed(2)}% > ${params.maxDailyLoss}%`);
    }

    if (data.totalPositions > params.maxOpenPositions) {
      violations.push(`Too many open positions: ${data.totalPositions} > ${params.maxOpenPositions}`);
    }

    if (data.leverageUsed > params.maxLeverage) {
      violations.push(`Leverage too high: ${data.leverageUsed.toFixed(1)}x > ${params.maxLeverage}x`);
    }

    // Check warnings (soft limits)
    if (data.currentDrawdown > params.maxDrawdown * 0.8) {
      warnings.push(`Approaching maximum drawdown: ${data.currentDrawdown.toFixed(2)}%`);
    }

    if (data.marginUtilization > 80) {
      warnings.push(`High margin utilization: ${data.marginUtilization.toFixed(1)}%`);
    }

    if (data.totalPositions > params.maxOpenPositions * 0.8) {
      warnings.push(`Approaching position limit: ${data.totalPositions}/${params.maxOpenPositions}`);
    }

    return { violations, warnings };
  }

  /**
   * Process risk violations and create alerts
   */
  private processRiskViolations(violations: string[], warnings: string[]): void {
    // Create critical alerts for violations
    violations.forEach(violation => {
      this.createAlert('critical', violation, { type: 'violation' });
    });

    // Create warning alerts
    warnings.forEach(warning => {
      this.createAlert('warning', warning, { type: 'warning' });
    });
  }

  /**
   * Create risk alert
   */
  private createAlert(type: 'warning' | 'danger' | 'critical', message: string, data?: any): void {
    const alert: RiskAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      data
    };

    this.riskAlerts.unshift(alert);

    // Keep only last 100 alerts
    if (this.riskAlerts.length > 100) {
      this.riskAlerts = this.riskAlerts.slice(0, 100);
    }

    this.riskAlertsSubject.next([...this.riskAlerts]);

    console.log(`🚨 Risk Alert [${type.toUpperCase()}]: ${message}`);
  }

  /**
   * Resolve risk alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.riskAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.riskAlertsSubject.next([...this.riskAlerts]);
    }
  }

  /**
   * Get risk dashboard data
   */
  getRiskDashboard(): Observable<{
    parameters: RiskParameters;
    metrics: RiskMetrics;
    alerts: RiskAlert[];
    recommendations: string[];
  }> {
    const recommendations = this.generateRecommendations();

    return combineLatest([
      this.riskParameters$,
      this.riskMetrics$,
      this.riskAlerts$
    ]).pipe(
      map(([parameters, metrics, alerts]) => ({
        parameters,
        metrics,
        alerts: alerts.filter(a => !a.resolved),
        recommendations
      }))
    );
  }

  /**
   * Generate risk management recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.riskMetrics.value;
    const params = this.riskParameters.value;

    if (metrics.riskScore > 70) {
      recommendations.push('Consider reducing position sizes to lower portfolio risk');
    }

    if (metrics.totalPositions === 0) {
      recommendations.push('No open positions - consider looking for trading opportunities');
    }

    if (metrics.marginUtilization > 70) {
      recommendations.push('High margin utilization - consider closing some positions');
    }

    if (metrics.currentDrawdown > 10) {
      recommendations.push('Significant drawdown detected - review and adjust strategy');
    }

    if (metrics.leverageUsed > params.maxLeverage * 0.8) {
      recommendations.push('Approaching leverage limit - consider reducing position sizes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Risk levels are within acceptable ranges');
    }

    return recommendations;
  }

  /**
   * Emergency stop all positions
   */
  emergencyStop(): Observable<Order[]> {
    console.log('🛑 EMERGENCY STOP: Closing all positions');

    return new Observable(observer => {
      this.positionService.positions$.subscribe(positions => {
        const closeOrders: Observable<Order>[] = [];

        positions.forEach(position => {
          if (parseFloat(position.positionAmt) !== 0) {
            closeOrders.push(this.positionService.closePosition(position.symbol, 100));
          }
        });

        // Wait for all close orders to complete
        if (closeOrders.length === 0) {
          observer.next([]);
          observer.complete();
        } else {
          const results: Order[] = [];
          let completed = 0;
          closeOrders.forEach(orderObs => {
            orderObs.subscribe({
              next: (order) => {
                results.push(order);
                completed++;
                if (completed === closeOrders.length) {
                  observer.next(results);
                  observer.complete();
                }
              },
              error: (err) => observer.error(err)
            });
          });
        }
      });
    });
  }

  /**
   * Calculate order risk impact
   */
  private calculateOrderRiskImpact(orderRequest: CreateOrderRequest, accountBalance: number): number {
    const orderValue = parseFloat(orderRequest.quantity) * (parseFloat(orderRequest.price || '0') || this.getEstimatedPrice(orderRequest.symbol));
    const positionSizePercent = (orderValue / accountBalance) * 100;

    // Risk impact based on position size and current metrics
    let impact = positionSizePercent * 2; // Base impact

    if (orderRequest.side === OrderSide.SELL) {
      impact *= 0.5; // Closing positions reduces risk
    }

    return Math.min(50, impact);
  }

  /**
   * Get estimated price for symbol (simplified)
   */
  private getEstimatedPrice(symbol: string): number {
    // In a real implementation, you'd fetch current market price
    const basePrices: { [key: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 1.2,
      'DOTUSDT': 25,
      'LINKUSDT': 15
    };
    return basePrices[symbol] || 100;
  }

  /**
   * Calculate total balance from account balances
   */
  private calculateTotalBalance(balances: any[]): number {
    return balances.reduce((total, balance) => {
      const value = parseFloat(balance.free) + parseFloat(balance.locked);
      if (balance.asset === 'USDT') {
        return total + value;
      }
      return total;
    }, 0);
  }

  /**
   * Setup daily reset for daily P&L tracking
   */
  private setupDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.resetDailyMetrics();
      // Set up daily interval
      setInterval(() => {
        this.resetDailyMetrics();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilMidnight);
  }

  /**
   * Reset daily metrics
   */
  private resetDailyMetrics(): void {
    this.binanceService.getAccountBalances().subscribe((balances: any) => {
      this.dailyStartValue = this.calculateTotalBalance(balances);
      console.log('🔄 Daily risk metrics reset');
    });
  }

  /**
   * Load risk parameters from storage
   */
  private loadRiskParameters(): void {
    try {
      const saved = localStorage.getItem('riskParameters');
      if (saved) {
        const params = JSON.parse(saved);
        this.riskParameters.next({ ...this.defaultRiskParameters, ...params });
      }
    } catch (error) {
      console.warn('Failed to load risk parameters:', error);
    }
  }

  /**
   * Save risk parameters to storage
   */
  private saveRiskParameters(parameters: RiskParameters): void {
    try {
      localStorage.setItem('riskParameters', JSON.stringify(parameters));
    } catch (error) {
      console.warn('Failed to save risk parameters:', error);
    }
  }

  /**
   * Clear all risk data (for testing)
   */
  clearRiskData(): void {
    this.riskAlerts = [];
    this.riskAlertsSubject.next([]);
    this.riskParameters.next(this.defaultRiskParameters);
    this.initialAccountValue = 0;
    this.dailyStartValue = 0;
    this.peakAccountValue = 0;
    localStorage.removeItem('riskParameters');
    console.log('🛡️ Risk management data cleared');
  }
}
