import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { EmailConfig, EmailQueueItem, DEFAULT_EMAIL_CONFIG } from '../models/email-config.model';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private configSubject = new BehaviorSubject<EmailConfig>(DEFAULT_EMAIL_CONFIG);
  public config$ = this.configSubject.asObservable();

  private emailQueue: EmailQueueItem[] = [];
  private emailHistory: EmailQueueItem[] = [];
  private lastEmailTime: Date | null = null;
  private emailCountLastHour = 0;
  private emailCountToday = 0;
  private lastHourReset = new Date();
  private lastDayReset = new Date();

  constructor() {
    this.loadConfig();
    this.startCleanupInterval();
  }

  // Configuration management
  loadConfig(): void {
    const saved = localStorage.getItem('emailConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        this.configSubject.next(config);
      } catch (e) {
        console.error('Failed to load email config:', e);
      }
    }
  }

  saveConfig(config: EmailConfig): void {
    localStorage.setItem('emailConfig', JSON.stringify(config));
    this.configSubject.next(config);
  }

  getConfig(): EmailConfig {
    return this.configSubject.value;
  }

  // Email sending
  async sendEmail(subject: string, body: string, html?: string): Promise<boolean> {
    const config = this.getConfig();

    if (!config.enabled) {
      console.log('Email notifications are disabled');
      return false;
    }

    if (!this.canSendEmail()) {
      console.log('Email rate limit reached');
      return false;
    }

    const emailItem: EmailQueueItem = {
      id: this.generateId(),
      to: config.toEmail,
      subject,
      body,
      html: html || (config.useHtml ? this.convertToHtml(body) : undefined),
      timestamp: new Date(),
      sent: false
    };

    this.emailQueue.push(emailItem);

    try {
      await this.sendViaBackend(emailItem);
      emailItem.sent = true;
      this.emailHistory.push(emailItem);
      this.updateRateLimits();
      return true;
    } catch (error) {
      emailItem.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Rate limiting
  private canSendEmail(): boolean {
    const config = this.getConfig();
    const now = new Date();

    // Reset hourly counter
    if (now.getTime() - this.lastHourReset.getTime() > 3600000) {
      this.emailCountLastHour = 0;
      this.lastHourReset = now;
    }

    // Reset daily counter
    if (now.getTime() - this.lastDayReset.getTime() > 86400000) {
      this.emailCountToday = 0;
      this.lastDayReset = now;
    }

    // Check minimum interval
    if (this.lastEmailTime) {
      const minutesSinceLastEmail = (now.getTime() - this.lastEmailTime.getTime()) / 60000;
      if (minutesSinceLastEmail < config.minInterval) {
        return false;
      }
    }

    // Check hourly limit
    if (this.emailCountLastHour >= config.maxEmailsPerHour) {
      return false;
    }

    // Check daily limit
    if (this.emailCountToday >= config.maxEmailsPerDay) {
      return false;
    }

    return true;
  }

  private updateRateLimits(): void {
    this.lastEmailTime = new Date();
    this.emailCountLastHour++;
    this.emailCountToday++;
  }

  // Backend communication
  private async sendViaBackend(email: EmailQueueItem): Promise<void> {
    const config = this.getConfig();

    // In a real implementation, this would call a backend API
    // For now, we'll simulate the SMTP sending
    const emailData = {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPassword: config.smtpPassword,
      from: `${config.fromName} <${config.fromEmail}>`,
      to: email.to,
      subject: email.subject,
      text: email.body,
      html: email.html
    };

    // TODO: Replace this with actual backend API call
    // Example: await this.http.post('/api/email/send', emailData).toPromise();

    // Simulated backend call
    return new Promise((resolve, reject) => {
      console.log('Sending email via SMTP:', emailData);

      // Validate configuration
      if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
        reject(new Error('Invalid SMTP configuration'));
        return;
      }

      // Simulate network delay
      setTimeout(() => {
        // In production, this would be handled by the backend
        resolve();
      }, 1000);
    });
  }

  // Email testing
  async testEmailConfig(): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig();

    if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.toEmail) {
      return {
        success: false,
        message: 'Please fill in all required fields'
      };
    }

    try {
      await this.sendEmail(
        'AlgoTrader Pro - Test Email',
        'This is a test email from AlgoTrader Pro. If you received this, your email configuration is working correctly!'
      );

      return {
        success: true,
        message: 'Test email sent successfully! Check your inbox.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Alert-specific email methods
  async sendAlertEmail(alertType: string, alertMessage: string, details?: any): Promise<boolean> {
    const config = this.getConfig();

    // Check if this alert type is enabled
    const alertTypeMap: { [key: string]: keyof typeof config.alertTypes } = {
      'price': 'priceAlerts',
      'indicator': 'indicatorAlerts',
      'volatility': 'volatilityAlerts',
      'order_filled': 'orderFilled',
      'position_closed': 'positionClosed',
      'risk_warning': 'riskWarnings'
    };

    const configKey = alertTypeMap[alertType];
    if (configKey && !config.alertTypes[configKey]) {
      return false;
    }

    const subject = `AlgoTrader Alert: ${alertType.toUpperCase()}`;
    const body = this.formatAlertEmail(alertType, alertMessage, details);

    return await this.sendEmail(subject, body);
  }

  private formatAlertEmail(alertType: string, message: string, details?: any): string {
    const config = this.getConfig();
    const timestamp = new Date().toLocaleString();

    let body = `AlgoTrader Pro Alert\n\n`;
    body += `Alert Type: ${alertType}\n`;
    body += `Time: ${timestamp}\n`;
    body += `\n${message}\n`;

    if (details) {
      body += `\nDetails:\n`;
      Object.entries(details).forEach(([key, value]) => {
        body += `  ${key}: ${value}\n`;
      });
    }

    if (config.includeChartLink) {
      body += `\nView charts: ${window.location.origin}\n`;
    }

    body += `\n---\nAlgoTrader Pro - Automated Trading Platform`;

    return body;
  }

  // Utility methods
  private convertToHtml(text: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f5f5f5; }
          .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>AlgoTrader Pro</h2>
          </div>
          <div class="content">
            ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
          <div class="footer">
            <p>AlgoTrader Pro - Automated Trading Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Cleanup
  private startCleanupInterval(): void {
    setInterval(() => {
      const oneDayAgo = new Date().getTime() - 86400000;
      this.emailHistory = this.emailHistory.filter(
        email => email.timestamp.getTime() > oneDayAgo
      );
    }, 3600000); // Clean up every hour
  }

  // Statistics
  getEmailStats(): {
    lastHour: number;
    today: number;
    lastEmailTime: Date | null;
    queueSize: number;
    historySize: number;
  } {
    return {
      lastHour: this.emailCountLastHour,
      today: this.emailCountToday,
      lastEmailTime: this.lastEmailTime,
      queueSize: this.emailQueue.length,
      historySize: this.emailHistory.length
    };
  }

  getEmailHistory(): EmailQueueItem[] {
    return [...this.emailHistory].reverse();
  }
}
