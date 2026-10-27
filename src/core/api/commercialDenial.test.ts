import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '@core/auth/authSlice';
import { STORAGE_KEYS } from '@core/constants';
import { notificationService } from '@core/services/notificationService';
import { apiSlice } from './apiSlice';

const probeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    commercialWriteProbe: builder.mutation<void, void>({
      query: () => ({ url: '/products/barcode/generate', method: 'POST', body: {} }),
    }),
  }),
});

const response = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('commercial API denial recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'access');
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh');
    localStorage.setItem(
      STORAGE_KEYS.SESSION_CONTEXT,
      JSON.stringify({
        identity: {
          id: '1',
          email: null,
          displayName: null,
          status: 'ACTIVE',
          accessStateVersion: 1,
        },
        memberships: [],
        selected: { userId: '1', tenantId: '7' },
        provisioning: { state: 'READY' },
        commercialAccess: {
          planCode: 'PRO',
          state: 'ACTIVE',
          accessStateVersion: 'old',
          entitlements: ['CUSTOM_BARCODE'],
          limits: { staff: 7, firms: 1 },
          demoExpiresAt: null,
          endsAt: null,
          graceExpiresAt: null,
        },
      })
    );
    const NativeRequest = Request;
    vi.stubGlobal(
      'Request',
      class extends NativeRequest {
        constructor(input: RequestInfo | URL, init?: RequestInit) {
          super(input, init ? { ...init, signal: undefined } : init);
        }
      }
    );
    vi.spyOn(notificationService, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes stale Pro context after a server read-only denial', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          response(
            {
              success: false,
              message: 'read only',
              commercial: {
                code: 'COMMERCIAL_READ_ONLY',
                reason: 'read only',
                action: 'RENEW',
                accessStateVersion: 'new',
              },
            },
            403
          )
        )
        .mockResolvedValueOnce(
          response({
            data: {
              identity: {
                id: '1',
                email: null,
                displayName: null,
                status: 'ACTIVE',
                accessStateVersion: 1,
              },
              memberships: [],
              selected: { userId: '1', tenantId: '7' },
              provisioning: { state: 'READY' },
              commercialAccess: { state: 'READ_ONLY', demoExpiresAt: null, endsAt: null },
            },
          })
        )
        .mockResolvedValueOnce(
          response({
            data: {
              planCode: 'PRO',
              state: 'READ_ONLY',
              accessStateVersion: 'new',
              entitlements: ['CUSTOM_BARCODE'],
              limits: { staff: 7, firms: 1 },
              demoExpiresAt: null,
              endsAt: null,
              graceExpiresAt: null,
            },
          })
        )
    );
    const context = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_CONTEXT) || 'null');
    const store = configureStore({
      reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
      middleware: (defaults) => defaults().concat(apiSlice.middleware),
      preloadedState: {
        auth: {
          user: { id: '1', name: 'Owner', email: null, phone: '1', roles: ['OWNER'] },
          accessToken: 'access',
          refreshToken: 'refresh',
          sessionVersion: 1,
          profileUpdateSequence: 0,
          lastAppliedProfileUpdateSequence: 0,
          profileUpdateRequests: {},
          sessionContext: context,
        },
      },
    });

    await expect(
      store.dispatch(probeApi.endpoints.commercialWriteProbe.initiate()).unwrap()
    ).rejects.toMatchObject({ status: 403 });
    await vi.waitFor(() =>
      expect(store.getState().auth.sessionContext?.commercialAccess).toMatchObject({
        state: 'READ_ONLY',
        accessStateVersion: 'new',
      })
    );
    expect(notificationService.error).toHaveBeenCalledWith(expect.stringMatching(/renew/i));
  });

  it('coalesces context synchronization for concurrent denials at the same version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url.includes('/auth/session-context')) {
          return response({
            data: {
              identity: {
                id: '1',
                email: null,
                displayName: null,
                status: 'ACTIVE',
                accessStateVersion: 2,
              },
              memberships: [],
              selected: { userId: '1', tenantId: '7' },
              provisioning: { state: 'READY' },
              commercialAccess: {
                planCode: 'PRO',
                state: 'READ_ONLY',
                accessStateVersion: 'new',
                entitlements: ['CUSTOM_BARCODE'],
                limits: { staff: 7, firms: 1 },
                demoExpiresAt: null,
                endsAt: null,
                graceExpiresAt: null,
              },
            },
          });
        }
        if (url.includes('/subscription/access')) {
          return response({
            data: {
              planCode: 'PRO',
              state: 'READ_ONLY',
              accessStateVersion: 'new',
              entitlements: ['CUSTOM_BARCODE'],
              limits: { staff: 7, firms: 1 },
              demoExpiresAt: null,
              endsAt: null,
              graceExpiresAt: null,
            },
          });
        }
        return response(
          {
            success: false,
            commercial: {
              code: 'COMMERCIAL_READ_ONLY',
              reason: 'read only',
              action: 'RENEW',
              accessStateVersion: 'new',
            },
          },
          403
        );
      })
    );
    const context = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_CONTEXT) || 'null');
    const store = configureStore({
      reducer: { auth: authReducer, [apiSlice.reducerPath]: apiSlice.reducer },
      middleware: (defaults) => defaults().concat(apiSlice.middleware),
      preloadedState: {
        auth: {
          user: { id: '1', name: 'Owner', email: null, phone: '1', roles: ['OWNER'] },
          accessToken: 'access',
          refreshToken: 'refresh',
          sessionVersion: 1,
          profileUpdateSequence: 0,
          lastAppliedProfileUpdateSequence: 0,
          profileUpdateRequests: {},
          sessionContext: context,
        },
      },
    });

    await Promise.allSettled([
      store.dispatch(probeApi.endpoints.commercialWriteProbe.initiate()).unwrap(),
      store.dispatch(probeApi.endpoints.commercialWriteProbe.initiate()).unwrap(),
    ]);
    await vi.waitFor(() => {
      const calls = vi
        .mocked(fetch)
        .mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)));
      expect(calls.filter((url) => url.includes('/auth/session-context'))).toHaveLength(1);
      expect(calls.filter((url) => url.includes('/subscription/access'))).toHaveLength(1);
    });
  });
});
