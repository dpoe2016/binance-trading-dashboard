import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  PaperTradingService,
  PaperTradingConfig
} from '../../services/paper-trading.service';

@Component({
  selector: 'app-paper-trading-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paper-trading-config.html',
  styleUrls: ['./paper-trading-config.scss']
})
export class PaperTradingConfigComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  config: PaperTradingConfig = {
    enableSlippage: true,
    slippagePercent: 0.1,
    slippageModel: 'volume-based',
    enableFees: true,
    makerFeePercent: 0.1,
    takerFeePercent: 0.1,
    enableOrderBookSimulation: true,
    orderBookDepth: 20,
    enablePartialFills: true,
    partialFillProbability: 0.15,
    enableLatency: true,
    minLatencyMs: 50,
    maxLatencyMs: 300,
    enableMarketImpact: true,
    marketImpactFactor: 0.05
  };

  slippageModels = [
    { value: 'fixed', label: 'Fixed Slippage' },
    { value: 'volume-based', label: 'Volume-Based' },
    { value: 'volatility-based', label: 'Volatility-Based' }
  ];

  showSuccessMessage = false;
  activeTab: 'slippage' | 'fees' | 'fills' | 'latency' | 'impact' = 'slippage';

  constructor(private paperTradingService: PaperTradingService) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load current configuration
   */
  loadConfig(): void {
    this.paperTradingService.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.config = { ...config };
      });
  }

  /**
   * Save configuration
   */
  saveConfig(): void {
    this.paperTradingService.updateConfig(this.config);
    this.showSuccessMessage = true;
    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 3000);
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      this.paperTradingService.resetConfig();
      this.loadConfig();
      this.showSuccessMessage = true;
      setTimeout(() => {
        this.showSuccessMessage = false;
      }, 3000);
    }
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'slippage' | 'fees' | 'fills' | 'latency' | 'impact'): void {
    this.activeTab = tab;
  }

  /**
   * Get estimated impact description
   */
  getImpactDescription(): string {
    if (!this.config.enableSlippage && !this.config.enableFees &&
        !this.config.enablePartialFills && !this.config.enableLatency &&
        !this.config.enableMarketImpact) {
      return 'Unrealistic - No simulations enabled';
    }

    const enabledCount = [
      this.config.enableSlippage,
      this.config.enableFees,
      this.config.enablePartialFills,
      this.config.enableLatency,
      this.config.enableMarketImpact
    ].filter(Boolean).length;

    if (enabledCount >= 4) {
      return 'Very Realistic - All major factors simulated';
    } else if (enabledCount >= 3) {
      return 'Realistic - Most factors simulated';
    } else if (enabledCount >= 2) {
      return 'Moderate - Some factors simulated';
    } else {
      return 'Basic - Minimal simulation';
    }
  }

  /**
   * Get realism score (0-100)
   */
  getRealismScore(): number {
    let score = 0;

    if (this.config.enableSlippage) score += 25;
    if (this.config.enableFees) score += 25;
    if (this.config.enablePartialFills) score += 15;
    if (this.config.enableLatency) score += 15;
    if (this.config.enableMarketImpact) score += 20;

    return score;
  }

  /**
   * Get realism color
   */
  getRealismColor(): string {
    const score = this.getRealismScore();
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#fbbf24'; // Yellow
    if (score >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }
}
