import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import {
  Order,
  CreateOrderRequest,
  OrderStatus,
  OrderType,
  OrderSide,
  OrderFill
} from '../models/trading.model';

/**
 * Paper Trading Configuration
 */
export interface PaperTradingConfig {
  // Slippage settings
  enableSlippage: boolean;
  slippagePercent: number; // Default: 0.1% (10 basis points)
  slippageModel: 'fixed' | 'volume-based' | 'volatility-based';

  // Fee settings
  enableFees: boolean;
  makerFeePercent: number; // Default: 0.1%
  takerFeePercent: number; // Default: 0.1%

  // Order book simulation
  enableOrderBookSimulation: boolean;
  orderBookDepth: number; // Number of price levels to simulate

  // Partial fills
  enablePartialFills: boolean;
  partialFillProbability: number; // 0-1 probability of partial fill

  // Latency simulation
  enableLatency: boolean;
  minLatencyMs: number; // Minimum order processing latency
  maxLatencyMs: number; // Maximum order processing latency

  // Market impact
  enableMarketImpact: boolean;
  marketImpactFactor: number; // Impact per 1% of volume
}

/**
 * Simulated order book level
 */
interface OrderBookLevel {
  price: number;
  quantity: number;
}

/**
 * Paper Trading Service
 * Simulates realistic trading conditions for paper trading
 */
@Injectable({
  providedIn: 'root'
})
export class PaperTradingService {
  private configSubject = new BehaviorSubject<PaperTradingConfig>(this.getDefaultConfig());
  public config$ = this.configSubject.asObservable();

  constructor() {
    this.loadConfig();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PaperTradingConfig {
    return {
      enableSlippage: true,
      slippagePercent: 0.1,
      slippageModel: 'volume-based',
      enableFees: true,
      makerFeePercent: 0.1,
      takerFeePercent: 0.1,
      enableOrderBookSimulation: true,
      orderBookDepth: 20,
      enablePartialFills: true,
      partialFillProbability: 0.15,
      enableLatency: true,
      minLatencyMs: 50,
      maxLatencyMs: 300,
      enableMarketImpact: true,
      marketImpactFactor: 0.05
    };
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): void {
    const savedConfig = localStorage.getItem('paperTradingConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.configSubject.next({ ...this.getDefaultConfig(), ...config });
      } catch (error) {
        console.error('Error loading paper trading config:', error);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PaperTradingConfig>): void {
    const currentConfig = this.configSubject.value;
    const newConfig = { ...currentConfig, ...config };
    this.configSubject.next(newConfig);
    localStorage.setItem('paperTradingConfig', JSON.stringify(newConfig));
  }

  /**
   * Get current configuration
   */
  getConfig(): PaperTradingConfig {
    return this.configSubject.value;
  }

  /**
   * Calculate realistic slippage for an order
   */
  calculateSlippage(
    orderRequest: CreateOrderRequest,
    marketPrice: number,
    orderBookData?: any
  ): number {
    const config = this.configSubject.value;

    if (!config.enableSlippage) {
      return 0;
    }

    const quantity = parseFloat(orderRequest.quantity);

    switch (config.slippageModel) {
      case 'fixed':
        return this.calculateFixedSlippage(marketPrice, config.slippagePercent);

      case 'volume-based':
        return this.calculateVolumeBasedSlippage(
          marketPrice,
          quantity,
          config.slippagePercent
        );

      case 'volatility-based':
        return this.calculateVolatilityBasedSlippage(
          marketPrice,
          config.slippagePercent,
          orderBookData
        );

      default:
        return 0;
    }
  }

  /**
   * Fixed slippage calculation
   */
  private calculateFixedSlippage(price: number, slippagePercent: number): number {
    return price * (slippagePercent / 100);
  }

  /**
   * Volume-based slippage (larger orders have more slippage)
   */
  private calculateVolumeBasedSlippage(
    price: number,
    quantity: number,
    baseSlippagePercent: number
  ): number {
    // Increase slippage based on order size
    let volumeMultiplier = 1;

    if (quantity > 1000) {
      volumeMultiplier = 2.5;
    } else if (quantity > 500) {
      volumeMultiplier = 2.0;
    } else if (quantity > 100) {
      volumeMultiplier = 1.5;
    } else if (quantity > 50) {
      volumeMultiplier = 1.2;
    }

    const adjustedSlippage = baseSlippagePercent * volumeMultiplier;
    return price * (adjustedSlippage / 100);
  }

  /**
   * Volatility-based slippage (more volatile = more slippage)
   */
  private calculateVolatilityBasedSlippage(
    price: number,
    baseSlippagePercent: number,
    orderBookData?: any
  ): number {
    // Simulate volatility using random factor (in real implementation, use ATR or actual volatility)
    const volatilityFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const adjustedSlippage = baseSlippagePercent * volatilityFactor;
    return price * (adjustedSlippage / 100);
  }

  /**
   * Calculate fees for an order
   */
  calculateFees(
    orderRequest: CreateOrderRequest,
    executionPrice: number,
    isMaker: boolean = false
  ): { fee: number; feePercent: number; feeAsset: string } {
    const config = this.configSubject.value;

    if (!config.enableFees) {
      return { fee: 0, feePercent: 0, feeAsset: 'USDT' };
    }

    const quantity = parseFloat(orderRequest.quantity);
    const notionalValue = quantity * executionPrice;

    const feePercent = isMaker ? config.makerFeePercent : config.takerFeePercent;
    const fee = notionalValue * (feePercent / 100);

    // Determine fee asset (quote asset for buy, base asset for sell)
    const feeAsset = orderRequest.side === OrderSide.BUY ?
      this.getQuoteAsset(orderRequest.symbol) :
      this.getBaseAsset(orderRequest.symbol);

    return { fee, feePercent, feeAsset };
  }

  /**
   * Simulate order book for realistic fill prices
   */
  simulateOrderBook(
    symbol: string,
    marketPrice: number,
    depth: number = 20
  ): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
    const config = this.configSubject.value;

    if (!config.enableOrderBookSimulation) {
      return { bids: [], asks: [] };
    }

    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    // Simulate bid levels (below market price)
    for (let i = 0; i < depth; i++) {
      const priceOffset = (i + 1) * 0.001; // 0.1% per level
      const price = marketPrice * (1 - priceOffset);
      const quantity = this.generateRandomQuantity(100, 1000);
      bids.push({ price, quantity });
    }

    // Simulate ask levels (above market price)
    for (let i = 0; i < depth; i++) {
      const priceOffset = (i + 1) * 0.001; // 0.1% per level
      const price = marketPrice * (1 + priceOffset);
      const quantity = this.generateRandomQuantity(100, 1000);
      asks.push({ price, quantity });
    }

    return { bids, asks };
  }

  /**
   * Simulate partial fills for an order
   */
  simulatePartialFill(
    orderRequest: CreateOrderRequest,
    marketPrice: number
  ): { shouldPartialFill: boolean; fillPercentage: number } {
    const config = this.configSubject.value;

    if (!config.enablePartialFills) {
      return { shouldPartialFill: false, fillPercentage: 100 };
    }

    // Only apply partial fills to limit orders
    if (orderRequest.type !== OrderType.LIMIT) {
      return { shouldPartialFill: false, fillPercentage: 100 };
    }

    const shouldPartialFill = Math.random() < config.partialFillProbability;

    if (!shouldPartialFill) {
      return { shouldPartialFill: false, fillPercentage: 100 };
    }

    // Random fill percentage between 20% and 80%
    const fillPercentage = 20 + Math.random() * 60;

    return { shouldPartialFill: true, fillPercentage };
  }

  /**
   * Simulate order processing latency
   */
  simulateLatency(): Promise<void> {
    const config = this.configSubject.value;

    if (!config.enableLatency) {
      return Promise.resolve();
    }

    const latency = config.minLatencyMs +
      Math.random() * (config.maxLatencyMs - config.minLatencyMs);

    return new Promise(resolve => setTimeout(resolve, latency));
  }

  /**
   * Calculate market impact for large orders
   */
  calculateMarketImpact(
    orderRequest: CreateOrderRequest,
    marketPrice: number,
    dailyVolume: number = 1000000
  ): number {
    const config = this.configSubject.value;

    if (!config.enableMarketImpact) {
      return 0;
    }

    const quantity = parseFloat(orderRequest.quantity);
    const orderValue = quantity * marketPrice;

    // Calculate order size as percentage of daily volume
    const volumePercentage = (orderValue / dailyVolume) * 100;

    // Impact increases non-linearly with volume percentage
    const impact = marketPrice * config.marketImpactFactor * Math.pow(volumePercentage, 1.5) / 100;

    return impact;
  }

  /**
   * Process order with realistic simulations
   */
  async processRealisticOrder(
    orderRequest: CreateOrderRequest,
    marketPrice: number,
    dailyVolume?: number
  ): Promise<{
    executionPrice: number;
    executedQuantity: number;
    fills: OrderFill[];
    totalFees: number;
    slippage: number;
    marketImpact: number;
  }> {
    // Simulate latency
    await this.simulateLatency();

    // Calculate slippage
    const slippage = this.calculateSlippage(orderRequest, marketPrice);

    // Calculate market impact
    const marketImpact = this.calculateMarketImpact(
      orderRequest,
      marketPrice,
      dailyVolume
    );

    // Determine if maker or taker (market orders are always taker)
    const isMaker = orderRequest.type === OrderType.LIMIT;

    // Calculate execution price with slippage and market impact
    let executionPrice = marketPrice;

    if (orderRequest.side === OrderSide.BUY) {
      executionPrice += slippage + marketImpact;
    } else {
      executionPrice -= slippage + marketImpact;
    }

    // Simulate partial fills
    const partialFillResult = this.simulatePartialFill(orderRequest, marketPrice);
    const executedQuantity = partialFillResult.shouldPartialFill ?
      parseFloat(orderRequest.quantity) * (partialFillResult.fillPercentage / 100) :
      parseFloat(orderRequest.quantity);

    // Calculate fees
    const feeData = this.calculateFees(orderRequest, executionPrice, isMaker);

    // Create order fills (simulate multiple fills for large orders)
    const fills = this.generateOrderFills(
      executedQuantity,
      executionPrice,
      feeData.fee,
      feeData.feeAsset
    );

    return {
      executionPrice,
      executedQuantity,
      fills,
      totalFees: feeData.fee,
      slippage,
      marketImpact
    };
  }

  /**
   * Generate order fills (can split into multiple fills)
   */
  private generateOrderFills(
    totalQuantity: number,
    avgPrice: number,
    totalFee: number,
    feeAsset: string
  ): OrderFill[] {
    const numFills = totalQuantity > 100 ?
      Math.min(5, Math.floor(totalQuantity / 50)) : 1;

    const fills: OrderFill[] = [];
    let remainingQty = totalQuantity;
    let remainingFee = totalFee;

    for (let i = 0; i < numFills; i++) {
      const isLastFill = i === numFills - 1;
      const fillQty = isLastFill ? remainingQty : totalQuantity / numFills;
      const fillFee = isLastFill ? remainingFee : totalFee / numFills;

      // Add small price variation for each fill
      const priceVariation = avgPrice * (Math.random() * 0.002 - 0.001); // ±0.1%
      const fillPrice = avgPrice + priceVariation;

      fills.push({
        price: fillPrice.toFixed(8),
        qty: fillQty.toFixed(8),
        commission: fillFee.toFixed(8),
        commissionAsset: feeAsset,
        tradeId: Date.now() + i
      });

      remainingQty -= fillQty;
      remainingFee -= fillFee;
    }

    return fills;
  }

  /**
   * Helper: Get base asset from symbol
   */
  private getBaseAsset(symbol: string): string {
    if (symbol.endsWith('USDT')) return symbol.replace('USDT', '');
    if (symbol.endsWith('BUSD')) return symbol.replace('BUSD', '');
    if (symbol.endsWith('BTC')) return symbol.replace('BTC', '');
    return symbol;
  }

  /**
   * Helper: Get quote asset from symbol
   */
  private getQuoteAsset(symbol: string): string {
    if (symbol.endsWith('USDT')) return 'USDT';
    if (symbol.endsWith('BUSD')) return 'BUSD';
    if (symbol.endsWith('BTC')) return 'BTC';
    return 'USDT';
  }

  /**
   * Helper: Generate random quantity
   */
  private generateRandomQuantity(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Get simulation statistics summary
   */
  getSimulationStats(orders: Order[]): {
    totalOrders: number;
    totalSlippage: number;
    totalFees: number;
    avgSlippagePercent: number;
    avgFeePercent: number;
  } {
    let totalSlippage = 0;
    let totalFees = 0;
    let totalValue = 0;

    orders.forEach(order => {
      const executedValue = parseFloat(order.executedQty) * parseFloat(order.price);
      totalValue += executedValue;

      if (order.commission) {
        totalFees += parseFloat(order.commission);
      }
    });

    return {
      totalOrders: orders.length,
      totalSlippage,
      totalFees,
      avgSlippagePercent: totalValue > 0 ? (totalSlippage / totalValue) * 100 : 0,
      avgFeePercent: totalValue > 0 ? (totalFees / totalValue) * 100 : 0
    };
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    const defaultConfig = this.getDefaultConfig();
    this.configSubject.next(defaultConfig);
    localStorage.setItem('paperTradingConfig', JSON.stringify(defaultConfig));
  }
}
