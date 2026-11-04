import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { buildPurchaseImportFormData, purchaseImportApi } from './purchaseImportApi';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }).concat(
        apiSlice.middleware
      ),
  });

describe('purchase import client/server contract', () => {
  const requests: Request[] = [];

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
        requests.push(request.clone());
        return Response.json({
          success: true,
          data: request.url.includes('/extract')
            ? { draftId: 'draft-1', status: 'READY', items: [], warnings: [] }
            : { draftId: 'draft-1', status: 'CONFIRMED', purchase: { id: '55' } },
        });
      })
    );
  });

  afterEach(() => {
    requests.length = 0;
    vi.unstubAllGlobals();
  });

  it('sends local OCR confidence as 0..1 multipart data', () => {
    const document = new File(['clear supplier bill'], 'bill.jpg', { type: 'image/jpeg' });
    const form = buildPurchaseImportFormData({
      document,
      extractedText: 'Gemini Oil 2 boxes at 1400 each',
      extractionSource: 'CLIENT_EXTRACTED_TEXT',
      ocrConfidence: 0.88,
    });
    expect(form.get('extractionSource')).toBe('CLIENT_EXTRACTED_TEXT');
    expect(form.get('ocrConfidence')).toBe('0.88');
    expect(Number(form.get('ocrConfidence'))).toBeGreaterThanOrEqual(0);
    expect(Number(form.get('ocrConfidence'))).toBeLessThanOrEqual(1);
  });

  it('sends reviewed tax, pack and mismatch fields and consumes purchase.id', async () => {
    const store = createStore();
    const response = await store
      .dispatch(
        purchaseImportApi.endpoints.confirmPurchaseImport.initiate({
          draftId: 'draft-1',
          supplier_id: 7,
          firm_id: 3,
          invoice_number: 'GEM-44',
          invoice_date: '2026-11-04',
          prices_include_tax: true,
          acknowledge_total_mismatch: true,
          items: [
            {
              variant_id: 19,
              quantity: 2,
              unit_price: 1400,
              gst_rate: 5,
              units_per_purchase_unit: 20,
              purchase_unit_label: 'Box',
            },
          ],
        })
      )
      .unwrap();

    expect(await requests[0].json()).toEqual(
      expect.objectContaining({
        prices_include_tax: true,
        acknowledge_total_mismatch: true,
        items: [
          expect.objectContaining({
            gst_rate: 5,
            units_per_purchase_unit: 20,
            purchase_unit_label: 'Box',
          }),
        ],
      })
    );
    expect(response.data.purchase.id).toBe('55');
    store.dispatch(apiSlice.util.resetApiState());
  });
});
