import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { createBackupFormData, tenantBackupApi } from './tenantBackupApi';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });

describe('Tenant backup API contract', () => {
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

  it('adds the backup and exact confirmation to restore form data', () => {
    const file = new File(['{}'], 'kirana-backup.json', { type: 'application/json' });
    const body = createBackupFormData(file, 'Kirana Demo Store');

    expect(body.get('file')).toBe(file);
    expect(body.get('confirmation')).toBe('Kirana Demo Store');
  });

  it('previews through the owner backup endpoint', async () => {
    let requestedUrl = '';
    let requestedMethod = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        requestedUrl = request.url;
        requestedMethod = request.method;
        return Response.json({
          success: true,
          data: {
            tenantName: 'Kirana Demo Store',
            createdAt: '2026-10-15T10:00:00.000Z',
            counts: {},
            totalRecords: 0,
            excludes: [],
            warnings: [],
          },
        });
      })
    );
    const store = createStore();

    const result = await store
      .dispatch(
        tenantBackupApi.endpoints.previewTenantBackup.initiate(
          new File(['{}'], 'kirana-backup.json', { type: 'application/json' })
        )
      )
      .unwrap();

    expect(requestedUrl).toContain('/tenant-backup/preview');
    expect(requestedMethod).toBe('POST');
    expect(result.data.tenantName).toBe('Kirana Demo Store');
    store.dispatch(apiSlice.util.resetApiState());
  });
});
