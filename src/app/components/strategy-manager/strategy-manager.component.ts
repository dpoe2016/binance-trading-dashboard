import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StrategyService } from '../../services/strategy.service';
import { TradingStrategy } from '../../models/trading.model';

@Component({
  selector: 'app-strategy-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './strategy-manager.component.html',
  styleUrls: ['./strategy-manager.component.scss']
})
export class StrategyManagerComponent implements OnInit {
  strategies: TradingStrategy[] = [];
  showAddForm = false;

  // Edit mode tracking
  editingStrategyId: string | null = null;
  editingStrategy: Partial<TradingStrategy> = {};

  newStrategy = {
    name: '',
    description: '',
    symbol: 'BTCUSDT',
    timeframe: '15m',
    pineScript: '',
    usePineScript: false,
    useRSI: true,
    useAroon: false,
    aroonPeriod: 25,
    quantity: '0.001',
    autoExecute: false
  };

  symbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT',
    'XRPUSDT', 'DOTUSDT', 'UNIUSDT', 'LTCUSDT', 'SOLUSDT'
  ];

  timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  pineScriptExample = `// Beispiel Pine Script
// SMA Crossover Strategy
//@version=5
strategy("SMA Crossover", overlay=true)

sma20 = ta.sma(close, 20)
sma50 = ta.sma(close, 50)

// Kaufsignal: SMA20 kreuzt SMA50 nach oben
if (ta.crossover(sma20, sma50))
    strategy.entry("Long", strategy.long)

// Verkaufssignal: SMA20 kreuzt SMA50 nach unten
if (ta.crossunder(sma20, sma50))
    strategy.close("Long")`;

  constructor(private strategyService: StrategyService) {}

  ngOnInit(): void {
    this.strategyService.getStrategies().subscribe(strategies => {
      this.strategies = strategies;
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.resetForm();
    }
  }

  addStrategy(): void {
    if (!this.newStrategy.name || !this.newStrategy.symbol) {
      alert('Bitte Name und Symbol eingeben');
      return;
    }

    this.strategyService.addStrategy({
      name: this.newStrategy.name,
      description: this.newStrategy.description,
      symbol: this.newStrategy.symbol,
      timeframe: this.newStrategy.timeframe,
      pineScript: this.newStrategy.usePineScript ? this.newStrategy.pineScript : undefined,
      parameters: {
        useRSI: this.newStrategy.useRSI,
        useAroon: this.newStrategy.useAroon,
        aroonPeriod: this.newStrategy.aroonPeriod,
        quantity: this.newStrategy.quantity,
        autoExecute: this.newStrategy.autoExecute
      },
      isActive: false
    });

    this.showAddForm = false;
    this.resetForm();
  }

  deleteStrategy(id: string): void {
    if (confirm('Möchten Sie diese Strategie wirklich löschen?')) {
      this.strategyService.deleteStrategy(id);
    }
  }

  toggleStrategy(id: string, isActive: boolean): void {
    if (isActive) {
      this.strategyService.activateStrategy(id);
    } else {
      this.strategyService.deactivateStrategy(id);
    }
  }

  usePineScriptExample(): void {
    this.newStrategy.pineScript = this.pineScriptExample;
  }

  private resetForm(): void {
    this.newStrategy = {
      name: '',
      description: '',
      symbol: 'BTCUSDT',
      timeframe: '15m',
      pineScript: '',
      usePineScript: false,
      useRSI: true,
      useAroon: false,
      aroonPeriod: 25,
      quantity: '0.001',
      autoExecute: false
    };
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Nie';
    return new Date(date).toLocaleString();
  }

  // Edit strategy methods
  startEditStrategy(strategy: TradingStrategy): void {
    this.editingStrategyId = strategy.id;
    // Deep copy the strategy including parameters
    this.editingStrategy = {
      ...strategy,
      parameters: { ...strategy.parameters }
    };

    // Ensure all parameter fields exist with defaults
    if (!this.editingStrategy.parameters) {
      this.editingStrategy.parameters = {};
    }

    // Set defaults for missing parameters
    if (this.editingStrategy.parameters['rsiOversold'] === undefined) {
      this.editingStrategy.parameters['rsiOversold'] = 30;
    }
    if (this.editingStrategy.parameters['rsiOverbought'] === undefined) {
      this.editingStrategy.parameters['rsiOverbought'] = 70;
    }
    if (this.editingStrategy.parameters['aroonPeriod'] === undefined) {
      this.editingStrategy.parameters['aroonPeriod'] = 25;
    }
    if (this.editingStrategy.parameters['macdFastPeriod'] === undefined) {
      this.editingStrategy.parameters['macdFastPeriod'] = 12;
    }
    if (this.editingStrategy.parameters['macdSlowPeriod'] === undefined) {
      this.editingStrategy.parameters['macdSlowPeriod'] = 26;
    }
    if (this.editingStrategy.parameters['macdSignalPeriod'] === undefined) {
      this.editingStrategy.parameters['macdSignalPeriod'] = 9;
    }
    if (this.editingStrategy.parameters['choppinessPeriod'] === undefined) {
      this.editingStrategy.parameters['choppinessPeriod'] = 14;
    }
    if (this.editingStrategy.parameters['bbPeriod'] === undefined) {
      this.editingStrategy.parameters['bbPeriod'] = 20;
    }
    if (this.editingStrategy.parameters['bbStdDev'] === undefined) {
      this.editingStrategy.parameters['bbStdDev'] = 2;
    }
  }

  saveEditedStrategy(): void {
    if (this.editingStrategyId && this.editingStrategy) {
      this.strategyService.updateStrategy(this.editingStrategyId, this.editingStrategy);
      this.cancelEditStrategy();
    }
  }

  cancelEditStrategy(): void {
    this.editingStrategyId = null;
    this.editingStrategy = {};
  }

  isEditing(strategyId: string): boolean {
    return this.editingStrategyId === strategyId;
  }
}
