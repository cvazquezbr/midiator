import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    // Navigate to the page, wait for the network to be idle
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });

    // Wait for the grid to be visible, which indicates the masonry layout is active
    await page.waitForSelector('.grid-item', { state: 'visible', timeout: 15000 });

    // Give images time to load and masonry to arrange them
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'jules-verification-screenshot.png', fullPage: true });
    console.log('Verification screenshot taken successfully.');

  } catch (error) {
    console.error(`Error during verification: ${error}`);
    await page.screenshot({ path: 'jules-scratch/verification/debug_screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
