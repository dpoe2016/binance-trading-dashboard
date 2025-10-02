import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AccountBalance, Position, Order, Candle, AccountStats } from '../models/trading.model';
import { environment } from '../config/environment.config';

@Injectable({
  providedIn: 'root'
})
export class BinanceService {
  private apiKey: string = '';
  private apiSecret: string = '';
  private baseUrl = environment.binance.apiUrl;
  private wsUrl = environment.binance.wsUrl;
  private tradingMode = environment.tradingMode;

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
    } else if (this.tradingMode === 'live') {
      this.baseUrl = environment.binance.apiUrl;
      this.wsUrl = environment.binance.wsUrl;
      this.apiKey = environment.binance.apiKey;
      this.apiSecret = environment.binance.apiSecret;
    } else {
      // Demo mode - use mock data
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
    // In production, this would call the real Binance API
    // For now, using mock data
    console.log('Refreshing account balances...');
    this.updateAccountStats();
  }

  // Positions (Futures)
  getPositions(): Observable<Position[]> {
    return this.positions$.asObservable();
  }

  async refreshPositions(): Promise<void> {
    // In production, this would call the real Binance API
    console.log('Refreshing positions...');
    this.updateAccountStats();
  }

  // Open Orders
  getOpenOrders(): Observable<Order[]> {
    return this.openOrders$.asObservable();
  }

  async refreshOpenOrders(symbol?: string): Promise<void> {
    // In production, this would call the real Binance API
    console.log('Refreshing open orders...', symbol);
    this.updateAccountStats();
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
}
