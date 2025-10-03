import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BinanceService } from '../../services/binance.service';
import { StrategyService } from '../../services/strategy.service';
import { AccountBalance, Position, Order, AccountStats, TradingStrategy, StrategySignal } from '../../models/trading.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  version = '0.1.0'; // Updated automatically by version script
  accountStats: AccountStats | null = null;
  balances: AccountBalance[] = [];
  positions: Position[] = [];
  openOrders: Order[] = [];
  strategies: TradingStrategy[] = [];
  signals: StrategySignal[] = [];

  // Edit mode tracking
  editingStrategyId: string | null = null;
  editingStrategy: Partial<TradingStrategy> = {};

  private subscriptions: Subscription[] = [];

  constructor(
    private binanceService: BinanceService,
    private strategyService: StrategyService
  ) {}

  ngOnInit(): void {
    // Subscribe to account stats
    this.subscriptions.push(
      this.binanceService.getAccountStats().subscribe(stats => {
        this.accountStats = stats;
      })
    );

    // Subscribe to balances
    this.subscriptions.push(
      this.binanceService.getAccountBalances().subscribe(balances => {
        this.balances = balances;
      })
    );

    // Subscribe to positions
    this.subscriptions.push(
      this.binanceService.getPositions().subscribe(positions => {
        this.positions = positions;
      })
    );

    // Subscribe to open orders
    this.subscriptions.push(
      this.binanceService.getOpenOrders().subscribe(orders => {
        this.openOrders = orders;
      })
    );

    // Subscribe to strategies
    this.subscriptions.push(
      this.strategyService.getStrategies().subscribe(strategies => {
        this.strategies = strategies;
      })
    );

    // Subscribe to signals
    this.subscriptions.push(
      this.strategyService.getSignals().subscribe(signals => {
        this.signals = signals.slice(0, 10); // Show last 10 signals
      })
    );

    // Start auto-refresh
    this.binanceService.startAutoRefresh(10000);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  refreshData(): void {
    this.binanceService.refreshAccountBalances();
    this.binanceService.refreshPositions();
    this.binanceService.refreshOpenOrders();
  }

  cancelOrder(symbol: string, orderId: number): void {
    this.binanceService.cancelOrder(symbol, orderId).then(() => {
      this.binanceService.refreshOpenOrders();
    });
  }

  toggleStrategy(strategyId: string, isActive: boolean): void {
    if (isActive) {
      this.strategyService.activateStrategy(strategyId);
    } else {
      this.strategyService.deactivateStrategy(strategyId);
    }
  }

  // Edit strategy methods
  startEditStrategy(strategy: TradingStrategy): void {
    this.editingStrategyId = strategy.id;
    this.editingStrategy = { ...strategy };
  }

  saveStrategy(): void {
    if (this.editingStrategyId && this.editingStrategy) {
      this.strategyService.updateStrategy(this.editingStrategyId, this.editingStrategy);
      this.cancelEdit();
    }
  }

  cancelEdit(): void {
    this.editingStrategyId = null;
    this.editingStrategy = {};
  }

  isEditing(strategyId: string): boolean {
    return this.editingStrategyId === strategyId;
  }

  deleteStrategy(strategyId: string): void {
    if (confirm('Möchten Sie diese Strategie wirklich löschen?')) {
      this.strategyService.deleteStrategy(strategyId);
    }
  }

  formatNumber(value: string | number, decimals: number = 2): string {
    const num = parseFloat(value.toString());

    // Handle invalid numbers
    if (isNaN(num)) {
      return '0.00';
    }

    // Format with proper locale and thousands separator
    return num.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  formatDate(date: Date | number): string {
    return new Date(date).toLocaleString();
  }

  toNumber(value: string | number): number {
    return parseFloat(value.toString());
  }
}
