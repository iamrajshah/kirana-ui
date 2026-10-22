import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from './apiSlice';
import { productApi } from './productApi';
import { notificationService, type ToastMessage } from '../services/notificationService';

const createStore = () =>
  configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });

describe('background API prefetch', () => {
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

  it('does not show a global error toast when catalog cache warming fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: false, message: 'Server unavailable' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
      )
    );
    const store = createStore();
    const notifications: ToastMessage[] = [];
    const unsubscribe = notificationService.subscribe((message) => notifications.push(message));

    const request = store.dispatch(
      productApi.endpoints.getBillingCatalog.initiate(
        { suppressErrorToast: true },
        {
          subscribe: false,
        }
      )
    );
    await request;

    expect(notifications).toEqual([]);
    unsubscribe();
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('keeps the global error toast for a foreground catalog request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: false, message: 'Server unavailable' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
      )
    );
    const store = createStore();
    const notifications: ToastMessage[] = [];
    const unsubscribe = notificationService.subscribe((message) => notifications.push(message));

    await store
      .dispatch(productApi.endpoints.getBillingCatalog.initiate())
      .unwrap()
      .catch(() => {});

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: 'error',
      message: 'Server error. Please try again later.',
    });
    unsubscribe();
    store.dispatch(apiSlice.util.resetApiState());
  });
});
