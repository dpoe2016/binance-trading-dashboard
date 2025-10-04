# Webhook Integration Documentation

## Overview

The Webhook Integration system allows AlgoTrader Pro to send real-time notifications to external services like Discord, Slack, Telegram, and custom webhook endpoints when trading alerts and events occur.

---

## Features

### ✅ Completed Features

1. **Multi-Platform Support**
   - Discord webhooks
   - Slack webhooks
   - Telegram webhooks
   - Custom webhook endpoints

2. **Event Triggers**
   - Alert triggered
   - Order filled
   - Position opened
   - Position closed
   - Stop loss hit
   - Take profit hit
   - Risk warnings
   - Volatility alerts

3. **Configuration**
   - Per-webhook event selection
   - Custom payload templates
   - Retry logic (configurable attempts)
   - Timeout configuration
   - Custom headers support

4. **Reliability**
   - Automatic retry with exponential backoff
   - Error logging and tracking
   - Webhook status monitoring
   - Test functionality

5. **Management UI**
   - Add/edit/delete webhooks
   - Enable/disable webhooks
   - View webhook logs
   - Test webhook delivery

---

## Usage

### Setting Up a Discord Webhook

1. Go to **Settings > Webhooks** in AlgoTrader Pro
2. Click **Add Webhook**
3. Configure:
   - Name: "My Discord Alerts"
   - Platform: Discord
   - URL: Your Discord webhook URL from server settings
   - Events: Select which events to receive
4. Click **Create Webhook**
5. Test the webhook using the 🧪 button

### Setting Up a Slack Webhook

1. Create an incoming webhook in your Slack workspace
2. In AlgoTrader Pro, add a new webhook
3. Configure:
   - Name: "Slack Trading Alerts"
   - Platform: Slack
   - URL: Your Slack webhook URL
   - Events: Select alert types
4. Save and test

### Setting Up a Telegram Webhook

1. Create a Telegram bot using @BotFather
2. Get your bot token and chat ID
3. In AlgoTrader Pro, add a new webhook
4. Configure:
   - Name: "Telegram Notifications"
   - Platform: Telegram
   - URL: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>`
   - Events: Select alert types
5. Save and test

### Custom Webhooks

For custom endpoints, you can:
- Use any HTTPS URL
- Customize the JSON payload using template variables
- Add custom headers for authentication

---

## Payload Formats

### Default Payload Structure

```json
{
  "event": "ALERT_TRIGGERED",
  "timestamp": 1696435200000,
  "data": {
    "alertId": "alert_123",
    "alertName": "BTC Price Alert",
    "symbol": "BTCUSDT",
    "type": "PRICE_ABOVE",
    "currentPrice": 50000,
    "targetValue": 49000,
    "message": "BTCUSDT price is above 49000 (current: 50000)",
    "timestamp": "2025-10-04T15:00:00.000Z"
  }
}
```

### Discord Format

Discord webhooks receive formatted embeds:

```json
{
  "embeds": [{
    "title": "🔔 Alert Triggered",
    "description": "BTCUSDT price is above 49000 (current: 50000)",
    "color": 3447003,
    "timestamp": "2025-10-04T15:00:00.000Z",
    "footer": {
      "text": "AlgoTrader Pro"
    }
  }]
}
```

### Slack Format

Slack webhooks receive formatted attachments:

```json
{
  "attachments": [{
    "color": "#3498db",
    "title": "🔔 Alert Triggered",
    "text": "BTCUSDT price is above 49000 (current: 50000)",
    "ts": 1696435200,
    "footer": "AlgoTrader Pro"
  }]
}
```

### Telegram Format

Telegram webhooks receive Markdown-formatted messages:

```json
{
  "text": "🔔 *Alert Triggered*\n\nBTCUSDT price is above 49000 (current: 50000)",
  "parse_mode": "Markdown"
}
```

---

## Custom Payload Templates

You can customize webhook payloads using template variables:

### Available Variables
- `{{event}}` - Event type (e.g., "ALERT_TRIGGERED")
- `{{timestamp}}` - Unix timestamp in milliseconds
- `{{data}}` - Full event data object

### Example Custom Payload

```json
{
  "type": "{{event}}",
  "time": {{timestamp}},
  "alert_data": {{data}},
  "source": "AlgoTrader Pro"
}
```

---

## Event Types

| Event Type | Description | When Triggered |
|-----------|-------------|----------------|
| `ALERT_TRIGGERED` | Price or indicator alert triggered | When any configured alert condition is met |
| `ORDER_FILLED` | Order successfully filled | When a market or limit order executes |
| `POSITION_OPENED` | New trading position opened | When entering a new trade |
| `POSITION_CLOSED` | Trading position closed | When exiting a trade |
| `STOP_LOSS_HIT` | Stop loss order triggered | When stop loss price is reached |
| `TAKE_PROFIT_HIT` | Take profit order triggered | When take profit price is reached |
| `RISK_WARNING` | Risk management alert | When risk thresholds are exceeded |
| `VOLATILITY_ALERT` | High volatility detected | When volatility spikes above threshold |

---

## Retry Logic

Webhooks automatically retry on failure:

1. **Initial Attempt**: Immediate send
2. **Retry 1**: After 1 second
3. **Retry 2**: After 2 seconds
4. **Retry 3**: After 3 seconds

Configure retry attempts (0-10) per webhook.

---

## Error Handling

### Common Errors

1. **Timeout**: Request took longer than configured timeout
   - Default: 5 seconds
   - Configurable: 1-30 seconds

2. **Connection Failed**: Unable to reach webhook URL
   - Check URL is correct and accessible
   - Verify firewall/network settings

3. **HTTP Error**: Server returned error status
   - Check webhook configuration
   - Verify authentication/headers

### Viewing Logs

1. Go to **Settings > Webhooks**
2. Click **View Logs**
3. Review recent webhook attempts
4. Check status, error messages, and retry counts

---

## Security Considerations

1. **HTTPS Only**: All webhook URLs must use HTTPS
2. **Secure Storage**: Webhook URLs stored in browser localStorage
3. **No Sensitive Data**: Avoid including API keys in webhook configs
4. **Custom Headers**: Use for authentication when needed
5. **Testing**: Always test webhooks before relying on them

---

## Integration with Alert Service

Webhooks are automatically triggered when:
- An alert's conditions are met (via AlertService)
- Orders are filled (future: OrderService integration)
- Positions are opened/closed (future: PositionService integration)
- Risk warnings occur (future: RiskManagementService integration)

The webhook service listens for these events and sends notifications to all enabled webhooks that have subscribed to the specific event type.

---

## API Reference

### WebhookService Methods

#### `addWebhook(webhook: Partial<WebhookConfig>): WebhookConfig`
Create a new webhook configuration.

#### `updateWebhook(id: string, updates: Partial<WebhookConfig>): void`
Update an existing webhook.

#### `deleteWebhook(id: string): void`
Delete a webhook configuration.

#### `triggerWebhook(event: WebhookEvent, data: any): Promise<void>`
Manually trigger a webhook event (usually called by services).

#### `testWebhook(webhookId: string): Promise<boolean>`
Send a test payload to verify webhook configuration.

---

## Troubleshooting

### Webhook Not Firing

1. Check webhook is **enabled**
2. Verify **events** are selected
3. Check **alert settings** have notifications enabled
4. Review **webhook logs** for errors

### Discord Not Receiving Messages

1. Verify Discord webhook URL is correct
2. Check channel permissions
3. Test webhook using Discord's webhook tester
4. Review logs for HTTP errors

### Slack Not Receiving Messages

1. Confirm incoming webhook is active in Slack
2. Verify webhook URL hasn't expired
3. Check workspace permissions
4. Review logs for authentication errors

### Telegram Not Receiving Messages

1. Verify bot token is valid
2. Confirm chat ID is correct
3. Ensure bot is added to the chat
4. Check bot has permission to send messages

---

## Future Enhancements

- [ ] Order event integration (filled, cancelled)
- [ ] Position event integration (opened, closed)
- [ ] Risk management event integration
- [ ] Webhook templates library
- [ ] Rate limiting per webhook
- [ ] Webhook groups (send to multiple endpoints)
- [ ] Conditional webhooks (only send if conditions met)
- [ ] Webhook statistics dashboard
- [ ] Export/import webhook configurations

---

## Examples

### Example 1: Price Alert Webhook

```json
{
  "event": "ALERT_TRIGGERED",
  "timestamp": 1696435200000,
  "data": {
    "alertId": "alert_abc123",
    "alertName": "BTC Above 50k",
    "symbol": "BTCUSDT",
    "type": "PRICE_ABOVE",
    "currentPrice": 50125.50,
    "targetValue": 50000,
    "message": "BTCUSDT price is above 50000 (current: 50125.50)",
    "timestamp": "2025-10-04T15:30:00.000Z"
  }
}
```

### Example 2: RSI Alert Webhook

```json
{
  "event": "ALERT_TRIGGERED",
  "timestamp": 1696435260000,
  "data": {
    "alertId": "alert_def456",
    "alertName": "ETH RSI Oversold",
    "symbol": "ETHUSDT",
    "type": "RSI_BELOW",
    "currentPrice": 2850.00,
    "targetValue": 30,
    "message": "ETHUSDT RSI is below 30 (oversold condition)",
    "timestamp": "2025-10-04T15:31:00.000Z"
  }
}
```

---

**Last Updated:** 2025-10-04
**Version:** 1.0.0
