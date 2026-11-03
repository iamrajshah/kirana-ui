import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { productApi } from './productApi';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }).concat(
        apiSlice.middleware
      ),
  });

describe('product purchase-cost API contracts', () => {
  const requests: Array<{ url: string; method: string; body?: unknown }> = [];

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
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        requests.push({
          url: request.url,
          method: request.method,
          body: request.method === 'PATCH' ? await request.clone().json() : undefined,
        });
        const data =
          request.method === 'GET'
            ? [
                {
                  variant_id: '8',
                  purchase_price: 92,
                  source: 'PURCHASE',
                  updated_at: null,
                  note: null,
                },
              ]
            : {
                variant_id: '8',
                purchase_price: 90,
                source: 'MANUAL_CORRECTION',
                updated_at: null,
                note: 'Invoice correction',
              };
        return Response.json({ success: true, data });
      })
    );
  });

  afterEach(() => {
    requests.length = 0;
    vi.unstubAllGlobals();
  });

  it('loads protected cost snapshots separately from the ordinary product response', async () => {
    const store = createStore();
    await store.dispatch(productApi.endpoints.getProductPurchaseCosts.initiate('3')).unwrap();

    expect(requests[0]).toMatchObject({ method: 'GET' });
    expect(requests[0].url).toContain('/products/3/purchase-costs');
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('sends an audited manual cost correction', async () => {
    const store = createStore();
    await store
      .dispatch(
        productApi.endpoints.updateVariantPurchaseCost.initiate({
          id: '8',
          purchase_price: 90,
          source: 'MANUAL_CORRECTION',
          reason: 'Invoice correction',
        })
      )
      .unwrap();

    expect(requests[0]).toMatchObject({
      method: 'PATCH',
      body: {
        purchase_price: 90,
        source: 'MANUAL_CORRECTION',
        reason: 'Invoice correction',
      },
    });
    expect(requests[0].url).toContain('/variants/8/purchase-cost');
    store.dispatch(apiSlice.util.resetApiState());
  });
});
