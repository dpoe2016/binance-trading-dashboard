import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';
export type ActiveTheme = 'light' | 'dark';

export interface ThemeColors {
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // Border colors
  borderPrimary: string;
  borderSecondary: string;

  // Accent colors
  accentPrimary: string;
  accentSecondary: string;

  // Status colors
  success: string;
  danger: string;
  warning: string;
  info: string;

  // Trading specific
  buyGreen: string;
  sellRed: string;

  // Chart colors
  chartGrid: string;
  chartText: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'app-theme';
  private themeSubject = new BehaviorSubject<Theme>('auto');
  private activeThemeSubject = new BehaviorSubject<ActiveTheme>('dark');

  public theme$ = this.themeSubject.asObservable();
  public activeTheme$ = this.activeThemeSubject.asObservable();

  // Color palettes
  private lightTheme: ThemeColors = {
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f7fa',
    bgTertiary: '#e8ecef',
    bgHover: '#f0f2f5',

    textPrimary: '#1a1a1a',
    textSecondary: '#4a5568',
    textTertiary: '#718096',

    borderPrimary: '#e2e8f0',
    borderSecondary: '#cbd5e0',

    accentPrimary: '#3b82f6',
    accentSecondary: '#60a5fa',

    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',

    buyGreen: '#10b981',
    sellRed: '#ef4444',

    chartGrid: '#e5e7eb',
    chartText: '#4b5563'
  };

  private darkTheme: ThemeColors = {
    bgPrimary: '#2a2d35',
    bgSecondary: '#1e2128',
    bgTertiary: '#363a45',
    bgHover: '#3a3e4a',

    textPrimary: '#e8e9ed',
    textSecondary: '#b8bcc8',
    textTertiary: '#8b8f9c',

    borderPrimary: '#404452',
    borderSecondary: '#4f5463',

    accentPrimary: '#60a5fa',
    accentSecondary: '#3b82f6',

    success: '#22c55e',
    danger: '#f87171',
    warning: '#fbbf24',
    info: '#60a5fa',

    buyGreen: '#22c55e',
    sellRed: '#f87171',

    chartGrid: '#404452',
    chartText: '#8b8f9c'
  };

  constructor() {
    this.initializeTheme();
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.STORAGE_KEY) as Theme;
    const theme = savedTheme || 'auto';
    this.setTheme(theme);

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this.themeSubject.value === 'auto') {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * Set theme preference
   */
  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);

    if (theme === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.applyTheme(theme);
    }
  }

  /**
   * Get current theme preference
   */
  getTheme(): Theme {
    return this.themeSubject.value;
  }

  /**
   * Get active theme (resolved from auto)
   */
  getActiveTheme(): ActiveTheme {
    return this.activeThemeSubject.value;
  }

  /**
   * Toggle between light and dark
   */
  toggleTheme(): void {
    const current = this.activeThemeSubject.value;
    const newTheme: Theme = current === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Get current theme colors
   */
  getColors(): ThemeColors {
    return this.activeThemeSubject.value === 'light' ? this.lightTheme : this.darkTheme;
  }

  /**
   * Apply theme to DOM
   */
  private applyTheme(theme: ActiveTheme): void {
    this.activeThemeSubject.next(theme);

    // Set data-theme attribute on document
    document.documentElement.setAttribute('data-theme', theme);

    // Apply CSS variables
    const colors = theme === 'light' ? this.lightTheme : this.darkTheme;
    this.applyCSSVariables(colors);

    console.log(`🎨 Theme applied: ${theme}`);
  }

  /**
   * Apply CSS custom properties
   */
  private applyCSSVariables(colors: ThemeColors): void {
    const root = document.documentElement;

    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--bg-hover', colors.bgHover);

    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--text-tertiary', colors.textTertiary);

    root.style.setProperty('--border-primary', colors.borderPrimary);
    root.style.setProperty('--border-secondary', colors.borderSecondary);

    root.style.setProperty('--accent-primary', colors.accentPrimary);
    root.style.setProperty('--accent-secondary', colors.accentSecondary);

    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--danger', colors.danger);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--info', colors.info);

    root.style.setProperty('--buy-green', colors.buyGreen);
    root.style.setProperty('--sell-red', colors.sellRed);

    root.style.setProperty('--chart-grid', colors.chartGrid);
    root.style.setProperty('--chart-text', colors.chartText);
  }

  /**
   * Check if system prefers dark mode
   */
  systemPrefersDark(): boolean {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
