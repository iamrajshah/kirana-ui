// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '@core/auth/authSlice';
import { STORAGE_KEYS } from '@core/constants';
import { apiSlice } from './apiSlice';
import { lifecycleApi } from './lifecycleApi';
import { notificationService, type ToastMessage } from '../services/notificationService';

const tenantProbeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    tenantProbe: builder.query<{ tenant: string }, void>({
      query: () => '/tenant-probe',
      providesTags: ['Dashboard'],
    }),
  }),
});

const response = (body: object) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });

const createStore = () =>
  configureStore({
    reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (defaults) => defaults().concat(apiSlice.middleware),
    preloadedState: {
      auth: {
        user: {
          id: 'user-a',
          name: 'Owner A',
          email: null,
          phone: '1',
          roles: ['OWNER'],
          tenant: { id: 'tenant-a', name: 'Shop A', status: 'ACTIVE' },
        },
        accessToken: 'access-a',
        refreshToken: 'refresh-a',
        sessionVersion: 1,
        profileUpdateSequence: 0,
        lastAppliedProfileUpdateSequence: 0,
        profileUpdateRequests: {},
      },
    },
  });

describe('account membership selection', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'access-a');
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-a');
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

  it('clears cached tenant data when credentials move to another membership', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes('/auth/membership/select')) {
          return response({
            data: {
              user: {
                id: 'user-b',
                name: 'Owner B',
                email: null,
                phone: '2',
                roles: ['OWNER'],
              },
              tenant: { id: 'tenant-b', name: 'Shop B', status: 'ACTIVE' },
              tokens: { accessToken: 'access-b', refreshToken: 'refresh-b' },
            },
          });
        }
        return response({ data: { tenant: 'tenant-a' } });
      })
    );
    const store = createStore();
    await store.dispatch(tenantProbeApi.endpoints.tenantProbe.initiate()).unwrap();
    expect(tenantProbeApi.endpoints.tenantProbe.select()(store.getState()).data).toEqual({
      data: { tenant: 'tenant-a' },
    });

    await store
      .dispatch(lifecycleApi.endpoints.selectAccountMembership.initiate({ userId: 'user-b' }))
      .unwrap();

    expect(store.getState().auth.user?.tenant?.id).toBe('tenant-b');
    expect(tenantProbeApi.endpoints.tenantProbe.select()(store.getState()).status).toBe(
      'uninitialized'
    );
  });

  it('does not restore a previous tenant response that finishes after the switch', async () => {
    let resolveTenantA!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes('/auth/membership/select')) {
          return response({
            data: {
              user: {
                id: 'user-b',
                name: 'Owner B',
                email: null,
                phone: '2',
                roles: ['OWNER'],
              },
              tenant: { id: 'tenant-b', name: 'Shop B', status: 'ACTIVE' },
              tokens: { accessToken: 'access-b', refreshToken: 'refresh-b' },
            },
          });
        }
        return new Promise<Response>((resolve) => {
          resolveTenantA = resolve;
        });
      })
    );
    const store = createStore();
    const pendingTenantA = store.dispatch(
      tenantProbeApi.endpoints.tenantProbe.initiate(undefined, { forceRefetch: true })
    );
    await vi.waitFor(() => expect(resolveTenantA).toBeTypeOf('function'));

    await store
      .dispatch(lifecycleApi.endpoints.selectAccountMembership.initiate({ userId: 'user-b' }))
      .unwrap();
    resolveTenantA(response({ data: { tenant: 'tenant-a' } }));
    await expect(pendingTenantA.unwrap()).resolves.toBeUndefined();

    expect(store.getState().auth.user?.tenant?.id).toBe('tenant-b');
    expect(tenantProbeApi.endpoints.tenantProbe.select()(store.getState()).data).toBeUndefined();
  });
});

describe('public product recovery', () => {
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

  it('lets the login screen recover inline without also showing a global error toast', async () => {
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

    await store.dispatch(
      lifecycleApi.endpoints.getPublicProduct.initiate(
        { suppressErrorToast: true },
        { subscribe: false }
      )
    );

    expect(notifications).toEqual([]);
    unsubscribe();
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('keeps the global error toast for public product consumers without inline recovery', async () => {
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

    await store.dispatch(lifecycleApi.endpoints.getPublicProduct.initiate());

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: 'error',
      message: 'Server error. Please try again later.',
    });
    unsubscribe();
    store.dispatch(apiSlice.util.resetApiState());
  });
});
