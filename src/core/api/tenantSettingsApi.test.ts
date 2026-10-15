import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { tenantSettingsApi } from './tenantSettingsApi';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });

describe('tenant settings API contract', () => {
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

  it('reads and updates the tenant document profile through its dedicated endpoint', async () => {
    const requests: Array<{ url: string; method: string; body?: unknown }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        requests.push({
          url: request.url,
          method: request.method,
          body: request.method === 'PATCH' ? await request.clone().json() : undefined,
        });
        return Response.json({
          success: true,
          data: {
            id: null,
            tenant_id: '1',
            document_mode: 'SIMPLE_RECEIPT',
            default_paper_width: 'MM58',
            settings_version: 0,
            capabilities: {
              receipt_documents_enabled: true,
              supported_paper_widths: ['MM58', 'MM80'],
              per_print_override: true,
            },
          },
        });
      })
    );
    const store = createStore();

    await store.dispatch(tenantSettingsApi.endpoints.getTenantSettings.initiate()).unwrap();
    await store
      .dispatch(
        tenantSettingsApi.endpoints.updateTenantSettings.initiate({
          document_mode: 'SIMPLE_RECEIPT',
          footer: 'Thank you',
          default_paper_width: 'MM58',
        })
      )
      .unwrap();

    expect(requests[0]).toMatchObject({ method: 'GET' });
    expect(requests[0].url).toContain('/tenant-settings');
    expect(requests[1]).toMatchObject({
      method: 'PATCH',
      body: {
        document_mode: 'SIMPLE_RECEIPT',
        footer: 'Thank you',
        default_paper_width: 'MM58',
      },
    });
    store.dispatch(apiSlice.util.resetApiState());
  });
});
