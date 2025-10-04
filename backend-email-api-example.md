# Backend Email API Implementation Guide

This document describes how to implement the backend email API for the AlgoTrader Pro email notification system.

## Overview

The frontend email service sends requests to a backend API to actually send emails via SMTP. This separation ensures:
- Email credentials are never exposed to the client
- Proper security and rate limiting
- Reliable email delivery

## Required Backend Endpoint

### POST `/api/email/send`

**Request Body:**
```json
{
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "smtpUser": "user@gmail.com",
  "smtpPassword": "app-password",
  "from": "AlgoTrader Pro <noreply@example.com>",
  "to": "recipient@example.com",
  "subject": "Alert: BTC Price Alert",
  "text": "Plain text body...",
  "html": "<html>HTML body...</html>"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "unique-message-id"
}
```

## Implementation Examples

### Node.js + Express + Nodemailer

```javascript
const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.post('/api/email/send', limiter, async (req, res) => {
  try {
    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      from,
      to,
      subject,
      text,
      html
    } = req.body;

    // Validate required fields
    if (!smtpHost || !smtpUser || !smtpPassword || !to || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });

    // Verify connection
    await transporter.verify();

    // Send email
    const info = await transporter.sendMail({
      from: from || smtpUser,
      to,
      subject,
      text,
      html
    });

    res.json({
      success: true,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Email API server running on port ${PORT}`);
});
```

### Python + Flask + SMTP

```python
from flask import Flask, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

@app.route('/api/email/send', methods=['POST'])
@limiter.limit("10 per minute")
def send_email():
    try:
        data = request.json

        smtp_host = data.get('smtpHost')
        smtp_port = data.get('smtpPort', 587)
        smtp_secure = data.get('smtpSecure', False)
        smtp_user = data.get('smtpUser')
        smtp_password = data.get('smtpPassword')
        from_addr = data.get('from', smtp_user)
        to_addr = data.get('to')
        subject = data.get('subject')
        text_body = data.get('text', '')
        html_body = data.get('html', '')

        # Validate required fields
        if not all([smtp_host, smtp_user, smtp_password, to_addr, subject]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_addr
        msg['To'] = to_addr

        # Add text and HTML parts
        if text_body:
            msg.attach(MIMEText(text_body, 'plain'))
        if html_body:
            msg.attach(MIMEText(html_body, 'html'))

        # Send email
        if smtp_secure and smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port)
            if not smtp_secure:
                server.starttls()

        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()

        return jsonify({
            'success': True,
            'messageId': f'{smtp_user}_{to_addr}_{subject}'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=3001)
```

## Security Best Practices

1. **Never store passwords in plain text**
   - Use encrypted storage (AES-256)
   - Consider using OAuth2 for email providers that support it
   - Use app-specific passwords (Gmail, Outlook)

2. **Rate Limiting**
   - Implement per-IP rate limits
   - Implement per-user rate limits
   - Track email sending patterns

3. **CORS Configuration**
   - Only allow requests from your frontend domain
   - Use environment variables for allowed origins

4. **Input Validation**
   - Validate email addresses
   - Sanitize HTML content
   - Check for spam patterns

5. **Error Handling**
   - Don't expose sensitive error details
   - Log errors server-side only
   - Return generic error messages to client

## Common Email Providers Configuration

### Gmail
```
Host: smtp.gmail.com
Port: 587 (TLS) or 465 (SSL)
Secure: false for 587, true for 465
Note: Requires App Password (not regular password)
```

### Outlook/Office 365
```
Host: smtp.office365.com
Port: 587
Secure: false
```

### Yahoo
```
Host: smtp.mail.yahoo.com
Port: 587
Secure: false
Note: Requires App Password
```

### SendGrid (Transactional Email Service)
```
Host: smtp.sendgrid.net
Port: 587
Secure: false
User: "apikey"
Password: <your-sendgrid-api-key>
```

## Frontend Integration

Update the `EmailService.sendViaBackend()` method to call your backend:

```typescript
private async sendViaBackend(email: EmailQueueItem): Promise<void> {
  const config = this.getConfig();

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

  // Replace with your backend URL
  const response = await fetch('http://localhost:3001/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }

  const result = await response.json();
  console.log('Email sent successfully:', result.messageId);
}
```

## Testing

1. **Use a test email service** like Mailtrap.io or Ethereal Email for development
2. **Test with different providers** to ensure compatibility
3. **Monitor bounce rates** and adjust configuration as needed
4. **Set up health checks** to monitor email service availability

## Deployment Considerations

1. **Environment Variables**
   ```
   EMAIL_API_PORT=3001
   ALLOWED_ORIGINS=https://yourdomain.com
   MAX_EMAILS_PER_HOUR=50
   ```

2. **SSL/TLS Certificates**
   - Use HTTPS for the API endpoint
   - Validate SSL certificates for SMTP connections

3. **Monitoring**
   - Log all email attempts
   - Track delivery success/failure rates
   - Set up alerts for high failure rates

4. **Scaling**
   - Use a queue system (Redis, RabbitMQ) for high volume
   - Consider dedicated email service (SendGrid, AWS SES, Mailgun)
   - Implement retry logic with exponential backoff
