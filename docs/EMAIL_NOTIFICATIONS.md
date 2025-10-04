# Email Notifications System

## Overview

The AlgoTrader Pro email notification system allows users to receive alert notifications via email using their own SMTP/IMAP email accounts. This provides a reliable and customizable way to stay informed about trading alerts even when not actively using the platform.

## Features

### ✅ Custom SMTP/IMAP Configuration
- Support for any email provider (Gmail, Outlook, Yahoo, etc.)
- Easy-to-use preset configurations for popular providers
- Secure password storage with encryption
- TLS/SSL support

### ✅ Email Templates
- **Price Alerts** - Beautifully formatted emails for price-based alerts
- **Indicator Alerts** - Detailed emails for technical indicator signals
- **Volatility Alerts** - High/low volatility notifications
- **Order Filled** - Confirmation emails when orders are executed
- **Position Closed** - P&L summaries when positions close
- **Risk Warnings** - Critical alerts for risk management events

### ✅ Rate Limiting & Frequency Controls
- **Minimum Interval** - Set minimum time between emails (default: 5 minutes)
- **Hourly Limit** - Maximum emails per hour (default: 10)
- **Daily Limit** - Maximum emails per day (default: 50)
- Prevents email spam and respects provider limits

### ✅ Selective Alert Types
Choose which alert types trigger email notifications:
- Price Alerts
- Indicator Alerts
- Volatility Alerts
- Order Filled Notifications
- Position Closed Notifications
- Risk Warnings

### ✅ HTML Email Support
- Professional HTML templates with branding
- Fallback to plain text for compatibility
- Includes chart links and logo (optional)
- Mobile-responsive design

### ✅ Email History & Statistics
- View recent emails sent
- Track email count (hourly/daily)
- Monitor delivery status
- Debug failed emails

## Setup Instructions

### 1. Access Email Configuration
Navigate to Settings → Email Notifications in the AlgoTrader Pro dashboard.

### 2. Choose Email Provider
Select from preset configurations or use custom SMTP settings:
- Gmail
- Outlook/Office 365
- Yahoo
- iCloud
- Zoho
- SendGrid
- Mailgun
- Custom

### 3. Configure SMTP Settings

**Gmail Example:**
- SMTP Host: `smtp.gmail.com`
- SMTP Port: `587`
- Use TLS/SSL: `No` (STARTTLS)
- Username: `your-email@gmail.com`
- Password: `your-app-password` (not your regular password!)

> **Important:** Gmail requires an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

**Outlook Example:**
- SMTP Host: `smtp.office365.com`
- SMTP Port: `587`
- Use TLS/SSL: `No` (STARTTLS)
- Username: `your-email@outlook.com`
- Password: `your-password`

### 4. Configure Email Settings
- **From Email** - The email address that sends alerts
- **From Name** - Display name (e.g., "AlgoTrader Pro")
- **Recipient Email** - Where to send alerts

### 5. Set Frequency Controls
- **Minimum Interval** - Time between emails (minutes)
- **Max Per Hour** - Maximum emails in 1 hour
- **Max Per Day** - Maximum emails in 24 hours

### 6. Select Alert Types
Enable email notifications for specific alert types:
- ✅ Price Alerts
- ✅ Indicator Alerts
- ✅ Volatility Alerts
- ✅ Order Filled
- ✅ Position Closed
- ✅ Risk Warnings

### 7. Test Configuration
Click "Send Test Email" to verify your settings work correctly.

### 8. Enable Email Notifications
Toggle the "Enable Email Notifications" switch at the top.

## Backend Setup (Required)

The email system requires a backend API to send emails securely. See `backend-email-api-example.md` for implementation details.

### Quick Start with Node.js

```bash
# Install dependencies
npm install express nodemailer express-rate-limit

# Run the email API server
node email-api-server.js
```

### Environment Variables

```bash
EMAIL_API_PORT=3001
ALLOWED_ORIGINS=http://localhost:4200
MAX_EMAILS_PER_HOUR=50
```

## Email Templates

### Price Alert Example
```
Subject: Price Alert: BTCUSDT Price Above $65000

AlgoTrader Pro Alert

Symbol: BTCUSDT
Current Price: $65,234.50
Condition: Price Above
Target Price: $65,000.00
Time: 2025-10-04 10:30:45

This alert was triggered because BTCUSDT has price above your target price of $65,000.

View Dashboard: https://yourdomain.com

---
AlgoTrader Pro - Automated Trading Platform
```

### Indicator Alert Example
```
Subject: Indicator Alert: BTCUSDT - RSI RSI Crossed Above

Indicator Alert Triggered!

Symbol: BTCUSDT
Indicator: RSI
Condition: RSI Crossed Above
Value: 70.00
Time: 2025-10-04 10:30:45

The RSI indicator has triggered your alert condition: RSI Crossed Above.
```

## Security Best Practices

### Password Security
- ✅ Passwords are stored encrypted in localStorage
- ✅ Use app-specific passwords when available
- ✅ Never share your email password
- ✅ Backend API should encrypt passwords in transit

### Rate Limiting
- ✅ Built-in client-side rate limiting
- ✅ Backend should implement additional rate limits
- ✅ Monitor for unusual sending patterns

### Data Privacy
- ✅ Email credentials stored locally only
- ✅ Configure CORS properly on backend
- ✅ Use HTTPS for all API communication

## Troubleshooting

### Gmail "Less Secure Apps" Error
**Solution:** Use an App Password instead of your regular password:
1. Enable 2-Step Verification on your Google Account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Use this password in AlgoTrader Pro

### Outlook Authentication Failed
**Solution:**
1. Ensure you're using the correct SMTP server: `smtp.office365.com`
2. Port should be `587` with TLS enabled
3. Check if 2FA is enabled - you may need an app password

### Emails Not Sending
**Checklist:**
- ✅ Email notifications are enabled
- ✅ Backend API is running
- ✅ SMTP credentials are correct
- ✅ Rate limits not exceeded
- ✅ Check browser console for errors
- ✅ Verify backend API logs

### Test Email Not Received
1. Check spam/junk folder
2. Verify recipient email address
3. Check email history in settings
4. Review backend API logs
5. Try with a different provider

## API Integration

### Send Custom Email

```typescript
import { EmailService } from './services/email.service';

constructor(private emailService: EmailService) {}

async sendCustomAlert() {
  await this.emailService.sendEmail(
    'Custom Alert Subject',
    'Plain text body',
    '<html><body><h1>HTML Body</h1></body></html>'
  );
}
```

### Get Email Statistics

```typescript
const stats = this.emailService.getEmailStats();
console.log('Emails sent last hour:', stats.lastHour);
console.log('Emails sent today:', stats.today);
```

### Access Email Configuration

```typescript
const config = this.emailService.getConfig();
console.log('Email enabled:', config.enabled);
```

## Future Enhancements

- [ ] OAuth2 support for Gmail/Outlook
- [ ] Multiple recipient support
- [ ] Email digest mode (batch alerts)
- [ ] Custom email templates
- [ ] Email scheduling
- [ ] Attachment support (charts, reports)
- [ ] Email analytics dashboard

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend API logs
3. Enable debug logging in browser console
4. Check email provider documentation

## Related Documentation

- [Alert System Core](./ALERTS.md)
- [Backend Email API](../backend-email-api-example.md)
- [Email Templates](../src/app/services/email-template.service.ts)
- [Email Configuration](../src/app/models/email-config.model.ts)
