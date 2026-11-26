import assert from 'node:assert/strict';
const { chromium } = await import(process.env.KIRANA_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.KIRANA_CHROME_PATH ? { executablePath: process.env.KIRANA_CHROME_PATH } : {}),
});
const base = process.env.KIRANA_BROWSER_BASE_URL || 'http://127.0.0.1:3012';
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(base + '/scripts/browser-fixtures/modal-keyboard.html');
    const first = page.locator('ion-input input');
    await first.waitFor();
    await first.focus();
    await first.press('Enter');
    assert.equal(await first.evaluate((n) => n === document.activeElement), true);
    await first.fill('Valid');
    await first.press('Enter');
    const search = page.locator('ion-searchbar input');
    assert.equal(await search.evaluate((n) => n === document.activeElement), true);
    await search.press('Tab');
    const combo = page.getByRole('combobox');
    await combo.evaluate((n) => new Promise((resolve) => requestAnimationFrame(resolve)));
    assert.equal(await combo.evaluate((n) => n === document.activeElement), true);
    await combo.press('Enter');
    const price = page.getByLabel('Native price');
    await page.waitForFunction(
      () => document.activeElement?.getAttribute('aria-label') === 'Native price'
    );
    await price.press('Enter');
    assert.equal(
      await page.getByLabel('Native stock').evaluate((n) => n === document.activeElement),
      true
    );
    await search.fill('QA');
    await search.press('ArrowDown');
    await search.press('Enter');
    assert.equal(await page.evaluate(() => window.selected), '1');
    await search.press('ArrowUp');
    await search.press('Enter');
    assert.equal(await page.evaluate(() => window.selected), '0');
    assert.equal(await page.evaluate(() => window.submissions), 0);
    console.log(
      'PASS real modal: required validation, Ionic -> dropdown -> native traversal, search arrows/Enter, no financial submit',
      width
    );
    await page.close();
  }
} finally {
  await browser.close();
}
