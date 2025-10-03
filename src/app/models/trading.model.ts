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
  status: string;
  type: string;
  side: string;
  time: number;
  updateTime: number;
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
