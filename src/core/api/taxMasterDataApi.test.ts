import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { customerApi } from './customerApi';
import { productApi } from './productApi';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });

describe('tax master-data API contracts', () => {
  const requests: Array<{ url: string; method: string; body: unknown }> = [];

  beforeEach(() => {
    requests.length = 0;
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
          body: await request.clone().json(),
        });
        return Response.json({ success: true, data: { id: '1' } });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends optional customer GST and address facts without changing the minimal fields', async () => {
    const store = createStore();
    await store
      .dispatch(
        customerApi.endpoints.createCustomer.initiate({
          name: 'Asha Stores',
          phone: '9876543210',
          gstin: '27ABCDE1234F1Z5',
          state_code: '27',
          address_line1: 'Main Road',
        })
      )
      .unwrap();

    expect(requests[0]).toMatchObject({
      method: 'POST',
      body: expect.objectContaining({
        name: 'Asha Stores',
        phone: '9876543210',
        gstin: '27ABCDE1234F1Z5',
        state_code: '27',
      }),
    });
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('sends HSN on the product and GST/UQC facts on its variant', async () => {
    const store = createStore();
    await store
      .dispatch(
        productApi.endpoints.createProduct.initiate({
          name: 'Loose Rice',
          hsn_code: '100630',
        })
      )
      .unwrap();
    await store
      .dispatch(
        productApi.endpoints.createVariant.initiate({
          productId: '1',
          variant: {
            price: 72,
            gst_percent: 5,
            uqc_code: 'KGS',
            unit_label: 'kg',
          },
        })
      )
      .unwrap();

    expect(requests[0].body).toEqual({ name: 'Loose Rice', hsn_code: '100630' });
    expect(requests[1]).toMatchObject({
      url: expect.stringContaining('/products/1/variants'),
      body: { price: 72, gst_percent: 5, uqc_code: 'KGS', unit_label: 'kg' },
    });
    store.dispatch(apiSlice.util.resetApiState());
  });
});
