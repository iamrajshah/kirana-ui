import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import authReducer from '@core/auth/authSlice';
import { apiSlice } from './apiSlice';
const probe = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    deviceWriteProbe: builder.mutation<unknown, void>({
      query: () => ({ url: '/purchases', method: 'POST', body: { items: [] } }),
    }),
    deviceReadProbe: builder.query<unknown, void>({ query: () => '/purchases' }),
  }),
});
const sessionContext = (version: string) => ({
  identity: {
    id: '1',
    email: 'owner@example.test',
    displayName: 'Owner',
    status: 'ACTIVE',
    accessStateVersion: 1,
  },
  memberships: [],
  selected: { userId: '1', tenantId: '1' },
  commercialAccess: {
    planCode: 'BUSINESS',
    state: 'ACTIVE',
    accessStateVersion: version,
    entitlements: ['PURCHASES'],
    deviceProfile: 'MOBILE' as const,
    deviceAccess: {
      revision: 2,
      profiles: {
        MOBILE: { PURCHASES: 'READ_ONLY' as const },
        TABLET: { PURCHASES: 'FULL' as const },
        WEB: { PURCHASES: 'FULL' as const },
      },
    },
    limits: { staff: 5, firms: 3 },
    demoExpiresAt: null,
    endsAt: null,
    graceExpiresAt: null,
  },
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
  vi.restoreAllMocks();
  localStorage.clear();
});
it('rejects a read-only financial mutation before any request leaves the POS', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const store = createStore();
  const result = await store.dispatch(probe.endpoints.deviceWriteProbe.initiate());
  expect(result).toMatchObject({
    error: {
      status: 403,
      data: { commercial: { code: 'COMMERCIAL_DEVICE_DENIED', feature: 'PURCHASES' } },
    },
  });
  expect(fetchMock).not.toHaveBeenCalled();
  store.dispatch(apiSlice.util.resetApiState());
});
it('allows a view-only read with the device profile header', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: [] }), {
      headers: { 'content-type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fetchMock);
  const store = createStore();
  const result = await store.dispatch(probe.endpoints.deviceReadProbe.initiate());
  expect(result).not.toHaveProperty('error');
  expect(fetchMock).toHaveBeenCalledOnce();
  const request = fetchMock.mock.calls[0][0] as Request;
  expect(request.headers.get('x-pos-device-profile')).toBeTruthy();
  store.dispatch(apiSlice.util.resetApiState());
});
