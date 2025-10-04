/**
 * Email Notifications Test Script
 *
 * This script demonstrates how to test the email notification system
 *
 * Usage:
 * 1. Configure your SMTP settings in the AlgoTrader Pro UI
 * 2. Open browser console on the AlgoTrader Pro app
 * 3. Copy and paste this code
 * 4. Run the test functions
 */

// Test 1: Send a test price alert email
async function testPriceAlertEmail() {
  console.log('🧪 Testing Price Alert Email...');

  const emailService = window['emailService']; // Get service from window (if exposed)

  // Simulate price alert
  const priceAlert = {
    symbol: 'BTCUSDT',
    price: 65234.50,
    condition: 'Price Above',
    targetPrice: 65000
  };

  const success = await emailService.sendAlertEmail(
    'price',
    `${priceAlert.symbol} price is above ${priceAlert.targetPrice}`,
    priceAlert
  );

  if (success) {
    console.log('✅ Price alert email sent successfully!');
  } else {
    console.log('❌ Failed to send price alert email');
  }
}

// Test 2: Send a test indicator alert email
async function testIndicatorAlertEmail() {
  console.log('🧪 Testing Indicator Alert Email...');

  const emailService = window['emailService'];

  const indicatorAlert = {
    symbol: 'ETHUSDT',
    indicator: 'RSI',
    condition: 'Crossed Above 70',
    value: 72.5
  };

  const success = await emailService.sendAlertEmail(
    'indicator',
    `${indicatorAlert.symbol} ${indicatorAlert.indicator} ${indicatorAlert.condition}`,
    indicatorAlert
  );

  if (success) {
    console.log('✅ Indicator alert email sent successfully!');
  } else {
    console.log('❌ Failed to send indicator alert email');
  }
}

// Test 3: Test email configuration
async function testEmailConfig() {
  console.log('🧪 Testing Email Configuration...');

  const emailService = window['emailService'];

  const result = await emailService.testEmailConfig();

  if (result.success) {
    console.log('✅ Email configuration is valid:', result.message);
  } else {
    console.log('❌ Email configuration failed:', result.message);
  }
}

// Test 4: Check email statistics
function checkEmailStats() {
  console.log('📊 Email Statistics:');

  const emailService = window['emailService'];
  const stats = emailService.getEmailStats();

  console.log('Emails sent in last hour:', stats.lastHour);
  console.log('Emails sent today:', stats.today);
  console.log('Last email sent:', stats.lastEmailTime);
  console.log('Queue size:', stats.queueSize);
  console.log('History size:', stats.historySize);
}

// Test 5: Test rate limiting
async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting...');

  const emailService = window['emailService'];

  // Try to send 5 emails rapidly
  for (let i = 0; i < 5; i++) {
    const success = await emailService.sendEmail(
      `Test Email ${i + 1}`,
      `This is test email number ${i + 1}`
    );

    console.log(`Email ${i + 1}:`, success ? '✅ Sent' : '❌ Rate limited');

    // Small delay between sends
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  checkEmailStats();
}

// Test 6: Test all email templates
async function testAllTemplates() {
  console.log('🧪 Testing All Email Templates...');

  // You'll need to access the EmailTemplateService
  // This is a placeholder - adjust based on your implementation

  console.log('1. Price Alert Template');
  console.log('2. Indicator Alert Template');
  console.log('3. Order Filled Template');
  console.log('4. Position Closed Template');
  console.log('5. Risk Warning Template');
  console.log('6. Volatility Alert Template');

  console.log('✅ All templates available');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Email Notification Tests...\n');

  try {
    await testEmailConfig();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testPriceAlertEmail();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await testIndicatorAlertEmail();
    await new Promise(resolve => setTimeout(resolve, 2000));

    checkEmailStats();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export functions for manual testing
console.log(`
📧 Email Notification Test Suite Ready!

Available test functions:
- testEmailConfig()          - Test your email configuration
- testPriceAlertEmail()       - Send a test price alert
- testIndicatorAlertEmail()   - Send a test indicator alert
- checkEmailStats()           - View email statistics
- testRateLimiting()          - Test rate limiting
- testAllTemplates()          - List available templates
- runAllTests()               - Run all tests

Example usage:
  await testEmailConfig()
  await runAllTests()
`);

// For Node.js testing (if using backend directly)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testPriceAlertEmail,
    testIndicatorAlertEmail,
    testEmailConfig,
    checkEmailStats,
    testRateLimiting,
    testAllTemplates,
    runAllTests
  };
}
