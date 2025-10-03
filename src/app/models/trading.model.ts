export interface AccountBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface Position {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
}

export interface Order {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: OrderStatus;
  type: OrderType;
  side: OrderSide;
  time: number;
  updateTime: number;
  timeInForce?: TimeInForce;
  stopPrice?: string;
  icebergQty?: string;
  fills?: OrderFill[];
  commission?: string;
  commissionAsset?: string;
}

export enum OrderStatus {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  PENDING_CANCEL = 'PENDING_CANCEL',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  STOP_LOSS_LIMIT = 'STOP_LOSS_LIMIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT',
  LIMIT_MAKER = 'LIMIT_MAKER'
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancel
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK'  // Fill or Kill
}

export interface OrderFill {
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  tradeId: number;
}

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  closePosition?: boolean;
  positionSide?: 'BOTH' | 'LONG' | 'SHORT';
}

export interface OrderValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OrderConfirmation {
  order: CreateOrderRequest;
  estimatedFees: string;
  estimatedTotal: string;
  marketImpact?: number;
  confirmation: boolean;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  symbol: string;
  timeframe: string;
  isActive: boolean;
  pineScript?: string;
  parameters: {
    useSMA?: boolean;
    useRSI?: boolean;
    useSMA200?: boolean; // Add this line
    [key: string]: any; // Allow other parameters
  };
  createdAt: Date;
  lastExecuted?: Date;
  signals?: StrategySignal[]; // Add this line
}

export interface StrategySignal {
  strategyId: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  price: number;
  quantity: number;
  timestamp: Date;
  reason?: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AccountStats {
  totalBalance: number;
  availableBalance: number;
  unrealizedPnL: number;
  marginUsed: number;
  positionCount: number;
  openOrdersCount: number;
}
