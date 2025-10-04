import { Injectable } from '@angular/core';
import { EmailTemplate } from '../models/email-config.model';

@Injectable({
  providedIn: 'root'
})
export class EmailTemplateService {

  constructor() {}

  // Price Alert Templates
  getPriceAlertTemplate(symbol: string, price: number, condition: string, targetPrice: number): EmailTemplate {
    const subject = `Price Alert: ${symbol} ${condition} $${targetPrice}`;

    const body = `
Price Alert Triggered!

Symbol: ${symbol}
Current Price: $${price.toFixed(2)}
Condition: ${condition}
Target Price: $${targetPrice.toFixed(2)}
Time: ${new Date().toLocaleString()}

This alert was triggered because ${symbol} has ${condition.toLowerCase()} your target price of $${targetPrice}.
    `.trim();

    const html = this.createHtmlTemplate(
      'Price Alert',
      `<h2>Price Alert Triggered!</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Symbol</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${symbol}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Current Price</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">$${price.toFixed(2)}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Condition</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${condition}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Target Price</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">$${targetPrice.toFixed(2)}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
      <p>This alert was triggered because <strong>${symbol}</strong> has ${condition.toLowerCase()} your target price of <strong>$${targetPrice}</strong>.</p>`
    );

    return { subject, body, html };
  }

  // Indicator Alert Templates
  getIndicatorAlertTemplate(symbol: string, indicator: string, condition: string, value: number): EmailTemplate {
    const subject = `Indicator Alert: ${symbol} - ${indicator} ${condition}`;

    const body = `
Indicator Alert Triggered!

Symbol: ${symbol}
Indicator: ${indicator}
Condition: ${condition}
Value: ${value.toFixed(2)}
Time: ${new Date().toLocaleString()}

The ${indicator} indicator has triggered your alert condition: ${condition}.
    `.trim();

    const html = this.createHtmlTemplate(
      'Indicator Alert',
      `<h2>Indicator Alert Triggered!</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Symbol</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${symbol}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Indicator</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${indicator}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Condition</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${condition}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Value</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${value.toFixed(2)}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
      <p>The <strong>${indicator}</strong> indicator has triggered your alert condition: <strong>${condition}</strong>.</p>`
    );

    return { subject, body, html };
  }

  // Order Filled Template
  getOrderFilledTemplate(order: any): EmailTemplate {
    const subject = `Order Filled: ${order.side} ${order.quantity} ${order.symbol}`;

    const body = `
Order Filled!

Symbol: ${order.symbol}
Side: ${order.side}
Quantity: ${order.quantity}
Price: $${order.price.toFixed(2)}
Total: $${(order.quantity * order.price).toFixed(2)}
Order ID: ${order.id}
Time: ${new Date().toLocaleString()}

Your ${order.side.toLowerCase()} order has been successfully filled.
    `.trim();

    const html = this.createHtmlTemplate(
      'Order Filled',
      `<h2>Order Filled Successfully!</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Symbol</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${order.symbol}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Side</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${order.side}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Quantity</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${order.quantity}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Price</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">$${order.price.toFixed(2)}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">$${(order.quantity * order.price).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Order ID</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${order.id}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
      <p>Your <strong>${order.side.toLowerCase()}</strong> order has been successfully filled.</p>`,
      order.side === 'BUY' ? '#4CAF50' : '#f44336'
    );

    return { subject, body, html };
  }

  // Position Closed Template
  getPositionClosedTemplate(position: any): EmailTemplate {
    const pnl = position.closePrice - position.entryPrice;
    const pnlPercent = (pnl / position.entryPrice) * 100;
    const isProfitable = pnl >= 0;

    const subject = `Position Closed: ${position.symbol} - ${isProfitable ? 'PROFIT' : 'LOSS'} $${Math.abs(pnl * position.quantity).toFixed(2)}`;

    const body = `
Position Closed!

Symbol: ${position.symbol}
Quantity: ${position.quantity}
Entry Price: $${position.entryPrice.toFixed(2)}
Close Price: $${position.closePrice.toFixed(2)}
P&L: $${(pnl * position.quantity).toFixed(2)} (${pnlPercent.toFixed(2)}%)
Duration: ${this.calculateDuration(position.entryTime, position.closeTime)}
Time: ${new Date().toLocaleString()}

Your position has been closed with a ${isProfitable ? 'profit' : 'loss'}.
    `.trim();

    const html = this.createHtmlTemplate(
      'Position Closed',
      `<h2>Position Closed</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Symbol</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${position.symbol}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Quantity</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${position.quantity}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Entry Price</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">$${position.entryPrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Close Price</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">$${position.closePrice.toFixed(2)}</td>
        </tr>
        <tr style="background-color: ${isProfitable ? '#e8f5e9' : '#ffebee'};">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>P&L</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd; color: ${isProfitable ? '#4CAF50' : '#f44336'}; font-weight: bold;">
            $${(pnl * position.quantity).toFixed(2)} (${pnlPercent.toFixed(2)}%)
          </td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Duration</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${this.calculateDuration(position.entryTime, position.closeTime)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
      <p>Your position has been closed with a <strong style="color: ${isProfitable ? '#4CAF50' : '#f44336'};">${isProfitable ? 'profit' : 'loss'}</strong>.</p>`,
      isProfitable ? '#4CAF50' : '#f44336'
    );

    return { subject, body, html };
  }

  // Risk Warning Template
  getRiskWarningTemplate(warningType: string, message: string, details: any): EmailTemplate {
    const subject = `⚠️ Risk Warning: ${warningType}`;

    const body = `
⚠️ RISK WARNING ⚠️

Warning Type: ${warningType}
Message: ${message}
Time: ${new Date().toLocaleString()}

Details:
${Object.entries(details).map(([key, value]) => `  ${key}: ${value}`).join('\n')}

Please review your positions and risk settings immediately.
    `.trim();

    const html = this.createHtmlTemplate(
      '⚠️ Risk Warning',
      `<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <h2 style="color: #856404; margin-top: 0;">⚠️ Risk Warning</h2>
        <p style="color: #856404; font-size: 16px;"><strong>${warningType}</strong></p>
      </div>
      <p><strong>Message:</strong> ${message}</p>
      <h3>Details:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        ${Object.entries(details).map(([key, value], index) => `
          <tr style="${index % 2 === 0 ? 'background-color: #f0f0f0;' : ''}">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${key}</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${value}</td>
          </tr>
        `).join('')}
      </table>
      <p style="background-color: #f44336; color: white; padding: 10px; border-radius: 4px;">
        <strong>⚠️ Please review your positions and risk settings immediately.</strong>
      </p>`,
      '#ffc107'
    );

    return { subject, body, html };
  }

  // Volatility Alert Template
  getVolatilityAlertTemplate(symbol: string, currentVolatility: number, threshold: number): EmailTemplate {
    const subject = `Volatility Alert: ${symbol} - High Volatility Detected`;

    const body = `
Volatility Alert!

Symbol: ${symbol}
Current Volatility (ATR): ${currentVolatility.toFixed(2)}
Threshold: ${threshold.toFixed(2)}
Volatility Ratio: ${(currentVolatility / threshold).toFixed(2)}x
Time: ${new Date().toLocaleString()}

High volatility detected! Consider adjusting your position sizes and stop-loss levels.
    `.trim();

    const html = this.createHtmlTemplate(
      'Volatility Alert',
      `<h2>High Volatility Detected!</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Symbol</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${symbol}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Current Volatility (ATR)</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${currentVolatility.toFixed(2)}</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Threshold</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${threshold.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Volatility Ratio</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd; color: #ff9800; font-weight: bold;">${(currentVolatility / threshold).toFixed(2)}x</td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
      <p style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; color: #856404;">
        <strong>⚠️ High volatility detected!</strong> Consider adjusting your position sizes and stop-loss levels.
      </p>`,
      '#ff9800'
    );

    return { subject, body, html };
  }

  // HTML Template Wrapper
  private createHtmlTemplate(title: string, content: string, color: string = '#2196F3'): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <div style="background-color: ${color}; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">AlgoTrader Pro</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${title}</p>
          </div>
          <div style="padding: 30px;">
            ${content}
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <a href="${window.location.origin}" style="color: ${color}; text-decoration: none;">View Dashboard</a>
              </p>
            </div>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">AlgoTrader Pro - Automated Trading Platform</p>
            <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} All rights reserved</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Utility Methods
  private calculateDuration(startTime: Date, endTime: Date): string {
    const diff = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}
