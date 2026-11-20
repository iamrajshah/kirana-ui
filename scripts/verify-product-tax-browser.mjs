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
const out = path.resolve(process.env.QA_OUTPUT || 'output/product-tax');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const results = [];
const originalValues = {
  hsnCode: '1006',
  gstPercent: null,
  uqcCode: 'KGS',
  unitLabel: 'kg',
  uqcQuantityFactor: 1,
};
const rows = Array.from({ length: 25 }, (_, i) => ({
  variantId: String(i + 1),
  productId: String(i + 1),
  productName: `Sample rice ${i + 1}`,
  sku: `QA-${i + 1}`,
  brand: 'Sample',
  size: '1 kg',
  values: { ...originalValues, ...(i === 1 ? { gstPercent: 0 } : {}) },
  missing: i === 1 ? [] : ['GST_RATE'],
}));
const setup = async (page, calls) => {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const suffix = url.pathname.replace('/api/v1', '');
    if (suffix === '/products/tax-review' && request.method() === 'GET')
      return route.fulfill({ json: { success: true, data: { rows, total: 25 } } });
    if (suffix === '/products/tax-review/preview') {
      const input = request.postDataJSON();
      calls.previews.push(input);
      return route.fulfill({
        json: {
          success: true,
          data: {
            changedCount: input.rows.length,
            changes: input.rows.map((row) => ({
              variantId: row.variantId,
              productId: row.variantId,
              productName: 'Sample rice',
              before: row.expected,
              after: row.values,
              changed: true,
              missing: [],
            })),
          },
        },
      });
    }
    if (suffix === '/products/tax-review/apply') {
      calls.applies.push(request.postDataJSON());
      if (calls.applies.length === 1)
        return route.fulfill({
          status: 503,
          json: { success: false, message: 'Synthetic temporary failure' },
        });
      return route.fulfill({ json: { success: true, data: {} } });
    }
    throw new Error(`Fixture refused an unexpected API call: ${request.method()} ${suffix}`);
  });
};
try {
  for (const width of [390, 820, 1440])
    for (const theme of ['light', 'dark'])
      for (const lang of ['en', 'hi', 'mr', 'gu']) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const calls = { previews: [], applies: [] };
        await setup(page, calls);
        await page.goto(`${base}/tests/browser/product-tax.html?theme=${theme}&lang=${lang}`);
        await page.locator('tbody tr').last().waitFor();
        const geometry = await page.evaluate(() => {
          const workspace = document.querySelector('.tax-workspace');
          const header = workspace.querySelector('header');
          const scroll = workspace.querySelector('.tax-table-scroll');
          return {
            viewportOverflow: document.documentElement.scrollWidth - innerWidth,
            headerOverflow: header.scrollWidth - header.clientWidth,
            containedScroll:
              scroll.scrollWidth > scroll.clientWidth
                ? scroll.getBoundingClientRect().width <= workspace.getBoundingClientRect().width
                : true,
          };
        });
        const count = await page.locator('tbody tr').count();
        const zero = await page.locator('tbody tr').nth(1).locator('td input').nth(2).inputValue();
        await page.screenshot({ path: `${out}/${width}-${theme}-${lang}.png`, animations: 'disabled' });
        results.push({
          width,
          theme,
          lang,
          rows: count,
          zero,
          ...geometry,
          errors,
          pass:
            count === 25 &&
            zero === '0' &&
            geometry.viewportOverflow <= 1 &&
            geometry.headerOverflow <= 1 &&
            geometry.containedScroll &&
            !errors.length,
        });
        console.log(JSON.stringify(results.at(-1)));
        await page.close();
      }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const calls = { previews: [], applies: [] };
  await setup(page, calls);
  await page.goto(`${base}/tests/browser/product-tax.html?lang=en`);
  await page.locator('tbody tr').last().waitFor();
  await page.getByLabel('GST % QA-1', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and save', exact: true }).waitFor();
  if (calls.applies.length) throw new Error('Preview mutated data');
  await page.getByRole('button', { name: 'Confirm and save', exact: true }).click();
  await page.getByRole('alert').waitFor();
  const retained = await page.getByLabel('GST % QA-1', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and save', exact: true }).click();
  await page.getByText('Tax details saved. Historical invoices are unchanged.').waitFor();
  const stable =
    calls.previews.length === 2 &&
    calls.applies.length === 2 &&
    retained === '0' &&
    calls.applies[0].rows[0].expected.gstPercent === null &&
    calls.applies[1].rows[0].values.gstPercent === 0;
  results.push({
    scenario: 'preview, failed save, retained form and explicit retry',
    pass: stable,
  });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator('.tax-workspace').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Open tax review', exact: true }).click();
  await page.getByLabel('GST % QA-1', { exact: true }).fill('6');
  await page.keyboard.press('Escape');
  await page.locator('.tax-workspace').waitFor();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('alert').getByRole('button', { name: 'Discard edits', exact: true }).click();
  await page.locator('.tax-workspace').waitFor({ state: 'hidden' });
  const removed = await page.locator('ion-modal').count();
  await page.getByRole('button', { name: 'Open tax review', exact: true }).click();
  await page.getByLabel('GST % QA-1', { exact: true }).fill('5');
  results.push({
    scenario: 'close, reopen, protect dirty escape, discard and recover interaction',
    pass: removed === 0,
  });
  await page.close();
} finally {
  await browser.close();
  await fs.writeFile(
    path.join(out, 'browser-report.json'),
    JSON.stringify(
      {
        scope:
          'Real Ionic modal and RTK Query; intercepted synthetic API only, no production writes',
        results,
        summary: { passed: results.filter((r) => r.pass).length, total: results.length },
      },
      null,
      2
    )
  );
}
if (results.some((result) => !result.pass)) process.exitCode = 1;
