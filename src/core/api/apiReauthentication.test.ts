// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '@core/auth/authSlice';
import { STORAGE_KEYS } from '@core/constants';
import { apiSlice } from './apiSlice';

const probeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    protectedProbe: builder.query<{ value: number }, number>({
      query: (id) => `/protected/${id}`,
    }),
  }),
});

const response = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('API refresh coordination', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'expired-access');
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'valid-refresh');
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
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes('/auth/refresh-token')) {
          return response({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
        }
        const request = input instanceof Request ? input : null;
        if (request?.headers.get('authorization') === 'Bearer new-access') {
          return response({ data: { value: 1 } });
        }
        return response({ message: 'expired' }, 401);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses one rotating refresh request for concurrent 401 responses and retries both calls', async () => {
    const store = configureStore({
      reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
      middleware: (defaults) => defaults().concat(apiSlice.middleware),
      preloadedState: {
        auth: {
          user: { id: '1', name: 'Owner', email: null, phone: '1', roles: ['OWNER'] },
          accessToken: 'expired-access',
          refreshToken: 'valid-refresh',
          sessionVersion: 1,
          profileUpdateSequence: 0,
          lastAppliedProfileUpdateSequence: 0,
          profileUpdateRequests: {},
        },
      },
    });

    const results = await Promise.allSettled([
      store
        .dispatch(probeApi.endpoints.protectedProbe.initiate(1, { forceRefetch: true }))
        .unwrap(),
      store
        .dispatch(probeApi.endpoints.protectedProbe.initiate(2, { forceRefetch: true }))
        .unwrap(),
    ]);

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled']);
    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)));
    expect(calls.filter((url) => url.includes('/auth/refresh-token'))).toHaveLength(1);
    expect(store.getState().auth.accessToken).toBe('new-access');
  });
});
