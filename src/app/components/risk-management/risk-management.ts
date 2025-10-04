import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  RiskManagementService,
  RiskParameters,
  RiskMetrics,
  RiskAlert
} from '../../services/risk-management.service';
import { PositionService } from '../../services/position.service';
import { BinanceService } from '../../services/binance.service';

@Component({
  selector: 'app-risk-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-management.html',
  styleUrls: ['./risk-management.scss']
})
export class RiskManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Risk data
  riskParameters: RiskParameters = {
    maxPositionSize: 10,
    maxDailyLoss: 5,
    maxDrawdown: 20,
    riskPerTrade: 2,
    maxOpenPositions: 5,
    maxLeverage: 10,
    maxCorrelation: 0.7,
    stopLossRequired: true,
    maxPositionHoldTime: 30
  };

  riskMetrics: RiskMetrics = {
    currentDrawdown: 0,
    dailyPnL: 0,
    totalPositions: 0,
    totalExposure: 0,
    leverageUsed: 0,
    marginUtilization: 0,
    riskScore: 0,
    violatedRules: [],
    warnings: []
  };

  riskAlerts: RiskAlert[] = [];

  // UI state
  showSettingsModal = false;
  showAlertsPanel = true;
  isEmergencyStopConfirm = false;
  isStoppingAll = false;

  // Account balance
  accountBalance = 0;

  constructor(
    private riskManagementService: RiskManagementService,
    private positionService: PositionService,
    private binanceService: BinanceService
  ) {}

  ngOnInit(): void {
    this.loadRiskData();
    this.loadAccountBalance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load risk data
   */
  loadRiskData(): void {
    // Subscribe to risk parameters
    this.riskManagementService.riskParameters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.riskParameters = params;
      });

    // Subscribe to risk metrics
    this.riskManagementService.riskMetrics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.riskMetrics = metrics;
      });

    // Subscribe to risk alerts
    this.riskManagementService.riskAlerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.riskAlerts = alerts.filter(a => !a.resolved);
      });
  }

  /**
   * Load account balance
   */
  loadAccountBalance(): void {
    this.binanceService.getAccountBalances()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (balances: any) => {
          this.accountBalance = balances.reduce((total: number, balance: any) => {
            const value = parseFloat(balance.free) + parseFloat(balance.locked);
            if (balance.asset === 'USDT') {
              return total + value;
            }
            return total;
          }, 0);
        },
        error: (error: any) => {
          console.error('Error loading account balance:', error);
        }
      });
  }

  /**
   * Open settings modal
   */
  openSettings(): void {
    this.showSettingsModal = true;
  }

  /**
   * Close settings modal
   */
  closeSettings(): void {
    this.showSettingsModal = false;
  }

  /**
   * Save risk parameters
   */
  saveRiskParameters(): void {
    this.riskManagementService.updateRiskParameters(this.riskParameters);
    this.showSettingsModal = false;
    this.showNotification('Risk parameters updated successfully', 'success');
  }

  /**
   * Reset to default parameters
   */
  resetToDefaults(): void {
    this.riskParameters = {
      maxPositionSize: 10,
      maxDailyLoss: 5,
      maxDrawdown: 20,
      riskPerTrade: 2,
      maxOpenPositions: 5,
      maxLeverage: 10,
      maxCorrelation: 0.7,
      stopLossRequired: true,
      maxPositionHoldTime: 30
    };
    this.showNotification('Reset to default parameters', 'success');
  }

  /**
   * Emergency stop all positions
   */
  emergencyStopAll(): void {
    this.isEmergencyStopConfirm = true;
  }

  /**
   * Confirm emergency stop
   */
  confirmEmergencyStop(): void {
    this.isStoppingAll = true;
    this.riskManagementService.emergencyStop()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isStoppingAll = false;
          this.isEmergencyStopConfirm = false;
          this.showNotification('All positions closed successfully', 'success');
        },
        error: (error) => {
          console.error('Error closing positions:', error);
          this.isStoppingAll = false;
          this.showNotification('Error closing positions: ' + error.message, 'error');
        }
      });
  }

  /**
   * Cancel emergency stop
   */
  cancelEmergencyStop(): void {
    this.isEmergencyStopConfirm = false;
  }

  /**
   * Dismiss alert
   */
  dismissAlert(alertId: string): void {
    this.riskManagementService.resolveAlert(alertId);
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.riskAlerts.forEach(alert => {
      this.riskManagementService.resolveAlert(alert.id);
    });
  }

  /**
   * Toggle alerts panel
   */
  toggleAlertsPanel(): void {
    this.showAlertsPanel = !this.showAlertsPanel;
  }

  /**
   * Get risk score color
   */
  getRiskScoreColor(score: number): string {
    if (score < 30) return '#22c55e'; // Green - Low risk
    if (score < 60) return '#f59e0b'; // Yellow - Medium risk
    if (score < 80) return '#fb923c'; // Orange - High risk
    return '#ef4444'; // Red - Critical risk
  }

  /**
   * Get risk score text
   */
  getRiskScoreText(score: number): string {
    if (score < 30) return 'Low Risk';
    if (score < 60) return 'Medium Risk';
    if (score < 80) return 'High Risk';
    return 'Critical Risk';
  }

  /**
   * Get alert icon
   */
  getAlertIcon(type: string): string {
    switch (type) {
      case 'warning': return '⚠️';
      case 'danger': return '⚡';
      case 'critical': return '🚨';
      default: return 'ℹ️';
    }
  }

  /**
   * Get alert color class
   */
  getAlertColorClass(type: string): string {
    switch (type) {
      case 'warning': return 'alert-warning';
      case 'danger': return 'alert-danger';
      case 'critical': return 'alert-critical';
      default: return 'alert-info';
    }
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  }

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      background-color: ${type === 'success' ? '#22c55e' : '#ef4444'};
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}
