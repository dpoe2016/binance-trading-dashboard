import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AccountBalance, Position, Order, Candle, AccountStats } from '../models/trading.model';
import { environment } from '../config/environment.config';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class BinanceService {
  private apiKey: string = '';
  private apiSecret: string = '';
  private baseUrl = environment.binance.apiUrl;
  private wsUrl = environment.binance.wsUrl;
  private tradingMode = environment.tradingMode;
  private useProxy = environment.useProxy;
  private proxyUrl = environment.proxyUrl;

  private accountBalances$ = new BehaviorSubject<AccountBalance[]>([]);
  private positions$ = new BehaviorSubject<Position[]>([]);
  private openOrders$ = new BehaviorSubject<Order[]>([]);
  private accountStats$ = new BehaviorSubject<AccountStats | null>(null);
  private ws: WebSocket | null = null;

  constructor(private http: HttpClient) {
    this.initializeFromEnvironment();
  }

  private initializeFromEnvironment(): void {
    // Select API endpoints based on trading mode
    if (this.tradingMode === 'testnet') {
      this.baseUrl = environment.testnet.apiUrl;
      this.wsUrl = environment.testnet.wsUrl;
      this.apiKey = environment.testnet.apiKey;
      this.apiSecret = environment.testnet.apiSecret;
      console.log('🧪 Testnet mode activated - using real Binance Testnet API');
    } else if (this.tradingMode === 'live') {
      this.baseUrl = environment.binance.apiUrl;
      this.wsUrl = environment.binance.wsUrl;
      this.apiKey = environment.binance.apiKey;
      this.apiSecret = environment.binance.apiSecret;
      console.log('💰 Live mode activated - using real Binance API');
    } else {
      // Demo mode - use mock data
      console.log('🎮 Demo mode activated - using mock data');
      this.loadMockData();
    }
  }

  initializeClient(apiKey: string, apiSecret: string): void {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // Load mock data for demo
  private loadMockData(): void {
    this.accountBalances$.next([
      { asset: 'USDT', free: '10000.00', locked: '500.00' },
      { asset: 'BTC', free: '0.15', locked: '0.00' },
      { asset: 'ETH', free: '2.5', locked: '0.00' }
    ]);

    this.positions$.next([
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
    ]);

    this.updateAccountStats();
  }

  // Account Balance
  getAccountBalances(): Observable<AccountBalance[]> {
    return this.accountBalances$.asObservable();
  }

  async refreshAccountBalances(): Promise<void> {
    if (this.tradingMode === 'demo') {
      // Demo mode - data already loaded in loadMockData()
      console.log('Demo mode: Using mock account balances');
      return;
    }

    // Testnet or Live mode - fetch real data
    try {
      const timestamp = Date.now();
      let url: string;
      let headers: HttpHeaders;

      if (this.useProxy) {
        // Use proxy server (no signature needed, proxy handles it)
        url = `${this.proxyUrl}/api/v3/account?timestamp=${timestamp}`;
        headers = new HttpHeaders();
      } else {
        // Direct API call (requires signature)
        const signature = this.generateSignature(`timestamp=${timestamp}`);
        url = `${this.baseUrl}/api/v3/account?timestamp=${timestamp}&signature=${signature}`;
        headers = new HttpHeaders({
          'X-MBX-APIKEY': this.apiKey
        });
      }

      const response: any = await this.http.get(url, { headers }).toPromise();

      if (response && response.balances) {
        const balances = response.balances.filter((b: any) =>
          parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
        );
        this.accountBalances$.next(balances);
        console.log(`✅ Loaded ${balances.length} account balances from ${this.tradingMode} API`);
      }

      this.updateAccountStats();
    } catch (error) {
      console.error('Error fetching account balances:', error);
      // On error, clear the balances to avoid showing stale data
      this.accountBalances$.next([]);
    }
  }

  // Positions (Futures)
  getPositions(): Observable<Position[]> {
    return this.positions$.asObservable();
  }

  async refreshPositions(): Promise<void> {
    if (this.tradingMode === 'demo') {
      // Demo mode - data already loaded in loadMockData()
      console.log('Demo mode: Using mock positions');
      return;
    }

    // Testnet or Live mode - fetch real futures positions
    try {
      const timestamp = Date.now();
      let url: string;
      let headers: HttpHeaders;

      if (this.useProxy) {
        // Use proxy server
        url = `${this.proxyUrl}/fapi/v2/positionRisk?timestamp=${timestamp}`;
        headers = new HttpHeaders();
      } else {
        // Direct API call
        const signature = this.generateSignature(`timestamp=${timestamp}`);
        url = `${this.baseUrl}/fapi/v2/positionRisk?timestamp=${timestamp}&signature=${signature}`;
        headers = new HttpHeaders({
          'X-MBX-APIKEY': this.apiKey
        });
      }

      const response: any = await this.http.get(url, { headers }).toPromise();

      if (response && Array.isArray(response)) {
        const positions = response.filter((p: any) => parseFloat(p.positionAmt) !== 0);
        this.positions$.next(positions);
        console.log(`✅ Loaded ${positions.length} positions from ${this.tradingMode} API`);
      }

      this.updateAccountStats();
    } catch (error: any) {
      // Futures API might not be available on testnet or account
      if (error.status === 404) {
        console.warn('⚠️ Futures API not available (404). This is normal for spot-only accounts or testnet.');
      } else {
        console.error('Error fetching positions:', error);
      }
      // Clear positions on error
      this.positions$.next([]);
      this.updateAccountStats();
    }
  }

  // Open Orders
  getOpenOrders(): Observable<Order[]> {
    return this.openOrders$.asObservable();
  }

  async refreshOpenOrders(symbol?: string): Promise<void> {
    if (this.tradingMode === 'demo') {
      // Demo mode - no open orders in demo
      console.log('Demo mode: No open orders');
      return;
    }

    // Testnet or Live mode - fetch real open orders
    try {
      const timestamp = Date.now();
      const queryParams = symbol ? `symbol=${symbol}&timestamp=${timestamp}` : `timestamp=${timestamp}`;
      let url: string;
      let headers: HttpHeaders;

      if (this.useProxy) {
        // Use proxy server
        url = `${this.proxyUrl}/api/v3/openOrders?${queryParams}`;
        headers = new HttpHeaders();
      } else {
        // Direct API call
        const signature = this.generateSignature(queryParams);
        url = `${this.baseUrl}/api/v3/openOrders?${queryParams}&signature=${signature}`;
        headers = new HttpHeaders({
          'X-MBX-APIKEY': this.apiKey
        });
      }

      const response: any = await this.http.get(url, { headers }).toPromise();

      if (response && Array.isArray(response)) {
        this.openOrders$.next(response);
        console.log(`✅ Loaded ${response.length} open orders from ${this.tradingMode} API`);
      }

      this.updateAccountStats();
    } catch (error) {
      console.error('Error fetching open orders:', error);
      // Clear orders on error
      this.openOrders$.next([]);
    }
  }

  // Account Statistics
  getAccountStats(): Observable<AccountStats | null> {
    return this.accountStats$.asObservable();
  }

  private updateAccountStats(): void {
    const balances = this.accountBalances$.value;
    const positions = this.positions$.value;
    const orders = this.openOrders$.value;

    const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.free) + parseFloat(b.locked), 0);
    const availableBalance = balances.reduce((sum, b) => sum + parseFloat(b.free), 0);
    const unrealizedPnL = positions.reduce((sum, p) => sum + parseFloat(p.unRealizedProfit), 0);

    this.accountStats$.next({
      totalBalance,
      availableBalance,
      unrealizedPnL,
      marginUsed: totalBalance - availableBalance,
      positionCount: positions.length,
      openOrdersCount: orders.length
    });
  }

  // Market Data
  async getCandles(symbol: string, interval: string, limit: number = 500): Promise<Candle[]> {
    try {
      // Fetch public market data from Binance API (no authentication needed)
      const url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch(url);
      const data = await response.json();

      return data.map((c: any[]) => ({
        time: c[0],
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5])
      }));
    } catch (error) {
      console.error('Error fetching candles:', error);
      return this.getMockCandles();
    }
  }

  private getMockCandles(): Candle[] {
    // Generate mock candle data
    const now = Date.now();
    const candles: Candle[] = [];
    for (let i = 100; i >= 0; i--) {
      const basePrice = 45000 + Math.random() * 5000;
      candles.push({
        time: now - i * 60000,
        open: basePrice,
        high: basePrice + Math.random() * 500,
        low: basePrice - Math.random() * 500,
        close: basePrice + (Math.random() - 0.5) * 300,
        volume: Math.random() * 100
      });
    }
    return candles;
  }

  // Trading Operations
  async placeLimitOrder(symbol: string, side: 'BUY' | 'SELL', quantity: string, price: string): Promise<any> {
    console.log('Placing limit order (demo mode):', { symbol, side, quantity, price });
    return { orderId: Date.now(), status: 'NEW' };
  }

  async placeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: string): Promise<any> {
    console.log('Placing market order (demo mode):', { symbol, side, quantity });
    return { orderId: Date.now(), status: 'FILLED' };
  }

  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    console.log('Canceling order (demo mode):', { symbol, orderId });
    return { orderId, status: 'CANCELED' };
  }

  // WebSocket - Price Updates
  subscribeToPriceUpdates(symbol: string, callback: (price: string) => void): () => void {
    // Create WebSocket connection for price updates
    const wsUrl = `${this.wsUrl}/${symbol.toLowerCase()}@ticker`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data.c); // Current price
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Return cleanup function
    return () => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  // Start auto-refresh
  startAutoRefresh(intervalMs: number = 10000): void {
    interval(intervalMs).subscribe(() => {
      this.refreshAccountBalances();
      this.refreshPositions();
      this.refreshOpenOrders();
    });
  }

  // Generate HMAC SHA256 signature for authenticated requests
  private generateSignature(queryString: string): string {
    if (!this.apiSecret) {
      console.warn('⚠️ API Secret not configured - cannot authenticate requests');
      return '';
    }

    // Generate HMAC SHA256 signature using crypto-js
    const signature = CryptoJS.HmacSHA256(queryString, this.apiSecret).toString();
    return signature;
  }
}
