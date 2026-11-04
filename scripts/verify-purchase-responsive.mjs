// Render a built POS against a read-only API session; never submit a purchase.
// Playwright may be supplied from a separate QA tooling installation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const options = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, '').split('=');
    return [key, value.join('=')];
  })
);
if (!options.state || !options.api) {
  throw new Error('Required: --state=/private/owner-state.json --api=https://api.example/api/v1');
}
const base = options.url || 'http://127.0.0.1:3001';
const api = options.api.replace(/\/$/, '');
const out = path.resolve(options.output || 'output/purchase-responsive');
const require = createRequire(
  options['playwright-root']
    ? path.resolve(options['playwright-root'], 'package.json')
    : import.meta.url
);
const { chromium } = require('playwright');
const state = JSON.parse(await fs.readFile(options.state, 'utf8'));
const origin = state.origins.find((entry) =>
  entry.localStorage.some((item) => item.name === 'access_token')
);
const token = origin?.localStorage.find((item) => item.name === 'access_token')?.value;
if (!token) throw new Error('Existing authenticated browser state required');
const report = { cases: [], scope: 'GET-only rendered purchase layout; no purchase submitted' };
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(options.chrome ? { executablePath: options.chrome } : {}),
});
const measure = async (price) =>
  price.evaluate((input) => {
    const item = input.closest('ion-item');
    const label = input.closest('ion-label');
    const bounds = (element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    };
    const elements = [
      label,
      ...label.querySelectorAll(
        '.purchase-line-controls,.purchase-quantity-controls,label,input,select'
      ),
      ...item.shadowRoot.querySelectorAll('*'),
    ];
    const wrapper = item.shadowRoot.querySelector('.input-wrapper');
    const clip = bounds(wrapper);
    return {
      horizontalOffsets: elements.map((node) => node.scrollLeft).filter((value) => value !== 0),
      overflowing: elements
        .filter((node) => node.scrollWidth > node.clientWidth + 1)
        .map((node) => ({
          tag: node.tagName,
          class: node.className,
          client: node.clientWidth,
          scroll: node.scrollWidth,
        })),
      clippedFields: [...label.querySelectorAll('label,input,select,.purchase-quantity-label')]
        .filter((node) => {
          const rect = bounds(node);
          return rect.left < clip.left - 1 || rect.right > clip.right + 1;
        })
        .map((node) => ({ tag: node.tagName, class: node.className })),
      quantityTouchTargets: [
        ...label.querySelectorAll('.purchase-quantity-controls ion-button'),
      ].every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
    };
  });

try {
  const fixtureContext = await browser.newContext();
  const headers = { authorization: `Bearer ${token}` };
  const response = await fixtureContext.request.get(api + '/products/catalog', { headers });
  if (!response.ok()) throw new Error('Read-only catalog fixture unavailable');
  const variants = (await response.json()).data;
  const selected =
    variants.find((item) => /amul|salt|oil|sugar/i.test(item.product_name || '')) || variants[0];
  if (!selected) throw new Error('A catalog fixture is required');
  await fixtureContext.close();

  for (const width of [390, 820]) {
    for (const theme of ['light', 'dark']) {
      for (const language of (options.languages || 'en,hi,mr,gu').split(',')) {
        const useState = structuredClone(state);
        useState.origins = [{ ...origin, origin: base }];
        for (const [name, value] of [
          ['kirana-ui-theme', theme],
          ['i18nextLng', language],
        ]) {
          const entry = useState.origins[0].localStorage.find((item) => item.name === name);
          if (entry) entry.value = value;
          else useState.origins[0].localStorage.push({ name, value });
        }
        const context = await browser.newContext({
          storageState: useState,
          viewport: { width, height: 1000 },
          isMobile: width === 390,
          hasTouch: width === 390,
          colorScheme: theme,
        });
        context.setDefaultTimeout(30000);
        const writes = [],
          errors = [];
        await context.route('**/*', async (route) => {
          const request = route.request();
          if (
            request.url().startsWith(api) &&
            !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
          ) {
            writes.push(request.method() + ' ' + new URL(request.url()).pathname);
            await route.abort();
          } else await route.continue();
        });
        const page = await context.newPage();
        page.on('pageerror', (error) => errors.push(error.name));
        await page.goto(base + '/purchases/create', { waitUntil: 'domcontentloaded' });
        await page.locator('ion-searchbar input').first().fill(selected.sku);
        await page.locator('ion-item[button]').filter({ hasText: selected.sku }).first().click();
        const price = page.locator('.purchase-price-field input').first();
        await price.waitFor();
        if (options.mode === 'PACK') {
          await page.locator('.purchase-unit-editor select').first().selectOption('PACK');
        }
        await price.scrollIntoViewIfNeeded();
        const afterScroll = await measure(price);
        await price.evaluate((input) => {
          input
            .closest('ion-item')
            .shadowRoot.querySelectorAll('*')
            .forEach((node) => {
              node.scrollLeft = 0;
            });
          input.focus();
        });
        const afterFocus = await measure(price);
        await page.screenshot({ path: path.join(out, `${width}-${theme}-${language}.png`) });
        const valid = (measurement) =>
          measurement.horizontalOffsets.length === 0 &&
          measurement.overflowing.length === 0 &&
          measurement.clippedFields.length === 0 &&
          measurement.quantityTouchTargets;
        const result = {
          width,
          theme,
          language,
          purchaseMode: options.mode === 'PACK' ? 'PACK' : 'UNIT',
          afterScroll,
          afterFocus,
          noBusinessWrites: writes.length === 0,
          noRuntimeErrors: errors.length === 0,
          pass:
            valid(afterScroll) && valid(afterFocus) && writes.length === 0 && errors.length === 0,
        };
        report.cases.push(result);
        console.log(JSON.stringify({ width, theme, language, pass: result.pass }));
        await context.close();
      }
    }
  }
} catch (error) {
  report.blocked = error.message.replace(/Bearer\s+\S+/g, 'Bearer [redacted]');
} finally {
  await browser.close();
  report.summary = {
    total: report.cases.length,
    passed: report.cases.filter((item) => item.pass).length,
    failed: report.cases.filter((item) => !item.pass).length,
    blocked: Boolean(report.blocked),
  };
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  process.exitCode = report.summary.failed || report.summary.blocked ? 1 : 0;
}
