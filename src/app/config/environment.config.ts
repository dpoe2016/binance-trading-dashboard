// Environment Configuration
// This file is tracked in Git and contains NO sensitive data
// Actual API keys should be loaded from environment variables or secure storage

export interface EnvironmentConfig {
  production: boolean;
  tradingMode: 'demo' | 'testnet' | 'live';
  binance: {
    apiKey: string;
    apiSecret: string;
    apiUrl: string;
    wsUrl: string;
  };
  testnet: {
    apiKey: string;
    apiSecret: string;
    apiUrl: string;
    wsUrl: string;
  };
  settings: {
    dataRefreshInterval: number;
    maxOrderSizeUsdt: number;
    autoTradingEnabled: boolean;
    defaultLeverage: number;
    maxPositionSizePercent: number;
    maxDailyLossPercent: number;
    debugMode: boolean;
  };
}

// Default configuration - uses demo mode by default
export const environment: EnvironmentConfig = {
  production: false,
  tradingMode: 'demo', // Change to 'testnet' or 'live' as needed

  binance: {
    apiKey: '',
    apiSecret: '',
    apiUrl: 'https://api.binance.com',
    wsUrl: 'wss://stream.binance.com:9443/ws'
  },

  testnet: {
    apiKey: '',
    apiSecret: '',
    apiUrl: 'https://testnet.binance.vision',
    wsUrl: 'wss://testnet.binance.vision/ws'
  },

  settings: {
    dataRefreshInterval: 10000, // 10 seconds
    maxOrderSizeUsdt: 1000,
    autoTradingEnabled: false,
    defaultLeverage: 1,
    maxPositionSizePercent: 10,
    maxDailyLossPercent: 5,
    debugMode: true
  }
};

// Load API keys from environment variables if available
// This allows secure configuration without committing keys
if (typeof window !== 'undefined' && (window as any).ENV_CONFIG) {
  const envConfig = (window as any).ENV_CONFIG;

  if (envConfig.TRADING_MODE) {
    environment.tradingMode = envConfig.TRADING_MODE;
  }

  if (envConfig.BINANCE_API_KEY) {
    environment.binance.apiKey = envConfig.BINANCE_API_KEY;
  }

  if (envConfig.BINANCE_API_SECRET) {
    environment.binance.apiSecret = envConfig.BINANCE_API_SECRET;
  }

  if (envConfig.BINANCE_TESTNET_API_KEY) {
    environment.testnet.apiKey = envConfig.BINANCE_TESTNET_API_KEY;
  }

  if (envConfig.BINANCE_TESTNET_API_SECRET) {
    environment.testnet.apiSecret = envConfig.BINANCE_TESTNET_API_SECRET;
  }
}
