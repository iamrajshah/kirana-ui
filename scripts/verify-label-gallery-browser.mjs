import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(
  process.env.PLAYWRIGHT_RUNTIME_ROOT
    ? path.resolve(process.env.PLAYWRIGHT_RUNTIME_ROOT, 'package.json')
    : import.meta.url
);
const { chromium } = require('playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:5183';
const out = path.resolve(process.env.QA_OUTPUT || 'output/label-gallery');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const results = [];
try {
  for (const width of [390, 820, 1440])
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base + '/tests/browser/label-gallery.html');
      await page.evaluate(
        (theme) => document.body.classList.toggle('dark', theme === 'dark'),
        theme
      );
      const preview = page.locator('.barcode-label-preview .product-barcode-label');
      await preview.waitFor();
      for (const format of ['standard', 'extended', 'qr', 'packed-qr']) {
        if (format === 'extended') {
          await page.getByLabel('Net quantity', { exact: true }).fill('5 kg');
          await page.getByLabel('Batch / lot', { exact: true }).fill('BATCH-2026-001');
        }
        if (format === 'qr') {
          await page
            .getByLabel('QR link (optional, HTTPS)', { exact: true })
            .fill('https://shop.example/shop/my-shop/products/1');
          await page.locator('.product-label-qr').waitFor();
        }
        if (format === 'packed-qr') {
          await page.getByRole('combobox', { name: /Label preset/ }).selectOption('PACKED');
          await page.locator('input[type="date"]').nth(1).fill('2027-12-31');
          await page
            .locator('ion-toggle')
            .filter({ hasText: 'Show SKU on label' })
            .locator('label.toggle-wrapper')
            .click();
          await page.getByLabel('Net quantity', { exact: true }).fill('5 kg');
          await page.getByLabel('Batch / lot', { exact: true }).fill('BATCH-2026-001');
          await page
            .getByLabel('QR link (optional, HTTPS)', { exact: true })
            .fill('https://shop.example/shop/my-shop/products/1');
          await page.locator('.product-label-qr').waitFor();
        }
        const bounds = await preview.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return {
            height: r.height,
            width: r.width,
            overflow: el.scrollHeight - el.clientHeight,
            clipped: [...el.querySelectorAll('svg')].filter((n) => {
              const v = n.getBoundingClientRect();
              return v.bottom > r.bottom + 1 || v.right > r.right + 1 || v.left < r.left - 1;
            }).length,
          };
        });
        await page.screenshot({ path: `${out}/${width}-${theme}-${format}.png` });
        results.push({
          viewportWidth: width,
          theme,
          format,
          ...bounds,
          errors: [...errors],
          pass: bounds.overflow <= 1 && bounds.clipped === 0 && errors.length === 0,
        });
        console.log(JSON.stringify(results.at(-1)));
      }
      if (width === 1440 && theme === 'dark') {
        await page.getByRole('spinbutton', { name: 'Number of labels', exact: true }).fill('50');
        await page.keyboard.press('Tab');
        await page.evaluate(() => {
          window.print = () => {};
        });
        await page.getByRole('button', { name: /Print.*50/i }).click();
        await page.locator('.barcode-print-page--qr').last().waitFor({ state: 'attached' });
        const pages = await page.locator('.barcode-print-page--qr').count();
        const labels = await page.locator('.barcode-print-sheet .product-label-qr').count();
        await page.pdf({
          path: out + '/qr-50-labels.pdf',
          preferCSSPageSize: true,
          printBackground: true,
        });
        results.push({
          scenario: 'QR 50-copy print DOM',
          pages,
          labels,
          pass: pages === 5 && labels === 50,
        });
      }
      await page.close();
    }
} finally {
  await browser.close();
  await fs.writeFile(
    out + '/browser-report.json',
    JSON.stringify(
      {
        scope: 'Real Ionic modal, label geometry and Chrome print PDF, synthetic data only',
        results,
        summary: { passed: results.filter((x) => x.pass).length, total: results.length },
      },
      null,
      2
    )
  );
}
if (results.some((x) => !x.pass)) process.exitCode = 1;
