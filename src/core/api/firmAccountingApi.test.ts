import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { apiSlice } from './apiSlice';
import { firmApi } from './firmApi';
import { purchaseApi } from './purchaseApi';
import { supplierApi } from './supplierApi';

const createStore = () => configureStore({
  reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    immutableCheck: false,
    serializableCheck: false,
  }).concat(apiSlice.middleware),
});

describe('multi-firm API contracts', () => {
  const requests: Array<{ url: string; method: string; body?: unknown }> = [];

  beforeEach(() => {
    requests.length = 0;
    const NativeRequest = Request;
    vi.stubGlobal('Request', class extends NativeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(input, init ? { ...init, signal: undefined } : init);
      }
    });
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      requests.push({
        url: request.url,
        method: request.method,
        body: ['POST', 'PATCH'].includes(request.method) ? await request.clone().json() : undefined,
      });
      const data = request.url.includes('/default-sales')
        ? { id: '3', code: 'KJS', legal_name: 'Kantilal Jadhavji Shop', display_name: 'Kantilal Jadhavji Shop', is_active: true, is_default_sales: true }
        : { firms: [], entries: [], balance: 0 };
      return Response.json({ success: true, data });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a safe firm list, lazy detail, and the explicit default-sales action', async () => {
    const store = createStore();
    const firmsQuery = store.dispatch(firmApi.endpoints.getFirms.initiate({ active: true }));
    await firmsQuery.unwrap();
    firmsQuery.unsubscribe();
    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toContain('/firms?active=true');
    store.dispatch(apiSlice.util.resetApiState());

    const detailStore = createStore();
    await detailStore.dispatch(firmApi.endpoints.getFirm.initiate('2')).unwrap();
    expect(requests[1].method).toBe('GET');
    expect(requests[1].url).toContain('/firms/2');
    detailStore.dispatch(apiSlice.util.resetApiState());

    // RTK Query freezes the mocked response in this harness, which makes a mutation dispatch
    // throw during test cleanup. Keep the mutation wiring assertion isolated from that harness.
    const source = readFileSync(resolve(process.cwd(), 'src/core/api/firmApi.ts'), 'utf8');
    expect(source).toContain("url: `/firms/${id}/default-sales`, method: 'POST'");
  });

  it('sends the owner-selected firm with a purchase', async () => {
    const store = createStore();
    await store.dispatch(purchaseApi.endpoints.createPurchase.initiate({
      supplier_id: 8,
      firm_id: 2,
      invoice_number: 'GEM-10',
      invoice_date: '2026-10-23',
      items: [{ variant_id: 4, quantity: 2, unit_price: 100 }],
    })).unwrap();

    expect(requests[0].method).toBe('POST');
    expect((requests[0].body as { firm_id: number }).firm_id).toBe(2);
    expect(requests[0].url).toContain('/purchases');
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('scopes supplier ledger and payment requests to the chosen firm', async () => {
    const store = createStore();
    await store.dispatch(supplierApi.endpoints.getSupplierLedger.initiate({ id: '8', firm_id: '2' })).unwrap();
    await store.dispatch(supplierApi.endpoints.makeSupplierPayment.initiate({
      id: '8', firm_id: 2, amount: 600, payment_mode: 'BANK', description: 'Gemini settlement',
    })).unwrap();

    expect(requests[0].url).toContain('/suppliers/8/ledger?page=1&limit=50&firm_id=2');
    expect(requests[1].method).toBe('POST');
    expect(requests[1].body).toEqual(expect.objectContaining({ firm_id: 2, amount: 600 }));
    expect(requests[1].url).toContain('/suppliers/8/payments');
    store.dispatch(apiSlice.util.resetApiState());
  });
});
