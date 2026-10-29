// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSlice } from '../api/apiSlice';
import { logout, setCredentials } from '../auth/authSlice';
import { store } from './index';

const sessionProbeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sessionIsolationProbe: builder.query<{ shop: string }, void>({
      query: () => '/session-isolation-probe',
    }),
  }),
});

const credentials = (userId: string, tenantId: string) =>
  setCredentials({
    user: {
      id: userId,
      name: `Owner ${userId}`,
      email: null,
      phone: userId,
      roles: ['OWNER'],
    },
    tenant: { id: tenantId, name: `Shop ${tenantId}`, status: 'ACTIVE' },
    tokens: {
      accessToken: `access-${userId}-${tenantId}`,
      refreshToken: `refresh-${userId}-${tenantId}`,
    },
  });

const waitForListeners = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const seedProbe = async (shop: string) => {
  await store.dispatch(
    sessionProbeApi.util.upsertQueryData('sessionIsolationProbe', undefined, { shop })
  );
  expect(sessionProbeApi.endpoints.sessionIsolationProbe.select()(store.getState()).data).toEqual({
    shop,
  });
};

describe('tenant-scoped API cache isolation', () => {
  beforeEach(async () => {
    store.dispatch(logout());
    store.dispatch(apiSlice.util.resetApiState());
    localStorage.clear();
    await waitForListeners();
  });

  it('removes tenant data when the current session signs out', async () => {
    store.dispatch(credentials('1', 'tenant-1'));
    await waitForListeners();
    await seedProbe('First shop');

    store.dispatch(logout());

    await vi.waitFor(() =>
      expect(
        sessionProbeApi.endpoints.sessionIsolationProbe.select()(store.getState()).data
      ).toBeUndefined()
    );
  });

  it('removes tenant data when credentials switch identity or membership', async () => {
    store.dispatch(credentials('1', 'tenant-1'));
    await waitForListeners();
    await seedProbe('First shop');

    store.dispatch(credentials('2', 'tenant-2'));

    await vi.waitFor(() =>
      expect(
        sessionProbeApi.endpoints.sessionIsolationProbe.select()(store.getState()).data
      ).toBeUndefined()
    );
  });
});
