// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '@core/auth/authSlice';
import { STORAGE_KEYS } from '@core/constants';
import { notificationService, type ToastMessage } from '../services/notificationService';
import { apiSlice } from './apiSlice';
import { lifecycleApi } from './lifecycleApi';
import { subscriptionApi } from './subscriptionApi';

const commercialAccess = {
  planCode: 'PRO' as const,
  state: 'ACTIVE' as const,
  accessStateVersion: '1',
  entitlements: ['BILLING'] as const,
  limits: { staff: 3, firms: 1 },
  demoExpiresAt: null,
  endsAt: null,
  graceExpiresAt: null,
};

const createStore = () =>
  configureStore({
    reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (defaults) => defaults().concat(apiSlice.middleware),
    preloadedState: {
      auth: {
        user: {
          id: 'owner-a',
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
        sessionContext: {
          identity: {
            id: 'identity-a',
            email: null,
            displayName: 'Owner A',
            status: 'ACTIVE',
            accessStateVersion: 1,
          },
          memberships: [],
          selected: { userId: 'owner-a', tenantId: 'tenant-a' },
          commercialAccess,
          provisioning: { state: 'READY' },
        },
      },
    },
  });

describe('failed session and subscription lifecycle callbacks', () => {
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
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ success: false, message: 'Temporarily unavailable' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['commercial access', 'session context', 'membership selection'] as const)(
    'retains the session and exposes the %s request error without an unhandled rejection',
    async (operation) => {
      const store = createStore();
      const before = store.getState().auth;
      const notifications: ToastMessage[] = [];
      const unsubscribe = notificationService.subscribe((message) => notifications.push(message));
      try {
        const request =
          operation === 'commercial access'
            ? store.dispatch(subscriptionApi.endpoints.getCommercialAccess.initiate())
            : operation === 'session context'
              ? store.dispatch(lifecycleApi.endpoints.getSessionContext.initiate())
              : store.dispatch(
                  lifecycleApi.endpoints.selectAccountMembership.initiate({ userId: 'owner-b' })
                );

        await expect(request.unwrap()).rejects.toMatchObject({ status: 503 });
        // Let lifecycle promises settle too: awaiting the caller's unwrap does
        // not handle an independently rejected onQueryStarted callback.
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(store.getState().auth).toEqual(before);
        expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('access-a');
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe('error');
      } finally {
        unsubscribe();
        store.dispatch(apiSlice.util.resetApiState());
      }
    }
  );

  it('applies a successful access refresh after a temporary failure', async () => {
    const store = createStore();
    await store.dispatch(subscriptionApi.endpoints.getCommercialAccess.initiate());
    const updated = { ...commercialAccess, accessStateVersion: '2', entitlements: [] };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: updated }), {
        headers: { 'content-type': 'application/json' },
      })
    );

    await store
      .dispatch(
        subscriptionApi.endpoints.getCommercialAccess.initiate(undefined, { forceRefetch: true })
      )
      .unwrap();

    expect(store.getState().auth.sessionContext?.commercialAccess).toEqual(updated);
    expect(store.getState().auth.user?.tenant?.id).toBe('tenant-a');
    expect(store.getState().auth.accessToken).toBe('access-a');
    store.dispatch(apiSlice.util.resetApiState());
  });
});
