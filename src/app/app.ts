import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from './services/settings.service';
import { ThemeService, ActiveTheme } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'AlgoTrader Pro';
  version = '0.7.5'; // Updated automatically by version script

  selectedTradingMode: 'testnet' | 'live' | 'demo';
  currentTheme: ActiveTheme = 'dark';

  constructor(
    private settingsService: SettingsService,
    private themeService: ThemeService
  ) {
    this.selectedTradingMode = this.settingsService.getSettings().tradingMode;
    this.currentTheme = this.themeService.getActiveTheme();
  }

  ngOnInit(): void {
    // Initialize selectedTradingMode from settings
    this.selectedTradingMode = this.settingsService.getSettings().tradingMode;

    // Subscribe to theme changes
    this.themeService.activeTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  onTradingModeChange(): void {
    this.settingsService.updateSettings({ tradingMode: this.selectedTradingMode });
    // Potentially reload the page or re-initialize services that depend on the trading mode
    // For now, a full page reload might be the simplest way to ensure all services re-initialize
    window.location.reload();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
