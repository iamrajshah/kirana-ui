import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { gstReportExportUrl, gstReportsApi } from './gstReportsApi';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }).concat(
        apiSlice.middleware
      ),
  });

describe('GST report API contract', () => {
  const requests: string[] = [];

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
        requests.push(request.url);
        if (request.url.includes('format=csv')) {
          return new Response('invoiceNumber,invoiceValue\nKJS-1,118\n', {
            headers: { 'content-type': 'text/csv' },
          });
        }
        const base = {
          report: 'GST_REPORT',
          firm: { id: '3', legalName: 'Jitendra Trading', displayName: 'Jitendra Trading' },
          period: { from: '2026-11-01', to: '2026-11-04' },
          disclaimer: 'Preparation aid only.',
          warnings: [],
        };
        const data = request.url.includes('/summary')
          ? {
              ...base,
              outward: { taxableValue: 100, cgst: 9, sgst: 9, igst: 0, totalTax: 18 },
              inward: { taxableValue: 40, invoiceValue: 47.2 },
              inputTaxCredit: { cgst: 3.6, sgst: 3.6, igst: 0, total: 7.2 },
              estimatedNetLiability: { cgst: 5.4, sgst: 5.4, igst: 0, total: 10.8 },
            }
          : request.url.includes('/sales-register')
            ? {
                ...base,
                rows: [
                  {
                    invoiceDate: '2026-11-03',
                    invoiceNumber: 'KJS-1',
                    customerName: 'Walk-in customer',
                    customerGstin: '',
                    placeOfSupplyCode: '27',
                    taxableValue: 100,
                    cgst: 9,
                    sgst: 9,
                    igst: 0,
                    invoiceValue: 118,
                    status: 'PAID',
                  },
                ],
              }
            : request.url.includes('/purchase-register')
              ? {
                  ...base,
                  rows: [
                    {
                      invoiceDate: '2026-11-02',
                      invoiceNumber: 'SUP-1',
                      supplierName: 'Gemini Oils',
                      supplierGstin: '',
                      taxableValue: 40,
                      inputCgst: 3.6,
                      inputSgst: 3.6,
                      inputIgst: 0,
                      invoiceValue: 47.2,
                      status: 'PAID',
                      taxSnapshotComplete: true,
                    },
                  ],
                }
              : {
                  ...base,
                  rows: [
                    {
                      supplyCategory: 'B2B',
                      hsnCode: '1512',
                      uqcCode: 'LTR',
                      gstRate: 5,
                      totalQuantity: 2,
                      taxableValue: 100,
                      cgst: 2.5,
                      sgst: 2.5,
                      igst: 0,
                      totalTax: 5,
                    },
                  ],
                  purchaseAnalysis: [
                    {
                      hsnCode: '1512',
                      uqcCode: 'LTR',
                      gstRate: 5,
                      totalQuantity: 1,
                      taxableValue: 40,
                      inputCgst: 1,
                      inputSgst: 1,
                      inputIgst: 0,
                      eligibleInputTax: 2,
                      ineligibleInputTax: 0,
                    },
                  ],
                };
        return Response.json({ success: true, data });
      })
    );
  });

  afterEach(() => {
    requests.length = 0;
    vi.unstubAllGlobals();
  });

  it('sends an explicit firm and consumes the exact summary and row envelopes', async () => {
    const store = createStore();
    const params = { from: '2026-11-01', to: '2026-11-04', firmId: '3' };
    const summary = await store
      .dispatch(gstReportsApi.endpoints.getGstSummary.initiate(params))
      .unwrap();
    const sales = await store
      .dispatch(gstReportsApi.endpoints.getGstSalesRegister.initiate(params))
      .unwrap();
    const purchases = await store
      .dispatch(gstReportsApi.endpoints.getGstPurchaseRegister.initiate(params))
      .unwrap();
    const hsn = await store
      .dispatch(gstReportsApi.endpoints.getGstHsnSummary.initiate(params))
      .unwrap();

    expect(requests).toHaveLength(4);
    requests.forEach((url) => {
      expect(url).toContain('firmId=3');
      expect(url).not.toContain('scope=');
    });
    expect(summary.data.estimatedNetLiability.total).toBe(10.8);
    expect(sales.data.rows[0].customerName).toBe('Walk-in customer');
    expect(purchases.data.rows[0].inputCgst).toBe(3.6);
    expect(hsn.data.rows[0]).toMatchObject({ supplyCategory: 'B2B', totalTax: 5 });
    expect(hsn.data.purchaseAnalysis[0].eligibleInputTax).toBe(2);
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('downloads each CA handoff through the authenticated API contract', async () => {
    const store = createStore();
    const params = { from: '2026-11-01', to: '2026-11-04', firmId: '3' };
    for (const report of [
      'summary',
      'sales-register',
      'purchase-register',
      'hsn-summary',
    ] as const) {
      await store
        .dispatch(gstReportsApi.endpoints.downloadGstReport.initiate({ report, params }))
        .unwrap();
    }
    expect(requests).toHaveLength(4);
    expect(requests.every((url) => url.includes('format=csv') && url.includes('firmId=3'))).toBe(
      true
    );
    expect(gstReportExportUrl('summary', params)).toContain('/reports/gst/summary?');
    store.dispatch(apiSlice.util.resetApiState());
  });
});
