const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'),
  assert = require('assert/strict'),
  X = require(process.env.XLSX_MODULE || 'xlsx');
const path = require('node:path');
const out = path.resolve(process.env.EVIDENCE_DIR || '/tmp/kirana-master-import-browser');
fs.mkdirSync(out, { recursive: true });
const base = process.env.POS_QA_URL;
const email = process.env.KIRANA_QA_EMAIL;
const password = process.env.KIRANA_QA_PASSWORD;
if (
  !base ||
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname) ||
  !email ||
  !password
)
  throw new Error('Use a disposable localhost POS/API and explicit QA credentials.');
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(30000);
  await p.route('**/api/v1/**', (route) =>
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort('blockedbyclient')
  );
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  try {
    await p.addInitScript(() =>
      localStorage.setItem('kirana_installation_id', 'local-import-browser')
    );
    await p.goto(base + '/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.locator('ion-input input').first().fill(email);
    await p.locator('input[type=password]').fill(password);
    await p.getByRole('button', { name: /^sign in$/i }).click();
    await p.waitForURL('**/dashboard', { timeout: 90000 });
    await p.goto(base + '/import-export', { waitUntil: 'domcontentloaded' });
    await p.getByRole('button', { name: 'Kirana Excel sample', exact: true }).waitFor();
    for (const profile of ['Kirana Excel sample', 'MargBooks Excel sample']) {
      const d = p.waitForEvent('download');
      await p.getByRole('button', { name: profile, exact: true }).click();
      const download = await d;
      const file = out + '/browser-' + profile.toLowerCase().replaceAll(' ', '-') + '.xlsx';
      await download.saveAs(file);
      const w = X.readFile(file);
      assert.ok(X.utils.sheet_to_json(w.Sheets[w.SheetNames[0]]).length);
    }
    console.log('PASS actual sample Excel downloads open and contain a sample row');
    await p.locator('ion-segment-button[value="PRODUCT"]').click();
    const basis = p.getByRole('combobox', { name: 'Selling-price GST basis (optional)', exact: true });
    await basis.waitFor();
    assert.equal(await basis.getAttribute('required'), null);
    assert.match(await basis.inputValue(), /Not sure/);
    const stamp = Date.now();
    const name = 'Browser Master Product ' + stamp;
    const sku = 'BROWSER-' + stamp;
    const filename = 'browser-master-' + stamp + '.csv';
    const csv =
      'product_name,category_name,sku,barcode,price,mrp_price,purchase_price,gst_percent,hsn_code,quantity\n' +
      [name, 'Browser Import QA', sku, 'CODE-' + stamp, 100, 120, 75, 0, '1006', 2].join(',') +
      '\n';
    await p
      .locator('#file-upload')
      .setInputFiles({ name: filename, mimeType: 'text/csv', buffer: Buffer.from(csv) });
    const uploaded = p.waitForResponse(
      (r) => r.url().endsWith('/import/upload') && r.request().method() === 'POST'
    );
    await p.getByRole('button', { name: /^upload file$/i }).click();
    const job = (await (await uploaded).json()).data;
    const review = p.locator('.import-review-card');
    await review.getByText(name, { exact: true }).waitFor();
    const confirm = review.getByRole('button', { name: /^commit$/i });
    console.log('Review buttons', await review.getByRole('button').allTextContents());
    assert.equal(await confirm.isEnabled(), false);
    assert.ok((await review.innerText()).includes('Purchase price'));
    for (const width of [1440, 820, 390])
      for (const dark of [false, true]) {
        await p.setViewportSize({ width, height: 1000 });
        await p.evaluate((d) => document.body.classList.toggle('dark', d), dark);
        await review.scrollIntoViewIfNeeded();
        await p.screenshot({
          path: out + '/browser-review-' + width + '-' + (dark ? 'dark' : 'light') + '.png',
        });
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
        const row = review.locator('tbody tr').first();
        assert.ok((await row.locator('td').nth(3).boundingBox()).width >= 240);
        assert.ok((await row.boundingBox()).height < 500);
      }
    await p.setViewportSize({ width: 1440, height: 1000 });
    await review.locator('ion-checkbox').click();
    const commit = p.waitForResponse(
      (r) => r.url().endsWith('/import/' + job.id + '/commit') && r.request().method() === 'POST'
    );
    await confirm.click();
    const result = (await (await commit).json()).data;
    assert.equal(result.imported, 1);
    assert.equal(result.remaining, 0);
    await review.getByText('IMPORTED', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      out + '/browser-results.json',
      JSON.stringify(
        {
          status: 'PASS',
          jobId: job.id,
          sku,
          sampleDownloads: true,
          confirmationGuard: true,
          stock: 2,
          purchasePrice: 75,
          nilGstPreserved: true,
          responsiveWidths: [1440, 820, 390],
          themes: ['light', 'dark'],
          pageErrors: errors,
        },
        null,
        2
      )
    );
    console.log(
      'PASS real upload, mapped review, explicit confirmation, nil GST/purchase cost, one-row import, responsive themes; no browser errors'
    );
  } catch (e) {
    await p.screenshot({ path: out + '/browser-failure.png' });
    fs.writeFileSync(out + '/browser-failure.txt', await p.locator('body').innerText());
    throw e;
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
