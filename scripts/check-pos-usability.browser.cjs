// Isolated synthetic API fixtures. Never exercises real tenant financial writes.
const { chromium } = require(process.env.KIRANA_PLAYWRIGHT_MODULE || 'playwright');
const user = {
  id: '991',
  name: 'Local QA Owner',
  phone: '9000000001',
  email: 'qa@example.com',
  roles: ['OWNER'],
  tenant: { id: '991', name: 'Local QA Shop', status: 'ACTIVE' },
};
const variants = [
  {
    id: '11',
    product_id: '1',
    product_name: 'QA Rice',
    price: 60,
    mrp_price: 70,
    available_quantity: 100,
    saleable_quantity: 100,
    sku: 'QA-RICE',
    gst_percent: 0,
  },
  {
    id: '12',
    product_id: '2',
    product_name: 'QA Tea',
    price: 80,
    available_quantity: 100,
    saleable_quantity: 100,
    sku: 'QA-TEA',
    gst_percent: 0,
  },
];
const features = [
  'CORE_POS',
  'DASHBOARD',
  'BILLING',
  'INVOICES',
  'CUSTOMERS_KHATA',
  'PAYMENTS',
  'PRODUCTS',
  'INVENTORY',
  'PURCHASES',
  'SUPPLIERS',
  'REPORTS',
  'STAFF',
  'FIRMS_SETTINGS',
  'ESSENTIAL_REPORTS',
  'LIVE_MARGIN_PREVIEW',
  'FOOD_LICENCES',
  'ONLINE_ORDERS',
];
const access = {
  state: 'ACTIVE',
  planCode: 'BUSINESS',
  entitlements: features,
  accessStateVersion: 'qa',
  limits: { staff: 5, firms: 3 },
  demoExpiresAt: null,
  endsAt: null,
  graceExpiresAt: null,
};
const customer = { id: '21', name: 'QA Customer', phone: '9000000002', credit_balance: 100 };
const supplier = { id: '31', name: 'QA Supplier', phone: '9000000003', credit_balance: 0 };
(async () => {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const out =
    process.env.KIRANA_QA_OUTPUT ||
    require('node:path').resolve(__dirname, '../output/pos-usability-review');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({
    headless: true,
    executablePath: process.env.KIRANA_CHROME_PATH || undefined,
  });
  const results = [];
  try {
    for (const width of process.env.KIRANA_QA_WIDTH
      ? [Number(process.env.KIRANA_QA_WIDTH)]
      : [1440, 820, 390]) {
      const p = await b.newPage({ viewport: { width, height: 1000 } });
      p.setDefaultTimeout(12000);
      const errors = [];
      const writes = [];
      p.on('pageerror', (e) => {
        errors.push(e.message);
        console.log('PAGEERROR', e.stack);
      });
      await p.addInitScript(
        ({ user, access }) => {
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('access_token', 'local-browser-qa');
          localStorage.setItem('refresh_token', 'local-browser-qa');
          localStorage.setItem('session_context', JSON.stringify({ commercialAccess: access }));
        },
        { user, access }
      );
      await p.route('**/api/v1/**', async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace('/api/v1', '');
        let data = [];
        let meta = { total: 0 };
        if (route.request().method() !== 'GET' && route.request().method() !== 'OPTIONS')
          writes.push(path);
        if (path === '/auth/session-context') data = { commercialAccess: access, user };
        else if (path === '/subscription/access') data = access;
        else if (path === '/products/catalog' || path === '/products/search') data = variants;
        else if (path === '/products') {
          data = variants.map((v) => ({
            id: v.product_id,
            name: v.product_name,
            is_active: true,
            variants: [v],
          }));
          meta.total = 2;
        } else if (path === '/products/tax-review')
          data = {
            total: 1,
            rows: [
              {
                variantId: '11',
                productId: '1',
                productName: 'QA Rice',
                sku: 'QA-RICE',
                brand: null,
                size: null,
                values: {
                  hsnCode: '1006',
                  gstPercent: 5,
                  uqcCode: 'KGS',
                  unitLabel: 'kg',
                  uqcQuantityFactor: 1,
                },
                missing: [],
              },
            ],
          };
        else if (path === '/customers' || path === '/customers/search') {
          data = [customer];
          meta.total = 1;
        } else if (path === '/customers/21') data = customer;
        else if (path === '/suppliers') {
          data = [supplier];
          meta.total = 1;
        } else if (path === '/firms') data = { firms: [] };
        else if (path === '/categories') data = [{ id: 1, name: 'Grocery', is_active: true }];
        else if (path === '/invoices') {
          data = [
            {
              id: '41',
              invoice_number: 'QA-INV-1',
              status: 'DRAFT',
              total_amount: 80,
              paid_amount: 0,
              created_at: '2026-11-26T10:00:00Z',
              customer,
            },
          ];
          meta.total = 1;
        } else if (path === '/inventory') {
          data = [
            {
              variant_id: '11',
              quantity: 20,
              physical_quantity: 20,
              saleable_quantity: 20,
              low_stock_threshold: 5,
              is_low_stock: false,
              variant: {
                sku: 'QA-RICE',
                product: { name: 'QA Rice', category: { name: 'Grocery' } },
              },
            },
          ];
          meta.total = 1;
        } else if (path === '/auth/devices') data = [];
        else if (path === '/food-licences') data = { licences: [], max_active: 3 };
        else if (path === '/tenant-settings')
          data = {
            document_mode: 'SIMPLE_RECEIPT',
            settings_version: 1,
            default_paper_width: 'MM80',
            receipt_template: 'CLASSIC',
            brand_color: '#008566',
            capabilities: {
              receipt_documents_enabled: true,
              supported_paper_widths: ['MM80', 'MM58', 'A4'],
            },
          };
        else if (path.includes('settings')) data = {};
        else if (path.includes('quote'))
          data = {
            fingerprint: 'a'.repeat(64),
            document_mode: 'SIMPLE_RECEIPT',
            settings_version: 1,
            subtotal_amount: '80',
            item_discount_amount: '0',
            bill_discount_amount: '0',
            discount_amount: '0',
            taxable_amount: '80',
            cgst_amount: '0',
            sgst_amount: '0',
            igst_amount: '0',
            gst_amount: '0',
            total_amount: '80',
            lines: [],
            margin_preview: { available: false, missingCostItems: 1 },
          };
        else if (path.includes('balance')) data = { balance: 100, credit_balance: 100 };
        else if (path.includes('purchase-cost')) data = [];
        await route.fulfill({
          json: {
            success: true,
            data,
            meta,
            pagination: { total: meta.total, skip: 0, take: 50, page: 1, limit: 50 },
          },
        });
      });
      const go = async (path) => {
        await p.goto('http://127.0.0.1:3012' + path, { waitUntil: 'domcontentloaded' });
        await p
          .locator(
            '.workspace-page h1, .detail-workspace, .billing-layout, .billing-page, .tax-workspace, ion-content input'
          )
          .first()
          .waitFor()
          .catch(() => {});
      };
      const active = async (locator) => {
        await locator.evaluate(
          (n) =>
            new Promise((resolve, reject) => {
              const start = Date.now();
              function check() {
                if (document.activeElement === n) resolve();
                else if (Date.now() - start > 2000)
                  reject(Error('Expected focus on ' + n.outerHTML.slice(0, 120)));
                else setTimeout(check, 20);
              }
              check();
            })
        );
      };
      const modal = () => p.locator('ion-modal.show-modal').last();
      const close = async () => {
        await modal().locator('ion-header ion-button').last().click();
        await p
          .locator('ion-modal.show-modal')
          .waitFor({ state: 'detached' })
          .catch(async () => {
            assert.equal(await p.locator('ion-modal.show-modal').count(), 0);
          });
      };
      const pass = (name) => {
        results.push({ width, name, status: 'passed' });
        fs.writeFileSync(out + '/browser-results.json', JSON.stringify(results, null, 2));
        console.log('PASS', width, name);
      };
      // 1 Billing
      await go('/billing');
      await p.getByRole('button', { name: '+ New bill', exact: true }).waitFor();
      let search = p.locator('ion-searchbar input').first();
      await search.fill('QA');
      await p.locator('#counter-product-0').waitFor();
      await search.press('ArrowDown');
      await search.press('Enter');
      await p.getByText('Cart Items (1)', { exact: true }).waitFor();
      pass('Billing search ArrowDown/Enter adds a product');
      await p.getByRole('button', { name: '+ New bill', exact: true }).click();
      await p.getByRole('button', { name: 'Bill 2', exact: true }).waitFor();
      await p.getByRole('button', { name: '+ New bill', exact: true }).click();
      await p.getByRole('button', { name: 'Bill 3', exact: true }).waitFor();
      await p
        .getByRole('button', { name: '+ New bill', exact: true })
        .waitFor({ state: 'detached' });
      pass('Three-bill limit hides creation action');
      // 2 Customers
      await go('/customers');
      await p
        .getByRole('button', { name: /Add Customer/i })
        .first()
        .waitFor();
      await p
        .getByRole('button', { name: /Add Customer/i })
        .first()
        .click();
      let first = modal().locator('ion-input input').first();
      await first.fill('Cancelled customer');
      await first.press('Enter');
      await active(modal().locator('ion-input input').nth(1));
      await close();
      await p
        .getByRole('button', { name: /Add Customer/i })
        .first()
        .click();
      assert.equal(await modal().locator('ion-input input').first().inputValue(), '');
      await close();
      pass('Customer create Enter and cancelled-draft reset');
      await p.getByRole('combobox', { name: 'Sort by' }).fill('Name');
      await p.getByRole('combobox', { name: 'Sort by' }).press('Enter');
      pass('Customer sort searchable selection');
      // 3 Invoices
      await go('/invoices');
      await p.locator('.workspace-page h1').waitFor();
      assert.match(await p.locator('body').innerText(), /Invoices/);
      await p.getByText('QA-INV-1', { exact: true }).waitFor();
      pass('Invoice list with seeded draft/unpaid bill');
      // 4 Payments
      await go('/payments');
      await p
        .getByRole('button', { name: /Record Payment/i })
        .first()
        .waitFor();
      await p
        .getByRole('button', { name: /Record Payment/i })
        .first()
        .click();
      let customerSearch = modal().locator('ion-input input').first();
      await customerSearch.fill('QA');
      await modal().getByText('QA Customer', { exact: true }).waitFor();
      await customerSearch.press('Enter');
      const amount = modal().locator('ion-input input[type=number]');
      await amount.waitFor();
      await active(amount);
      await amount.fill('50');
      await amount.press('Enter');
      await active(modal().getByRole('combobox', { name: /Payment Mode/i }));
      await modal()
        .getByRole('combobox', { name: /Payment Mode/i })
        .press('Enter');
      await active(modal().locator('ion-input input').last());
      await close();
      await p
        .getByRole('button', { name: /Record Payment/i })
        .first()
        .click();
      assert.equal(await modal().locator('ion-input input').first().inputValue(), '');
      await close();
      pass('Record payment customer Enter, amount/dropdown/reference traversal and reset');
      const productAction = async (name) => {
        if (width < 768) {
          await p.locator('ion-fab-button[aria-label]').first().click();
          await p.locator('ion-action-sheet').getByRole('button', { name }).click();
        } else await p.getByRole('button', { name }).first().click();
      };
      // 5 Products
      await go('/products');
      await productAction(/Add manually/i);
      first = modal().locator('ion-input input').first();
      await first.fill('Cancelled product');
      await first.press('Enter');
      await active(modal().locator('ion-input input').nth(1));
      await close();
      await productAction(/Add manually/i);
      assert.equal(await modal().locator('ion-input input').first().inputValue(), '');
      await close();
      pass('Product create real modal Enter and clean reopening');
      await productAction(/GST.*HSN.*review/i);
      await p.locator('.tax-workspace').waitFor();
      for (const dark of [false, true]) {
        await p.evaluate((dark) => {
          document.body.classList.toggle('dark', dark);
          document.body.classList.toggle('light', !dark);
        }, dark);
        await p.screenshot({
          animations: 'disabled',
          path: `${out}/gst-${width}-${dark ? 'dark' : 'light'}.png`,
        });
        const style = await p
          .locator('.tax-workspace button')
          .first()
          .evaluate((n) => ({
            bg: getComputedStyle(n).backgroundColor,
            fg: getComputedStyle(n).color,
          }));
        assert.notEqual(style.bg, style.fg);
      }
      await p.locator('.tax-workspace header button').click();
      await p.locator('ion-modal.show-modal').waitFor({ state: 'detached' });
      pass('GST/HSN workspace theme and responsive modal');
      // 6 Inventory
      await go('/inventory');
      await p.getByText('QA Rice', { exact: true }).first().waitFor();
      await p.getByRole('button', { name: 'Edit', exact: true }).first().click();
      const stock = modal().locator('ion-input input').first();
      await stock.fill('30');
      await stock.press('Enter');
      await active(modal().locator('ion-input input').nth(1));
      await close();
      await p.getByRole('button', { name: 'Edit', exact: true }).first().click();
      assert.equal(await modal().locator('ion-input input').first().inputValue(), '20');
      await close();
      pass('Inventory editor Enter and cancelled change recovery');
      // 7 Categories
      await go('/categories');
      await p
        .getByRole('button', { name: /Add category/i })
        .first()
        .waitFor();
      await p
        .getByRole('button', { name: /Add category/i })
        .first()
        .click();
      await modal().locator('ion-input input').first().fill('Cancelled category');
      await close();
      await p
        .getByRole('button', { name: /Add category/i })
        .first()
        .click();
      assert.equal(await modal().locator('ion-input input').first().inputValue(), '');
      await close();
      pass('Category create reset');
      // 8 Suppliers
      await go('/suppliers');
      await p
        .getByRole('button', { name: /Add Supplier/i })
        .first()
        .waitFor();
      await p
        .getByRole('button', { name: /Add Supplier/i })
        .first()
        .click();
      first = modal().locator('ion-input input').first();
      await first.fill('Cancelled supplier');
      await first.press('Enter');
      await active(modal().locator('ion-input input').nth(1));
      await close();
      await p
        .getByRole('button', { name: /Add Supplier/i })
        .first()
        .click();
      assert.equal(await modal().locator('ion-input input').first().inputValue(), '');
      await close();
      pass('Supplier create reset and Enter');
      // 9 Purchases
      await go('/purchases/create');
      await p.getByRole('button', { name: 'Select Supplier', exact: true }).waitFor();
      await p.getByRole('button', { name: 'Select Supplier', exact: true }).click();
      search = modal().locator('ion-searchbar input');
      await search.fill('QA');
      await search.press('ArrowDown');
      await search.press('Enter');
      await p.locator('ion-modal.show-modal').waitFor({ state: 'detached' });
      await p.getByRole('button', { name: /QA Supplier/ }).waitFor();
      search = p.locator('ion-searchbar input').first();
      await search.fill(' ');
      await p.getByText('QA Rice', { exact: true }).first().waitFor();
      await search.press('ArrowDown');
      await search.press('Enter');
      await p
        .getByRole('combobox', { name: /Purchase entered as|entered as/i })
        .first()
        .waitFor();
      const native = p.locator('input[type=number][aria-label*="QA Tea"]').first();
      await native.waitFor();
      await native.focus();
      await native.press('Enter');
      assert.notEqual(await native.evaluate((n) => document.activeElement === n), true);
      pass('Purchase supplier keyboard, Space catalogue and native-field Enter');
      await go('/users');
      await p
        .getByRole('button', { name: /Add User/i })
        .first()
        .click();
      await modal().locator('ion-input input').first().fill('Cancelled staff');
      await close();
      await p
        .getByRole('button', { name: /Add User/i })
        .first()
        .click();
      assert.equal(await modal().locator('ion-input input').first().inputValue(), '');
      await close();
      pass('Staff create fresh reopening');
      // Settings separate from profile
      await go('/settings');
      await p.getByRole('tab', { name: 'Business firms', exact: true }).click();
      await p.getByRole('tabpanel', { name: 'Business firms', exact: true }).waitFor();
      await p.screenshot({ animations: 'disabled', path: `${out}/settings-${width}.png` });
      pass('Shop settings discoverable separately');
      await go('/profile');
      await p.locator('input[role=combobox]').first().waitFor();
      for (const [code, label] of [
        ['hi', 'हिंदी'],
        ['mr', 'मराठी'],
        ['gu', 'ગુજરાતી'],
        ['en', 'English'],
      ]) {
        const language = p.locator('input[role=combobox]').first();
        await language.click();
        await language.fill(label);
        await language.press('Enter');
        await p.waitForFunction((code) => localStorage.getItem('i18nextLng') === code, code);
      }
      const theme = p.locator('ion-toggle').first();
      await theme.click();
      await p.waitForFunction(() => document.body.classList.contains('dark'));
      await theme.click();
      await p.waitForFunction(() => document.body.classList.contains('light'));
      pass('All four languages and personal theme controls');
      assert.deepEqual(errors, [], 'No uncaught browser exceptions');
      assert.deepEqual(
        writes.filter((path) => !path.includes('quote')),
        [],
        'No accidental mutations'
      );
      await p.close();
    }
    fs.writeFileSync(out + '/browser-results.json', JSON.stringify(results, null, 2));
  } finally {
    await b.close();
  }
})();
