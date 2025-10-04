export interface WebhookConfig {
  id: string;
  name: string;
  enabled: boolean;
  url: string;
  platform: WebhookPlatform;
  events: WebhookEvent[];
  customPayload?: string;
  headers?: { [key: string]: string };
  retryAttempts: number;
  timeout: number;
  lastTriggered?: Date;
  lastStatus?: 'success' | 'failed';
  lastError?: string;
}

export enum WebhookPlatform {
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  SLACK = 'slack',
  CUSTOM = 'custom'
}

export enum WebhookEvent {
  ALERT_TRIGGERED = 'alert_triggered',
  ORDER_FILLED = 'order_filled',
  POSITION_OPENED = 'position_opened',
  POSITION_CLOSED = 'position_closed',
  STOP_LOSS_HIT = 'stop_loss_hit',
  TAKE_PROFIT_HIT = 'take_profit_hit',
  RISK_WARNING = 'risk_warning',
  VOLATILITY_ALERT = 'volatility_alert'
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  data: any;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  timestamp: Date;
  event: WebhookEvent;
  status: 'success' | 'failed';
  statusCode?: number;
  error?: string;
  payload: WebhookPayload;
  retryCount: number;
}

export const DEFAULT_WEBHOOK_CONFIG: Partial<WebhookConfig> = {
  enabled: true,
  events: [
    WebhookEvent.ALERT_TRIGGERED,
    WebhookEvent.ORDER_FILLED,
    WebhookEvent.POSITION_CLOSED
  ],
  retryAttempts: 3,
  timeout: 5000
};
