import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  WebhookConfig,
  WebhookPlatform,
  WebhookEvent,
  WebhookPayload,
  WebhookLog,
  DEFAULT_WEBHOOK_CONFIG
} from '../models/webhook-config.model';

@Injectable({
  providedIn: 'root'
})
export class WebhookService {
  private readonly STORAGE_KEY = 'webhook_configs';
  private readonly LOGS_STORAGE_KEY = 'webhook_logs';
  private readonly MAX_LOGS = 100;

  private webhooksSubject = new BehaviorSubject<WebhookConfig[]>([]);
  public webhooks$ = this.webhooksSubject.asObservable();

  private logsSubject = new BehaviorSubject<WebhookLog[]>([]);
  public logs$ = this.logsSubject.asObservable();

  constructor() {
    this.loadWebhooks();
    this.loadLogs();
  }

  private loadWebhooks(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const webhooks = JSON.parse(stored);
      this.webhooksSubject.next(webhooks);
    }
  }

  private loadLogs(): void {
    const stored = localStorage.getItem(this.LOGS_STORAGE_KEY);
    if (stored) {
      const logs = JSON.parse(stored);
      this.logsSubject.next(logs);
    }
  }

  private saveWebhooks(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.webhooksSubject.value));
  }

  private saveLogs(): void {
    const logs = this.logsSubject.value.slice(-this.MAX_LOGS);
    localStorage.setItem(this.LOGS_STORAGE_KEY, JSON.stringify(logs));
  }

  getWebhooks(): Observable<WebhookConfig[]> {
    return this.webhooks$;
  }

  getLogs(): Observable<WebhookLog[]> {
    return this.logs$;
  }

  addWebhook(webhook: Partial<WebhookConfig>): WebhookConfig {
    const newWebhook: WebhookConfig = {
      id: this.generateId(),
      name: webhook.name || 'New Webhook',
      enabled: webhook.enabled ?? true,
      url: webhook.url || '',
      platform: webhook.platform || WebhookPlatform.CUSTOM,
      events: webhook.events || DEFAULT_WEBHOOK_CONFIG.events!,
      customPayload: webhook.customPayload,
      headers: webhook.headers || {},
      retryAttempts: webhook.retryAttempts ?? DEFAULT_WEBHOOK_CONFIG.retryAttempts!,
      timeout: webhook.timeout ?? DEFAULT_WEBHOOK_CONFIG.timeout!
    };

    const webhooks = [...this.webhooksSubject.value, newWebhook];
    this.webhooksSubject.next(webhooks);
    this.saveWebhooks();

    return newWebhook;
  }

  updateWebhook(id: string, updates: Partial<WebhookConfig>): void {
    const webhooks = this.webhooksSubject.value.map(wh =>
      wh.id === id ? { ...wh, ...updates } : wh
    );
    this.webhooksSubject.next(webhooks);
    this.saveWebhooks();
  }

  deleteWebhook(id: string): void {
    const webhooks = this.webhooksSubject.value.filter(wh => wh.id !== id);
    this.webhooksSubject.next(webhooks);
    this.saveWebhooks();
  }

  async triggerWebhook(event: WebhookEvent, data: any): Promise<void> {
    const webhooks = this.webhooksSubject.value.filter(
      wh => wh.enabled && wh.events.includes(event)
    );

    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, event, data);
    }
  }

  private async sendWebhook(
    webhook: WebhookConfig,
    event: WebhookEvent,
    data: any,
    retryCount: number = 0
  ): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: Date.now(),
      data
    };

    const log: WebhookLog = {
      id: this.generateId(),
      webhookId: webhook.id,
      timestamp: new Date(),
      event,
      status: 'success',
      payload,
      retryCount
    };

    try {
      const body = this.formatPayload(webhook, payload);
      const headers = this.getHeaders(webhook);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      log.statusCode = response.status;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update webhook status
      this.updateWebhook(webhook.id, {
        lastTriggered: new Date(),
        lastStatus: 'success'
      });

      console.log(`✅ Webhook sent successfully to ${webhook.name}`, { event, data });

    } catch (error: any) {
      log.status = 'failed';
      log.error = error.message;

      console.error(`❌ Webhook failed for ${webhook.name}:`, error);

      // Retry logic
      if (retryCount < webhook.retryAttempts) {
        console.log(`🔄 Retrying webhook ${webhook.name} (attempt ${retryCount + 1}/${webhook.retryAttempts})`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.sendWebhook(webhook, event, data, retryCount + 1);
      }

      // Update webhook status
      this.updateWebhook(webhook.id, {
        lastTriggered: new Date(),
        lastStatus: 'failed',
        lastError: error.message
      });
    } finally {
      // Save log
      const logs = [...this.logsSubject.value, log];
      this.logsSubject.next(logs);
      this.saveLogs();
    }
  }

  private formatPayload(webhook: WebhookConfig, payload: WebhookPayload): any {
    if (webhook.customPayload) {
      try {
        // Allow custom payload with template variables
        const customData = JSON.parse(webhook.customPayload);
        return this.replaceVariables(customData, payload);
      } catch (error) {
        console.error('Invalid custom payload JSON, using default', error);
      }
    }

    // Platform-specific formatting
    switch (webhook.platform) {
      case WebhookPlatform.DISCORD:
        return this.formatDiscordPayload(payload);
      case WebhookPlatform.SLACK:
        return this.formatSlackPayload(payload);
      case WebhookPlatform.TELEGRAM:
        return this.formatTelegramPayload(payload);
      default:
        return payload;
    }
  }

  private formatDiscordPayload(payload: WebhookPayload): any {
    const color = this.getEventColor(payload.event);
    const title = this.getEventTitle(payload.event);

    return {
      embeds: [{
        title: `🔔 ${title}`,
        description: this.formatEventData(payload.data),
        color,
        timestamp: new Date(payload.timestamp).toISOString(),
        footer: {
          text: 'AlgoTrader Pro'
        }
      }]
    };
  }

  private formatSlackPayload(payload: WebhookPayload): any {
    const color = this.getEventColorHex(payload.event);
    const title = this.getEventTitle(payload.event);

    return {
      attachments: [{
        color,
        title: `🔔 ${title}`,
        text: this.formatEventData(payload.data),
        ts: Math.floor(payload.timestamp / 1000),
        footer: 'AlgoTrader Pro'
      }]
    };
  }

  private formatTelegramPayload(payload: WebhookPayload): any {
    const title = this.getEventTitle(payload.event);
    const data = this.formatEventData(payload.data);

    return {
      text: `🔔 *${title}*\n\n${data}`,
      parse_mode: 'Markdown'
    };
  }

  private getEventTitle(event: WebhookEvent): string {
    const titles: { [key in WebhookEvent]: string } = {
      [WebhookEvent.ALERT_TRIGGERED]: 'Alert Triggered',
      [WebhookEvent.ORDER_FILLED]: 'Order Filled',
      [WebhookEvent.POSITION_OPENED]: 'Position Opened',
      [WebhookEvent.POSITION_CLOSED]: 'Position Closed',
      [WebhookEvent.STOP_LOSS_HIT]: 'Stop Loss Hit',
      [WebhookEvent.TAKE_PROFIT_HIT]: 'Take Profit Hit',
      [WebhookEvent.RISK_WARNING]: 'Risk Warning',
      [WebhookEvent.VOLATILITY_ALERT]: 'Volatility Alert'
    };
    return titles[event];
  }

  private getEventColor(event: WebhookEvent): number {
    const colors: { [key in WebhookEvent]: number } = {
      [WebhookEvent.ALERT_TRIGGERED]: 0x3498db, // Blue
      [WebhookEvent.ORDER_FILLED]: 0x2ecc71,    // Green
      [WebhookEvent.POSITION_OPENED]: 0x3498db, // Blue
      [WebhookEvent.POSITION_CLOSED]: 0x9b59b6, // Purple
      [WebhookEvent.STOP_LOSS_HIT]: 0xe74c3c,   // Red
      [WebhookEvent.TAKE_PROFIT_HIT]: 0x2ecc71, // Green
      [WebhookEvent.RISK_WARNING]: 0xe67e22,    // Orange
      [WebhookEvent.VOLATILITY_ALERT]: 0xf39c12 // Yellow
    };
    return colors[event];
  }

  private getEventColorHex(event: WebhookEvent): string {
    const color = this.getEventColor(event);
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private formatEventData(data: any): string {
    if (typeof data === 'string') return data;

    const lines: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
      const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
      lines.push(`**${capitalizedKey}:** ${value}`);
    }
    return lines.join('\n');
  }

  private getHeaders(webhook: WebhookConfig): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...webhook.headers
    };
    return headers;
  }

  private replaceVariables(obj: any, payload: WebhookPayload): any {
    const str = JSON.stringify(obj);
    const replaced = str
      .replace(/\{\{event\}\}/g, payload.event)
      .replace(/\{\{timestamp\}\}/g, payload.timestamp.toString())
      .replace(/\{\{data\}\}/g, JSON.stringify(payload.data));
    return JSON.parse(replaced);
  }

  async testWebhook(webhookId: string): Promise<boolean> {
    const webhook = this.webhooksSubject.value.find(wh => wh.id === webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload: WebhookPayload = {
      event: WebhookEvent.ALERT_TRIGGERED,
      timestamp: Date.now(),
      data: {
        message: 'This is a test webhook from AlgoTrader Pro',
        symbol: 'BTCUSDT',
        price: 50000
      }
    };

    try {
      await this.sendWebhook(webhook, WebhookEvent.ALERT_TRIGGERED, testPayload.data);
      return true;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  }

  clearLogs(): void {
    this.logsSubject.next([]);
    localStorage.removeItem(this.LOGS_STORAGE_KEY);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
