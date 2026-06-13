import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function testPayment() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('1. Opening homepage...');
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);

  console.log('2. Clicking Buy Now on first product...');
  const buyButtons = await page.locator('button:has-text("Buy Now")');
  await buyButtons.first().click();
  await page.waitForTimeout(1000);

  console.log('3. Filling email...');
  await page.fill('input[type="email"]', 'test@gadscale.com');
  await page.waitForTimeout(500);

  console.log('4. Selecting BTC...');
  await page.click('button:has-text("Bitcoin")');
  await page.waitForTimeout(500);

  console.log('5. Clicking Continue to payment...');
  await page.click('button:has-text("Continue to payment")');
  await page.waitForTimeout(3000);

  // Take screenshot of payment step
  await page.screenshot({ path: 'test-payment-result.png', fullPage: true });
  console.log('6. Screenshot saved: test-payment-result.png');

  // Wait to see what happens
  console.log('7. Waiting for webhook processing (30s)...');
  await page.waitForTimeout(30000);

  await page.screenshot({ path: 'test-payment-final.png', fullPage: true });
  console.log('8. Final screenshot saved: test-payment-final.png');

  await browser.close();
  console.log('Done!');
}

testPayment().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
