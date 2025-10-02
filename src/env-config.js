// Environment Configuration Loader
// This file loads API keys from .env file or environment variables
// Place this in index.html BEFORE the main app loads

(function(window) {
  'use strict';

  // Configuration object that will be available globally
  window.ENV_CONFIG = {
    // Trading mode: 'demo', 'testnet', or 'live'
    // CHANGE THIS TO ACTIVATE TESTNET OR LIVE MODE:
    TRADING_MODE: 'demo',  // ← Ändere zu 'testnet' oder 'live'

    // Binance Live API credentials
    BINANCE_API_KEY: '',
    BINANCE_API_SECRET: '',

    // Binance Testnet API credentials
    // ENTER YOUR TESTNET API KEYS HERE:
    BINANCE_TESTNET_API_KEY: '',  // ← Dein Testnet API Key
    BINANCE_TESTNET_API_SECRET: ''  // ← Dein Testnet Secret
  };

  // In a production environment, you would load these from:
  // 1. Environment variables (server-side)
  // 2. Secure backend API
  // 3. Secure key management service (AWS Secrets Manager, etc.)

  // Example: Load from meta tags (set by server)
  // const tradingMode = document.querySelector('meta[name="trading-mode"]')?.content;
  // if (tradingMode) window.ENV_CONFIG.TRADING_MODE = tradingMode;

})(window);
