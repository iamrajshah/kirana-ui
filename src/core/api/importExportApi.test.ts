import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { createImportFormData, importExportApi } from './importExportApi';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });

describe('Import/Export API contract', () => {
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
    Reflect.deleteProperty(URL, 'createObjectURL');
  });

  it('uploads the singular type field expected by the server', () => {
    const formData = createImportFormData(
      new File(['name,phone'], 'customers.csv', { type: 'text/csv' }),
      'CUSTOMER'
    );

    expect(formData.get('type')).toBe('CUSTOMER');
    expect(formData.get('importType')).toBeNull();
  });

  it('requests category exports through the authenticated API layer', async () => {
    let requestedUrl = '';
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:category-export'),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        requestedUrl = request.url;
        return new Response('name\nGrocery\n', {
          headers: { 'content-type': 'text/csv' },
        });
      })
    );
    const store = createStore();

    const downloadUrl = await store
      .dispatch(
        importExportApi.endpoints.exportData.initiate({ type: 'categories', format: 'CSV' })
      )
      .unwrap();

    expect(requestedUrl).toContain('/import/export/categories?format=CSV');
    expect(downloadUrl).toBe('blob:category-export');
    store.dispatch(apiSlice.util.resetApiState());
  });
});
