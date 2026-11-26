// Optional real-browser check against Vite. Install Playwright or set its module path.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.KIRANA_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.KIRANA_CHROME_PATH ? { executablePath: process.env.KIRANA_CHROME_PATH } : {}),
});
const base = process.env.KIRANA_BROWSER_BASE_URL || 'http://127.0.0.1:3012';
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/scripts/browser-fixtures/enter-navigation.html`);
    const first = page.locator('ion-input input').nth(0);
    const last = page.locator('ion-input input').nth(2);
    await first.waitFor();
    await first.focus();
    await first.press('Enter');
    assert.equal(
      await first.evaluate((node) => node === document.activeElement),
      true,
      'Required empty field must retain focus'
    );
    await first.fill('Valid');
    await first.press('Enter');
    await last.evaluate(
      (node) =>
        new Promise((resolve, reject) => {
          const start = Date.now();
          const check = () =>
            node === document.activeElement
              ? resolve()
              : Date.now() - start > 2000
                ? reject(Error('Enter did not advance focus'))
                : setTimeout(check, 20);
          check();
        })
    );
    await last.press('Enter');
    assert.equal(
      await page.evaluate(() => window.submissions),
      0,
      'Enter must not collect payment'
    );
    await first.focus();
    await first.press('Tab');
    assert.equal(
      await last.evaluate((node) => node === document.activeElement),
      true,
      'Tab must still skip disabled fields'
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS real Ionic input focus, validation, disabled-field skip, Tab and no-submit: ${viewport.width}px`
    );
    await page.close();
  }
} finally {
  await browser.close();
}
