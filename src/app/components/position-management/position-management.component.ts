import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import {
  PositionService,
  PositionMetrics,
  PositionSizing,
  RiskReward
} from '../../services/position.service';
import { OrderService } from '../../services/order.service';
import { BinanceService } from '../../services/binance.service';
import { Position, AccountBalance } from '../../models/trading.model';

interface PositionDisplay extends PositionMetrics {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnlColor: string;
  pnlPercentColor: string;
}

@Component({
  selector: 'app-position-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './position-management.component.html',
  styleUrls: ['./position-management.component.scss']
})
export class PositionManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  positions: PositionDisplay[] = [];
  positionSummary = {
    totalPositions: 0,
    totalUnrealizedPnL: 0,
    totalRealizedPnL: 0,
    totalPositionValue: 0,
    totalMarginUsed: 0,
    profitablePositions: 0,
    losingPositions: 0
  };

  selectedPosition: PositionDisplay | null = null;
  showCloseModal = false;
  showSizingCalculator = false;
  showRiskRewardCalculator = false;

  // Close position modal
  closePercentage = 100;
  isClosingPosition = false;

  // Position sizing calculator
  sizingInputs = {
    accountBalance: 10000,
    entryPrice: 0,
    stopLoss: 0,
    riskPercentage: 2,
    leverage: 1
  };
  positionSizing: PositionSizing | null = null;

  // Risk/Reward calculator
  riskRewardInputs = {
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    positionSize: 0
  };
  riskReward: RiskReward | null = null;

  // Account balance
  accountBalance: AccountBalance[] = [];
  totalBalance = 0;

  constructor(
    private positionService: PositionService,
    private orderService: OrderService,
    private binanceService: BinanceService
  ) {}

  ngOnInit(): void {
    this.loadPositions();
    this.loadPositionSummary();
    this.loadAccountBalance();

    // Set up real-time updates
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all positions
   */
  loadPositions(): void {
    combineLatest([
      this.positionService.positions$,
      this.positionService.positionMetrics$
    ]).pipe(
      takeUntil(this.destroy$),
      map(([positions, metricsMap]) => {
        return positions.map(position => {
          const metrics = metricsMap.get(position.symbol);
          const size = Math.abs(parseFloat(position.positionAmt));
          const side = parseFloat(position.positionAmt) > 0 ? 'LONG' : 'SHORT';
          const entryPrice = parseFloat(position.entryPrice);
          const markPrice = parseFloat(position.markPrice);
          const unrealizedPnL = parseFloat(position.unRealizedProfit);

          const positionDisplay: PositionDisplay = {
            ...(metrics || {
              position,
              unrealizedPnL,
              unrealizedPnLPercent: 0,
              realizedPnL: 0,
              totalPnL: unrealizedPnL,
              averageEntryPrice: entryPrice,
              currentPrice: markPrice,
              positionValue: size * markPrice,
              marginUsed: (size * markPrice) / parseFloat(position.leverage),
              liquidationPrice: parseFloat(position.liquidationPrice),
              daysHeld: 0
            }),
            symbol: position.symbol,
            side,
            size,
            entryPrice,
            markPrice,
            pnlColor: unrealizedPnL >= 0 ? '#22c55e' : '#ef4444',
            pnlPercentColor: metrics?.unrealizedPnLPercent && metrics.unrealizedPnLPercent >= 0 ? '#22c55e' : '#ef4444'
          };

          return positionDisplay;
        });
      })
    ).subscribe(positions => {
      this.positions = positions;
    });
  }

  /**
   * Load position summary
   */
  loadPositionSummary(): void {
    this.positionService.getPositionSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.positionSummary = summary;
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
          this.accountBalance = balances;
          this.totalBalance = balances.reduce((total: number, balance: any) => {
            const value = parseFloat(balance.free) + parseFloat(balance.locked);
            // Convert to USD equivalent (simplified - would need price conversion)
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
   * Set up real-time updates
   */
  setupRealTimeUpdates(): void {
    // Update positions every 5 seconds
    setInterval(() => {
      this.loadPositionSummary();
    }, 5000);
  }

  /**
   * Select position for detailed view
   */
  selectPosition(position: PositionDisplay): void {
    this.selectedPosition = position;
  }

  /**
   * Open close position modal
   */
  openCloseModal(position: PositionDisplay): void {
    this.selectedPosition = position;
    this.closePercentage = 100;
    this.showCloseModal = true;
  }

  /**
   * Close position
   */
  closePosition(): void {
    if (!this.selectedPosition) return;

    this.isClosingPosition = true;

    this.positionService.closePosition(this.selectedPosition.symbol, this.closePercentage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          console.log(`Position ${this.closePercentage === 100 ? 'closed' : 'partially closed'}:`, order);
          this.showCloseModal = false;
          this.isClosingPosition = false;
          this.selectedPosition = null;

          // Show success message
          this.showNotification(
            `Position ${this.closePercentage === 100 ? 'closed' : 'partially closed'} successfully`,
            'success'
          );
        },
        error: (error) => {
          console.error('Error closing position:', error);
          this.isClosingPosition = false;
          this.showNotification('Error closing position: ' + error.message, 'error');
        }
      });
  }

  /**
   * Update stop loss
   */
  updateStopLoss(position: PositionDisplay, newStopPrice: number): void {
    this.positionService.updateStopLoss(position.symbol, newStopPrice)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          console.log('Stop loss updated:', order);
          this.showNotification('Stop loss updated successfully', 'success');
        },
        error: (error) => {
          console.error('Error updating stop loss:', error);
          this.showNotification('Error updating stop loss: ' + error.message, 'error');
        }
      });
  }

  /**
   * Open position sizing calculator
   */
  openSizingCalculator(): void {
    this.showSizingCalculator = true;
    this.sizingInputs.accountBalance = this.totalBalance || 10000;
  }

  /**
   * Calculate position sizing
   */
  calculatePositionSizing(): void {
    if (this.sizingInputs.entryPrice <= 0 || this.sizingInputs.stopLoss <= 0) {
      this.showNotification('Please enter valid entry price and stop loss', 'error');
      return;
    }

    this.positionSizing = this.positionService.calculatePositionSizing(
      this.sizingInputs.accountBalance,
      this.sizingInputs.entryPrice,
      this.sizingInputs.stopLoss,
      this.sizingInputs.riskPercentage,
      this.sizingInputs.leverage
    );
  }

  /**
   * Open risk/reward calculator
   */
  openRiskRewardCalculator(): void {
    this.showRiskRewardCalculator = true;
  }

  /**
   * Calculate risk/reward
   */
  calculateRiskReward(): void {
    if (this.riskRewardInputs.entryPrice <= 0 ||
        this.riskRewardInputs.stopLoss <= 0 ||
        this.riskRewardInputs.takeProfit <= 0 ||
        this.riskRewardInputs.positionSize <= 0) {
      this.showNotification('Please enter valid values for all fields', 'error');
      return;
    }

    this.riskReward = this.positionService.calculateRiskReward(
      this.riskRewardInputs.entryPrice,
      this.riskRewardInputs.stopLoss,
      this.riskRewardInputs.takeProfit,
      this.riskRewardInputs.positionSize
    );
  }

  /**
   * Close modals
   */
  closeCloseModal(): void {
    this.showCloseModal = false;
    this.selectedPosition = null;
  }

  closeSizingCalculator(): void {
    this.showSizingCalculator = false;
    this.positionSizing = null;
  }

  closeRiskRewardCalculator(): void {
    this.showRiskRewardCalculator = false;
    this.riskReward = null;
  }

  /**
   * Format currency
   */
  formatCurrency(value: number, decimals: number = 2): string {
    if (isNaN(value)) return '0.00';
    return value.toFixed(decimals);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    if (isNaN(value)) return '0.00%';
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  }

  /**
   * Get position side color
   */
  getSideColor(side: 'LONG' | 'SHORT'): string {
    return side === 'LONG' ? '#22c55e' : '#ef4444';
  }

  /**
   * Get risk level color
   */
  getRiskLevelColor(riskRewardRatio: number): string {
    if (riskRewardRatio >= 3) return '#22c55e'; // Green - Good
    if (riskRewardRatio >= 2) return '#f59e0b'; // Yellow - Moderate
    return '#ef4444'; // Red - High Risk
  }

  /**
   * Get risk level text
   */
  getRiskLevelText(riskRewardRatio: number): string {
    if (riskRewardRatio >= 3) return 'Low Risk';
    if (riskRewardRatio >= 2) return 'Moderate Risk';
    return 'High Risk';
  }

  /**
   * Show notification (simplified implementation)
   */
  private showNotification(message: string, type: 'success' | 'error'): void {
    // In a real app, you'd use a proper notification service
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

  /**
   * Export positions to CSV
   */
  exportPositions(): void {
    const headers = [
      'Symbol', 'Side', 'Size', 'Entry Price', 'Mark Price',
      'Unrealized PnL', 'PnL %', 'Position Value', 'Margin Used', 'Days Held'
    ];

    const csvData = this.positions.map(pos => [
      pos.symbol,
      pos.side,
      pos.size.toFixed(6),
      pos.entryPrice.toFixed(4),
      pos.markPrice.toFixed(4),
      pos.unrealizedPnL.toFixed(2),
      pos.unrealizedPnLPercent.toFixed(2) + '%',
      pos.positionValue.toFixed(2),
      pos.marginUsed.toFixed(2),
      pos.daysHeld
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `positions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Refresh all data
   */
  refreshData(): void {
    this.loadPositions();
    this.loadPositionSummary();
    this.loadAccountBalance();
    this.showNotification('Data refreshed successfully', 'success');
  }
}
