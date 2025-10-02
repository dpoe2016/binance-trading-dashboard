# Build Scripts

## generate-env.js

This script reads the `.env` file from the project root and generates TypeScript environment files.

### What it does:

1. Reads `.env` file
2. Parses environment variables (TRADING_MODE, API keys, etc.)
3. Generates `src/environments/environment.ts`
4. Generates `src/environments/environment.prod.ts`

### Usage:

The script runs automatically when you start the dev server or build the project:

```bash
npm start       # Runs generate-env automatically before starting
npm run build   # Runs generate-env automatically before building
```

You can also run it manually:

```bash
npm run generate-env
```

### Output:

The script creates environment files that look like this:

```typescript
export const environment: EnvironmentConfig = {
  production: false,
  tradingMode: 'testnet',
  binance: {
    apiKey: '...',
    apiSecret: '...',
    apiUrl: 'https://api.binance.com',
    wsUrl: 'wss://stream.binance.com:9443/ws'
  },
  testnet: {
    apiKey: '...',
    apiSecret: '...',
    apiUrl: 'https://testnet.binance.vision',
    wsUrl: 'wss://testnet.binance.vision/ws'
  },
  settings: {
    autoRefreshInterval: 10000,
    chartUpdateInterval: 1000
  }
};
```

### Important Notes:

- The generated files in `src/environments/` are **auto-generated** and should NOT be edited manually
- These files are in `.gitignore` because they contain your API keys from `.env`
- Always edit the `.env` file to change configuration, not the generated TypeScript files
- After changing `.env`, restart the dev server to regenerate the environment files
