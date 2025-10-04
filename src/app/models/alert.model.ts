/**
 * Alert System Models
 * Comprehensive alert and notification types for the trading platform
 */

/**
 * Alert Types
 */
export enum AlertType {
  // Price alerts
  PRICE_THRESHOLD = 'PRICE_THRESHOLD',           // Price crosses threshold
  PRICE_ABOVE = 'PRICE_ABOVE',                   // Price goes above value
  PRICE_BELOW = 'PRICE_BELOW',                   // Price goes below value
  PRICE_CHANGE_PERCENT = 'PRICE_CHANGE_PERCENT', // Price changes by %

  // Indicator alerts
  RSI_OVERBOUGHT = 'RSI_OVERBOUGHT',             // RSI > threshold
  RSI_OVERSOLD = 'RSI_OVERSOLD',                 // RSI < threshold
  MACD_CROSSOVER = 'MACD_CROSSOVER',             // MACD crosses signal line
  SMA_CROSSOVER = 'SMA_CROSSOVER',               // Price crosses SMA
  BB_BREAKOUT = 'BB_BREAKOUT',                   // Price breaks Bollinger Band

  // Volume alerts
  VOLUME_SPIKE = 'VOLUME_SPIKE',                 // Volume exceeds threshold
  VOLUME_DROP = 'VOLUME_DROP',                   // Volume drops below threshold

  // Position alerts
  POSITION_PROFIT = 'POSITION_PROFIT',           // Position reaches profit target
  POSITION_LOSS = 'POSITION_LOSS',               // Position reaches loss limit
  TRAILING_STOP_TRIGGERED = 'TRAILING_STOP_TRIGGERED', // Trailing stop activated

  // Risk alerts
  DAILY_LOSS_LIMIT = 'DAILY_LOSS_LIMIT',         // Daily loss exceeds limit
  DRAWDOWN_LIMIT = 'DRAWDOWN_LIMIT',             // Drawdown exceeds limit
  MARGIN_WARNING = 'MARGIN_WARNING',             // Margin utilization high

  // Custom alerts
  CUSTOM = 'CUSTOM'                              // User-defined condition
}

/**
 * Alert Status
 */
export enum AlertStatus {
  ACTIVE = 'ACTIVE',       // Alert is active and monitoring
  TRIGGERED = 'TRIGGERED', // Alert condition was met
  DISABLED = 'DISABLED',   // Alert is disabled by user
  EXPIRED = 'EXPIRED'      // Alert reached expiration date
}

/**
 * Alert Priority
 */
export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Notification Channel
 */
export enum NotificationChannel {
  BROWSER = 'BROWSER',         // Browser notification
  EMAIL = 'EMAIL',             // Email notification
  TELEGRAM = 'TELEGRAM',       // Telegram message
  DISCORD = 'DISCORD',         // Discord webhook
  SLACK = 'SLACK',             // Slack webhook
  WEBHOOK = 'WEBHOOK',         // Custom webhook
  IN_APP = 'IN_APP'           // In-app notification only
}

/**
 * Alert Condition
 */
export interface AlertCondition {
  type: AlertType;
  symbol: string;

  // For price alerts
  targetPrice?: number;
  comparisonOperator?: 'ABOVE' | 'BELOW' | 'CROSS_ABOVE' | 'CROSS_BELOW' | 'EQUALS';
  changePercent?: number;

  // For indicator alerts
  indicatorName?: string;
  indicatorValue?: number;
  threshold?: number;

  // For volume alerts
  volumeThreshold?: number;
  volumeMultiplier?: number; // e.g., 2x average volume

  // For position alerts
  profitTarget?: number;
  lossLimit?: number;
  profitPercent?: number;
  lossPercent?: number;

  // For custom conditions
  customCondition?: string; // JavaScript expression
}

/**
 * Alert Configuration
 */
export interface Alert {
  id: string;
  name: string;
  description?: string;

  // Alert condition
  condition: AlertCondition;

  // Alert settings
  status: AlertStatus;
  priority: AlertPriority;
  channels: NotificationChannel[];

  // Triggering options
  triggerOnce: boolean;           // Trigger only once or repeatedly
  cooldownMinutes?: number;       // Minutes between re-triggers
  expirationDate?: Date;          // Auto-disable after this date

  // Metadata
  createdAt: Date;
  lastTriggeredAt?: Date;
  triggerCount: number;

  // User preferences
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  customMessage?: string;
}

/**
 * Alert History Entry
 */
export interface AlertHistoryEntry {
  id: string;
  alertId: string;
  alertName: string;

  condition: AlertCondition;
  priority: AlertPriority;

  triggeredAt: Date;
  triggeredValue?: number;        // The value that triggered the alert
  message: string;

  // Notification status
  notificationsSent: {
    channel: NotificationChannel;
    success: boolean;
    error?: string;
  }[];

  // User interaction
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

/**
 * Alert Evaluation Result
 */
export interface AlertEvaluationResult {
  alertId: string;
  triggered: boolean;
  currentValue: number;
  thresholdValue?: number;
  message?: string;
  timestamp: Date;
}

/**
 * Alert Statistics
 */
export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  triggeredToday: number;
  triggeredThisWeek: number;
  triggeredThisMonth: number;

  byType: Record<AlertType, number>;
  byPriority: Record<AlertPriority, number>;
  byChannel: Record<NotificationChannel, number>;

  mostTriggeredAlerts: {
    alert: Alert;
    triggerCount: number;
  }[];
}

/**
 * Notification Settings
 */
export interface NotificationSettings {
  // Browser notifications
  browserEnabled: boolean;
  browserPermissionGranted: boolean;

  // Email notifications
  emailEnabled: boolean;
  emailAddress?: string;
  emailQuietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };

  // Telegram notifications
  telegramEnabled: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;

  // Discord notifications
  discordEnabled: boolean;
  discordWebhookUrl?: string;

  // Slack notifications
  slackEnabled: boolean;
  slackWebhookUrl?: string;

  // Custom webhook
  webhookEnabled: boolean;
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;

  // Global settings
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  doNotDisturbEnabled: boolean;
  doNotDisturbSchedule?: {
    start: string;
    end: string;
  };
}

/**
 * Alert Template (for quick alert creation)
 */
export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  category: 'PRICE' | 'INDICATOR' | 'VOLUME' | 'POSITION' | 'RISK';

  // Default condition
  defaultCondition: Partial<AlertCondition>;

  // Default settings
  defaultPriority: AlertPriority;
  defaultChannels: NotificationChannel[];

  // Usage
  usageCount: number;
}
