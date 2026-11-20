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
const out = path.resolve(process.env.QA_OUTPUT || 'output/food-licences');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const results = [];
try {
  for (const width of [390, 820, 1440])
    for (const theme of ['light', 'dark'])
      for (const lang of ['en', 'hi', 'mr', 'gu']) {
        const text = JSON.parse(
          await fs.readFile(
            new URL(`../src/features/food-licences/locales/${lang}.json`, import.meta.url),
            'utf8'
          )
        );
        const page = await browser.newPage({ viewport: { width, height: 1000 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        let licences = [
          {
            id: '11',
            tenant_id: '1',
            firm_id: '1',
            label: 'Jayesh Trading food licence',
            licence_number: '11526000000001',
            holder_name: 'Registered holder name',
            premises_address: 'Registered premises, Market road, Mumbai',
            valid_from: '2026-01-01',
            expiry_date: '2026-12-31',
            is_active: true,
            version: 1,
          },
        ];
        const writes = [];
        await page.route('**/api/v1/**', async (route) => {
          const req = route.request();
          const url = new URL(req.url());
          const suffix = url.pathname.replace('/api/v1', '');
          if (suffix === '/firms' && req.method() === 'GET')
            return route.fulfill({
              json: {
                success: true,
                data: {
                  firms: [{ id: '1', display_name: 'One legal firm / GST', is_active: true }],
                },
              },
            });
          if (suffix === '/food-licences' && req.method() === 'GET')
            return route.fulfill({ json: { success: true, data: { licences, max_active: 3 } } });
          if (suffix === '/food-licences' && req.method() === 'POST') {
            const input = req.postDataJSON();
            writes.push(input);
            licences = [...licences, { ...input, id: '12', tenant_id: '1', version: 1 }];
            return route.fulfill({ status: 201, json: { success: true, data: licences.at(-1) } });
          }
          throw new Error(`Unexpected fixture API call: ${req.method()} ${suffix}`);
        });
        await page.goto(`${base}/tests/browser/food-licences.html?theme=${theme}&lang=${lang}`);
        await page.getByRole('button', { name: text.edit, exact: true }).waitFor();
        await page.getByLabel(text.purchaseLabel, { exact: true }).selectOption('11');
        if ((await page.getByTestId('selected-licence').textContent()) !== '11')
          throw new Error('Selection did not propagate');
        await page.getByRole('button', { name: text.add, exact: true }).click();
        await page.getByLabel(text.firm, { exact: true }).selectOption('1');
        await page.getByLabel(text.number, { exact: true }).fill('11526000000002');
        await page.getByLabel(text.label, { exact: true }).fill('Jitendra Trading food licence');
        await page.getByLabel(text.holder, { exact: true }).fill('Second registered holder');
        await page
          .getByLabel(text.premises, { exact: true })
          .fill('Second registered premises address');
        const geometry = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          inputsOverflow: [...document.querySelectorAll('input,select,textarea')].filter(
            (node) => node.getBoundingClientRect().right > innerWidth + 1
          ).length,
          text: getComputedStyle(document.querySelector('.food-licences')).color,
          background: getComputedStyle(document.querySelector('.food-licences-card'))
            .backgroundColor,
        }));
        await page.screenshot({
          path: `${out}/${width}-${theme}-${lang}.png`,
          fullPage: true,
          animations: 'disabled',
        });
        await page.getByRole('button', { name: text.save, exact: true }).click();
        await page.getByRole('status').filter({ hasText: text.saved }).waitFor();
        const pass =
          geometry.overflow <= 1 &&
          geometry.inputsOverflow === 0 &&
          geometry.text !== geometry.background &&
          errors.length === 0 &&
          writes.length === 1 &&
          writes[0].firm_id === '1' &&
          !('gstin' in writes[0]);
        results.push({ width, theme, lang, ...geometry, errors, writes: writes.length, pass });
        await page.close();
      }
} finally {
  await browser.close();
}
await fs.writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    {
      checks: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: results.filter((r) => !r.pass),
    },
    null,
    2
  )
);
if (results.some((r) => !r.pass)) process.exitCode = 1;
