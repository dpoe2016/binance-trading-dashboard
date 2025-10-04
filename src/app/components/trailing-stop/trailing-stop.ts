import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  TrailingStopService,
  TrailingStop,
  TrailingStopType,
  TrailingStopAlert
} from '../../services/trailing-stop.service';
import { PositionService, PositionMetrics } from '../../services/position.service';
import { BinanceService } from '../../services/binance.service';

@Component({
  selector: 'app-trailing-stop',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trailing-stop.html',
  styleUrls: ['./trailing-stop.scss']
})
export class TrailingStopComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Trailing stops data
  trailingStops: TrailingStop[] = [];
  alerts: TrailingStopAlert[] = [];

  // UI state
  showCreateModal = false;
  showAlertsPanel = true;

  // Create form
  createForm = {
    symbol: 'BTCUSDT',
    positionSide: 'LONG' as 'LONG' | 'SHORT',
    type: TrailingStopType.PERCENTAGE,
    trailAmount: 2,
    quantity: 0,
    activationPrice: undefined as number | undefined,
    atrPeriod: 14
  };

  // Available symbols
  symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT'];

  // Trailing stop types for template
  TrailingStopType = TrailingStopType;

  // Positions for quantity suggestions
  positions: any[] = [];

  constructor(
    private trailingStopService: TrailingStopService,
    private positionService: PositionService,
    private binanceService: BinanceService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load data
   */
  loadData(): void {
    // Subscribe to trailing stops
    this.trailingStopService.trailingStops$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stops => {
        this.trailingStops = stops;
      });

    // Subscribe to alerts
    this.trailingStopService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts.slice(-10); // Last 10 alerts
      });

    // Load positions for quantity suggestions
    this.positionService.positions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(positions => {
        this.positions = positions;
      });
  }

  /**
   * Open create modal
   */
  openCreateModal(): void {
    this.showCreateModal = true;
  }

  /**
   * Close create modal
   */
  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  /**
   * Create trailing stop
   */
  createTrailingStop(): void {
    if (this.createForm.quantity <= 0) {
      this.showNotification('Please enter a valid quantity', 'error');
      return;
    }

    if (this.createForm.trailAmount <= 0) {
      this.showNotification('Please enter a valid trail amount', 'error');
      return;
    }

    this.trailingStopService.createTrailingStop(
      this.createForm.symbol,
      this.createForm.positionSide,
      this.createForm.type,
      this.createForm.trailAmount,
      this.createForm.quantity,
      this.createForm.activationPrice,
      this.createForm.atrPeriod
    ).subscribe({
      next: (trailingStop) => {
        this.showNotification('Trailing stop created successfully', 'success');
        this.closeCreateModal();
      },
      error: (error) => {
        console.error('Error creating trailing stop:', error);
        this.showNotification('Error creating trailing stop: ' + error.message, 'error');
      }
    });
  }

  /**
   * Cancel trailing stop
   */
  cancelTrailingStop(trailingStopId: string): void {
    if (confirm('Are you sure you want to cancel this trailing stop?')) {
      this.trailingStopService.cancelTrailingStop(trailingStopId);
      this.showNotification('Trailing stop cancelled', 'success');
    }
  }

  /**
   * Set quantity from position
   */
  setQuantityFromPosition(): void {
    const position = this.positions.find(p => p.symbol === this.createForm.symbol);
    if (position) {
      this.createForm.quantity = Math.abs(parseFloat(position.positionAmt));
    }
  }

  /**
   * Toggle alerts panel
   */
  toggleAlertsPanel(): void {
    this.showAlertsPanel = !this.showAlertsPanel;
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.trailingStopService.clearAlerts();
  }

  /**
   * Get alert icon
   */
  getAlertIcon(type: string): string {
    switch (type) {
      case 'CREATED': return '✅';
      case 'UPDATED': return '🔄';
      case 'TRIGGERED': return '🎯';
      case 'CANCELLED': return '❌';
      default: return 'ℹ️';
    }
  }

  /**
   * Get alert color class
   */
  getAlertColorClass(type: string): string {
    switch (type) {
      case 'CREATED': return 'alert-success';
      case 'UPDATED': return 'alert-info';
      case 'TRIGGERED': return 'alert-warning';
      case 'CANCELLED': return 'alert-danger';
      default: return 'alert-info';
    }
  }

  /**
   * Get status color
   */
  getStatusColor(trailingStop: TrailingStop): string {
    if (trailingStop.isTriggered) return '#ef4444';
    if (!trailingStop.isActive) return '#94a3b8';
    return '#22c55e';
  }

  /**
   * Get status text
   */
  getStatusText(trailingStop: TrailingStop): string {
    if (trailingStop.isTriggered) return 'Triggered';
    if (!trailingStop.isActive) return 'Pending Activation';
    return 'Active';
  }

  /**
   * Format type
   */
  formatType(type: TrailingStopType): string {
    switch (type) {
      case TrailingStopType.PERCENTAGE: return 'Percentage';
      case TrailingStopType.FIXED_AMOUNT: return 'Fixed Amount';
      case TrailingStopType.ATR_BASED: return 'ATR Based';
      default: return type;
    }
  }

  /**
   * Format trail amount
   */
  formatTrailAmount(trailingStop: TrailingStop): string {
    switch (trailingStop.type) {
      case TrailingStopType.PERCENTAGE:
        return trailingStop.trailAmount + '%';
      case TrailingStopType.FIXED_AMOUNT:
        return '$' + trailingStop.trailAmount.toFixed(2);
      case TrailingStopType.ATR_BASED:
        return trailingStop.trailAmount + 'x ATR';
      default:
        return trailingStop.trailAmount.toString();
    }
  }

  /**
   * Reset form
   */
  private resetForm(): void {
    this.createForm = {
      symbol: 'BTCUSDT',
      positionSide: 'LONG',
      type: TrailingStopType.PERCENTAGE,
      trailAmount: 2,
      quantity: 0,
      activationPrice: undefined,
      atrPeriod: 14
    };
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
