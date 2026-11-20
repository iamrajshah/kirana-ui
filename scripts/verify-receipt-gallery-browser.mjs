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
const out = path.resolve(process.env.QA_OUTPUT || 'output/receipt-gallery');
await fs.mkdir(out, { recursive: true });
const logo = await fs.readFile('tests/browser/shop-logo.png');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const results = [];
try {
  for (const template of ['CLASSIC', 'MODERN', 'COMPACT', 'LOGO_LEFT', 'BRAND_CENTRE', 'DETAILED'])
    for (const paper of ['58', '80', 'A4']) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
      await page.route('https://qa.kirana.invalid/**', (r) =>
        r.fulfill({ status: 200, contentType: 'image/png', body: logo })
      );
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(
        `${base}/tests/browser/receipt-gallery.html?template=${template}&paper=${paper}`
      );
      await page.locator('.sale-receipt__logo').waitFor();
      await page.getByRole('checkbox', { name: 'Long bill sample' }).check();
      if (paper === 'A4') await page.getByRole('checkbox', { name: 'A4', exact: true }).check();
      await page.getByRole('button', { name: 'Preview PDF', exact: true }).click();
      const iframe = page.locator('iframe');
      await iframe.waitFor({ timeout: 60000 });
      const bytes = await page.evaluate(async () =>
        Array.from(
          new Uint8Array(await (await fetch(document.querySelector('iframe').src)).arrayBuffer())
        )
      );
      const buffer = Buffer.from(bytes);
      await fs.writeFile(`${out}/${template}-${paper}.pdf`, buffer);
      const media = buffer.toString('latin1').match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)/);
      const width = Number(media?.[1]);
      const expected = paper === '58' ? 164.41 : paper === '80' ? 226.77 : 595.28;
      const imageLoaded = await page
        .locator('.sale-receipt__logo')
        .evaluate((img) => img.complete && img.naturalWidth > 0);
      results.push({
        template,
        paper,
        pdfBytes: buffer.length,
        width,
        imageLoaded,
        errors,
        pass:
          Math.abs(width - expected) < 0.1 &&
          buffer.length > 1000 &&
          imageLoaded &&
          errors.length === 0,
      });
      console.log(JSON.stringify(results.at(-1)));
      await page.close();
    }
} finally {
  await browser.close();
  await fs.writeFile(
    out + '/browser-report.json',
    JSON.stringify(
      {
        scope:
          'Live local React preview and real browser PDF generation, 30 lines and logo; no business writes',
        results,
        summary: { passed: results.filter((x) => x.pass).length, total: results.length },
      },
      null,
      2
    )
  );
}
if (results.some((x) => !x.pass)) process.exitCode = 1;
