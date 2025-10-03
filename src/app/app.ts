import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'Binance Trading System';
  version = '0.4.2'; // Updated automatically by version script

  selectedTradingMode: 'testnet' | 'live' | 'demo';

  constructor(private settingsService: SettingsService) {
    this.selectedTradingMode = this.settingsService.getSettings().tradingMode;
  }

  ngOnInit(): void {
    // Initialize selectedTradingMode from settings
    this.selectedTradingMode = this.settingsService.getSettings().tradingMode;
  }

  onTradingModeChange(): void {
    this.settingsService.updateSettings({ tradingMode: this.selectedTradingMode });
    // Potentially reload the page or re-initialize services that depend on the trading mode
    // For now, a full page reload might be the simplest way to ensure all services re-initialize
    window.location.reload();
  }
}
