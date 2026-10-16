import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { invoiceApi } from './invoiceApi';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });

describe('invoice document API contract', () => {
  beforeEach(() => {
    const NativeRequest = Request;
    vi.stubGlobal(
      'Request',
      class extends NativeRequest {
        constructor(input: RequestInfo | URL, init?: RequestInit) {
          super(input, init ? { ...init, signal: undefined } : init);
        }
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('quotes the bill, finalizes with its fingerprint, and reads the dedicated document', async () => {
    const requests: Array<{ url: string; method: string; body?: unknown }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        requests.push({
          url: request.url,
          method: request.method,
          body: request.method === 'GET' ? undefined : await request.clone().json(),
        });
        return Response.json({ success: true, data: { id: '42' } });
      })
    );
    const store = createStore();
    const fingerprint = 'a'.repeat(64);

    await store.dispatch(
      invoiceApi.endpoints.quoteInvoice.initiate({
        customer_id: '7',
        place_of_supply_code: '27',
        discount_amount: 5,
        items: [{ variant_id: '9', quantity: 2, price: 50 }],
      })
    );
    await store.dispatch(
      invoiceApi.endpoints.finalizeInvoice.initiate({
        id: '42',
        expected_version: 3,
        place_of_supply_code: '27',
        quote_fingerprint: fingerprint,
        quoted_payable: '95.00',
      })
    );
    await store.dispatch(invoiceApi.endpoints.getFinalizedDocument.initiate('42'));

    expect(requests).toEqual([
      expect.objectContaining({
        url: expect.stringContaining('/invoices/quote'),
        method: 'POST',
        body: {
          customer_id: '7',
          place_of_supply_code: '27',
          discount_amount: 5,
          items: [{ variant_id: '9', quantity: 2, price: 50 }],
        },
      }),
      expect.objectContaining({
        url: expect.stringContaining('/invoices/42/finalize'),
        method: 'POST',
        body: {
          expected_version: 3,
          place_of_supply_code: '27',
          quote_fingerprint: fingerprint,
          quoted_payable: '95.00',
        },
      }),
      expect.objectContaining({
        url: expect.stringContaining('/invoices/42/document'),
        method: 'GET',
      }),
    ]);
    store.dispatch(apiSlice.util.resetApiState());
  });
});
