import { Injectable } from '@angular/core';

export interface UserSettings {
  tradingMode: 'testnet' | 'live' | 'demo';
  dashboard: {
    searchTerm: string;
  };
  chart: {
    selectedSymbol: string;
    selectedInterval: string;
    selectedStrategy: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'binance-trading-settings';

  private defaultSettings: UserSettings = {
    tradingMode: 'testnet',
    dashboard: {
      searchTerm: ''
    },
    chart: {
      selectedSymbol: 'BTCUSDT',
      selectedInterval: '15m',
      selectedStrategy: null
    }
  };

  constructor() {}

  // Get all settings
  getSettings(): UserSettings {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        return { ...this.defaultSettings, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Error parsing saved settings:', error);
        return this.defaultSettings;
      }
    }
    return this.defaultSettings;
  }

  // Save all settings
  saveSettings(settings: UserSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  // Update partial settings
  updateSettings(partial: Partial<UserSettings>): void {
    const current = this.getSettings();
    const updated = this.mergeDeep(current, partial);
    this.saveSettings(updated);
  }

  // Dashboard settings
  getDashboardSettings() {
    return this.getSettings().dashboard;
  }

  saveDashboardSettings(settings: Partial<UserSettings['dashboard']>): void {
    this.updateSettings({ dashboard: { ...this.getDashboardSettings(), ...settings } });
  }

  // Chart settings
  getChartSettings() {
    return this.getSettings().chart;
  }

  saveChartSettings(settings: Partial<UserSettings['chart']>): void {
    this.updateSettings({ chart: { ...this.getChartSettings(), ...settings } });
  }

  // Reset settings
  resetSettings(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Deep merge helper
  private mergeDeep(target: any, source: any): any {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
