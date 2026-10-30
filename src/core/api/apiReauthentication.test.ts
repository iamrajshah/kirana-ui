// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer, { logout, setCredentials } from '@core/auth/authSlice';
import { STORAGE_KEYS } from '@core/constants';
import { notificationService } from '@core/services/notificationService';
import { authApi } from './authApi';
import { apiSlice } from './apiSlice';

const probeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    protectedProbe: builder.query<{ value: number }, number>({
      query: (id) => `/protected/${id}`,
    }),
    dashboardProbe: builder.query<{ value: number }, void>({
      query: () => '/dashboard-probe',
      providesTags: ['Dashboard'],
    }),
  }),
});

const response = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const commercialAccess = (version = 'new-version') => ({
  planCode: 'PRO',
  state: 'ACTIVE',
  accessStateVersion: version,
  entitlements: ['CORE_POS'],
  limits: { staff: 7, firms: 1 },
  demoExpiresAt: null,
  endsAt: null,
  graceExpiresAt: null,
});

const sessionContext = (version = 'new-version') => ({
  identity: {
    id: 'identity-1',
    email: 'owner@example.com',
    displayName: 'Owner',
    status: 'ACTIVE',
    accessStateVersion: 2,
  },
  memberships: [],
  selected: { userId: '1', tenantId: 'tenant-1' },
  commercialAccess: commercialAccess(version),
  provisioning: { state: 'READY' },
});

const createStore = () =>
  configureStore({
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
        sessionContext: sessionContext('old-version'),
      },
    },
  });

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
        if (url.includes('/auth/session-context')) {
          return response({ data: sessionContext() });
        }
        if (url.includes('/subscription/access')) {
          return response({ data: commercialAccess() });
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses one rotating refresh request for concurrent 401 responses and retries both calls', async () => {
    const store = createStore();

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
    await vi.waitFor(() => {
      expect(store.getState().auth.sessionContext?.commercialAccess).toMatchObject({
        accessStateVersion: 'new-version',
      });
    });
    expect(calls.filter((url) => url.includes('/auth/session-context'))).toHaveLength(1);
    expect(calls.filter((url) => url.includes('/subscription/access'))).toHaveLength(1);
  });

  it('leaves public authentication 401 responses to the login surface', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      response({ message: 'Invalid Google credential' }, 401)
    );
    const notify = vi.spyOn(notificationService, 'error');
    const store = createStore();
    const device = { installationId: 'install-1', platform: 'WEB' as const, name: 'Web · Test' };

    await expect(
      store
        .dispatch(
          authApi.endpoints.login.initiate({
            email: 'owner@example.com',
            password: 'wrong',
            device,
          })
        )
        .unwrap()
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      store
        .dispatch(
          authApi.endpoints.googleExchange.initiate({
            credential: 'invalid',
            source: 'web',
            device,
          })
        )
        .unwrap()
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      store
        .dispatch(
          authApi.endpoints.selectMembership.initiate({
            credential: 'invalid',
            source: 'web',
            userId: '1',
            device,
          })
        )
        .unwrap()
    ).rejects.toMatchObject({ status: 401 });

    let calls = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)));
    expect(calls.filter((url) => url.includes('/auth/refresh-token'))).toHaveLength(0);
    expect(store.getState().auth.user?.id).toBe('1');
    expect(store.getState().auth.accessToken).toBe('expired-access');
    expect(notify).not.toHaveBeenCalled();

    await expect(
      store
        .dispatch(
          authApi.endpoints.refreshToken.initiate({ refresh_token: 'invalid-refresh', device })
        )
        .unwrap()
    ).rejects.toMatchObject({ status: 401 });
    calls = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)));
    expect(calls.filter((url) => url.includes('/auth/refresh-token'))).toHaveLength(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it('leaves non-401 public authentication failures to the login surface', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes('/auth/login')) {
        return response({ message: 'Device limit reached' }, 409);
      }
      if (url.includes('/auth/google/exchange')) {
        return response({ message: 'Google sign-in is temporarily unavailable' }, 503);
      }
      return response({ message: 'unexpected request' }, 500);
    });
    const notify = vi.spyOn(notificationService, 'error');
    const store = createStore();
    const device = { installationId: 'install-1', platform: 'WEB' as const, name: 'Web · Test' };

    await expect(
      store
        .dispatch(
          authApi.endpoints.login.initiate({
            email: 'owner@example.com',
            password: 'wrong',
            device,
          })
        )
        .unwrap()
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      store
        .dispatch(
          authApi.endpoints.googleExchange.initiate({
            credential: 'invalid',
            source: 'web',
            device,
          })
        )
        .unwrap()
    ).rejects.toMatchObject({ status: 503 });

    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)));
    expect(calls.filter((url) => url.includes('/auth/refresh-token'))).toHaveLength(0);
    expect(store.getState().auth.user?.id).toBe('1');
    expect(store.getState().auth.accessToken).toBe('expired-access');
    expect(notify).not.toHaveBeenCalled();
  });

  it('still reports non-401 failures from protected endpoints globally', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      response({ message: 'Service temporarily unavailable' }, 503)
    );
    const notify = vi.spyOn(notificationService, 'error');
    const store = createStore();

    await expect(
      store
        .dispatch(probeApi.endpoints.protectedProbe.initiate(10, { forceRefetch: true }))
        .unwrap()
    ).rejects.toMatchObject({ status: 503 });

    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith('Service temporarily unavailable');
  });

  it('invalidates tenant caches when a token refresh discovers a new access version', async () => {
    let dashboardCalls = 0;
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes('/dashboard-probe')) {
        dashboardCalls += 1;
        return response({ data: { value: dashboardCalls } });
      }
      if (url.includes('/auth/refresh-token')) {
        return response({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
      }
      if (url.includes('/auth/session-context')) return response({ data: sessionContext() });
      if (url.includes('/subscription/access')) return response({ data: commercialAccess() });
      const request = input instanceof Request ? input : null;
      return request?.headers.get('authorization') === 'Bearer new-access'
        ? response({ data: { value: 1 } })
        : response({ message: 'expired' }, 401);
    });
    const store = createStore();
    const dashboardSubscription = store.dispatch(probeApi.endpoints.dashboardProbe.initiate());
    await dashboardSubscription.unwrap();

    await store
      .dispatch(probeApi.endpoints.protectedProbe.initiate(9, { forceRefetch: true }))
      .unwrap();

    await vi.waitFor(() =>
      expect(probeApi.endpoints.dashboardProbe.select()(store.getState()).data).toEqual({
        data: { value: 2 },
      })
    );
    dashboardSubscription.unsubscribe();
  });

  it('retries the original request without waiting for optional context reads', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes('/auth/refresh-token')) {
        return response({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
      }
      if (url.includes('/auth/session-context') || url.includes('/subscription/access')) {
        return new Promise<Response>(() => undefined);
      }
      const request = input instanceof Request ? input : null;
      return request?.headers.get('authorization') === 'Bearer new-access'
        ? response({ data: { value: 1 } })
        : response({ message: 'expired' }, 401);
    });
    const store = createStore();

    await expect(
      store.dispatch(probeApi.endpoints.protectedProbe.initiate(3, { forceRefetch: true })).unwrap()
    ).resolves.toEqual({ data: { value: 1 } });
  });

  it('does not let a delayed refresh overwrite a replacement login', async () => {
    let resolveRefresh!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes('/auth/refresh-token')) {
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      }
      return response({ message: 'expired' }, 401);
    });
    const store = createStore();
    const pending = store.dispatch(
      probeApi.endpoints.protectedProbe.initiate(4, { forceRefetch: true })
    );
    await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf('function'));

    store.dispatch(logout());
    store.dispatch(
      setCredentials({
        user: { id: '2', name: 'Next Owner', email: null, phone: '2', roles: ['OWNER'] },
        tenant: { id: 'tenant-2', name: 'Next Shop', status: 'ACTIVE' },
        tokens: { accessToken: 'next-access', refreshToken: 'next-refresh' },
      })
    );
    resolveRefresh(
      response({ data: { accessToken: 'stale-access', refreshToken: 'stale-refresh' } })
    );
    await expect(pending.unwrap()).rejects.toMatchObject({ status: 401 });

    expect(store.getState().auth.user?.id).toBe('2');
    expect(store.getState().auth.accessToken).toBe('next-access');
    expect(store.getState().auth.refreshToken).toBe('next-refresh');
  });
});
