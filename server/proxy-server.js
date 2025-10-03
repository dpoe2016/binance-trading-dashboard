#!/usr/bin/env node

/**
 * Binance API Proxy Server
 *
 * This proxy server solves CORS issues when calling Binance API from the browser.
 * It forwards requests from the Angular app to Binance API with proper authentication.
 *
 * Usage:
 *   node server/proxy-server.js
 *
 * The server will read configuration from .env file automatically.
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
const envConfig = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim().replace(/^["']|["']$/g, '');
      envConfig[key] = value;
    }
  });
}

const TRADING_MODE = envConfig.TRADING_MODE || 'demo';
const PORT = envConfig.PROXY_PORT || 3000;

// Select API configuration based on trading mode
let API_KEY = '';
let API_SECRET = '';
let API_BASE_URL = '';

if (TRADING_MODE === 'testnet') {
  API_KEY = envConfig.BINANCE_TESTNET_API_KEY || '';
  API_SECRET = envConfig.BINANCE_TESTNET_API_SECRET || '';
  API_BASE_URL = 'testnet.binance.vision';
  console.log('🧪 Proxy server running in TESTNET mode');
} else if (TRADING_MODE === 'live') {
  API_KEY = envConfig.BINANCE_API_KEY || '';
  API_SECRET = envConfig.BINANCE_API_SECRET || '';
  API_BASE_URL = 'api.binance.com';
  console.log('💰 Proxy server running in LIVE mode');
} else {
  console.log('🎮 Proxy server running in DEMO mode (no real API calls)');
}

// Generate HMAC SHA256 signature
function generateSignature(queryString) {
  if (!API_SECRET) return '';
  return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');
}

// Parse query string from URL
function parseQueryString(url) {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return {};

  const queryString = url.substring(queryStart + 1);
  const params = {};

  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key) params[key] = decodeURIComponent(value || '');
  });

  return params;
}

// Build query string from params
function buildQueryString(params) {
  return Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Demo mode - return mock data
  if (TRADING_MODE === 'demo') {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    if (req.url.includes('/account')) {
      res.end(JSON.stringify({
        balances: [
          { asset: 'USDT', free: '10000.00', locked: '500.00' },
          { asset: 'BTC', free: '0.15', locked: '0.00' },
          { asset: 'ETH', free: '2.5', locked: '0.00' }
        ]
      }));
    } else if (req.url.includes('/positionRisk')) {
      res.end(JSON.stringify([
        {
          symbol: 'BTCUSDT',
          positionAmt: '0.1',
          entryPrice: '45000',
          markPrice: '46500',
          unRealizedProfit: '150.00',
          liquidationPrice: '40000',
          leverage: '10',
          marginType: 'isolated'
        }
      ]));
    } else if (req.url.includes('/openOrders')) {
      res.end(JSON.stringify([]));
    } else {
      res.end(JSON.stringify({ error: 'Unknown endpoint' }));
    }
    return;
  }

  // Parse the request URL
  const urlPath = req.url;

  // Extract API path (remove /api/binance prefix if present)
  let apiPath = urlPath.replace(/^\/api\/binance/, '');

  // Parse existing query parameters
  const params = parseQueryString(apiPath);

  // Add timestamp if not present
  if (!params.timestamp) {
    params.timestamp = Date.now().toString();
  }

  // Build query string for signature
  const queryString = buildQueryString(params);

  // Generate signature
  const signature = generateSignature(queryString);
  params.signature = signature;

  // Build final query string
  const finalQueryString = buildQueryString(params);

  // Remove query string from path
  const pathWithoutQuery = apiPath.split('?')[0];

  // Build final URL
  const finalPath = `${pathWithoutQuery}?${finalQueryString}`;

  console.log(`📡 Proxying request: ${req.method} ${finalPath}`);

  // Proxy request to Binance
  const options = {
    hostname: API_BASE_URL,
    path: finalPath,
    method: req.method,
    headers: {
      'X-MBX-APIKEY': API_KEY,
      'Content-Type': 'application/json'
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Special handling for futures endpoints that might not be available
    if (proxyRes.statusCode === 404 && pathWithoutQuery.includes('/fapi/')) {
      console.warn('⚠️ Futures endpoint not available (404). Returning empty array.');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify([]));
      return;
    }

    // Forward status code
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });

    // Forward response body
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    console.error('❌ Proxy error:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Proxy error',
      message: error.message
    }));
  });

  // Forward request body if present
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      proxyReq.write(body);
      proxyReq.end();
    });
  } else {
    proxyReq.end();
  }
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 Binance API Proxy Server');
  console.log('='.repeat(60));
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`📋 Trading Mode: ${TRADING_MODE.toUpperCase()}`);

  if (TRADING_MODE !== 'demo') {
    console.log(`🔗 Binance API: https://${API_BASE_URL}`);
    console.log(`🔑 API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
  }

  console.log('');
  console.log('✅ Ready to proxy requests from Angular app');
  console.log('');
  console.log('ℹ️  Configure Angular app to use: http://localhost:' + PORT);
  console.log('='.repeat(60));
  console.log('');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down proxy server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
