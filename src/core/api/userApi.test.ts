import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer, { setCredentials } from '../auth/authSlice';
import { STORAGE_KEYS } from '../constants';
import { apiSlice } from './apiSlice';
import { userApi } from './userApi';

const currentUser = {
  id: 'owner-1',
  name: 'Old Owner',
  email: 'owner@example.com',
  phone: '9999999999',
  roles: ['OWNER'],
  tenant: { id: 'tenant-1', name: 'Rajesh Kirana', status: 'ACTIVE' },
};

const profileResponse = (name = 'Updated Owner') =>
  new Response(
    JSON.stringify({
      success: true,
      data: {
        id: currentUser.id,
        name,
        email: currentUser.email,
        phone: currentUser.phone,
        roles: ['MANAGER'],
        tenant: { id: 'wrong-tenant', name: 'Wrong tenant', status: 'ACTIVE' },
        updated_at: '2026-10-14T10:00:00.000Z',
        created_at: '2026-01-01T10:00:00.000Z',
        is_active: true,
      },
    }),
    { headers: { 'content-type': 'application/json' } }
  );

const createTestStore = () => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
  return configureStore({
    reducer: {
      auth: authReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
    preloadedState: {
      auth: {
        user: currentUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionVersion: 1,
        profileUpdateSequence: 0,
        lastAppliedProfileUpdateSequence: 0,
        profileUpdateRequests: {},
      },
    },
  });
};

describe('updateProfile', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'access-token');

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
      vi.fn(async () => profileResponse())
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates the active user while preserving login-only tenant data', async () => {
    const store = createTestStore();

    await store.dispatch(userApi.endpoints.updateProfile.initiate({ name: 'Updated Owner' })).unwrap();

    expect(store.getState().auth.user).toEqual({
      ...currentUser,
      name: 'Updated Owner',
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null')).toEqual(
      store.getState().auth.user
    );

    store.dispatch(apiSlice.util.resetApiState());
  });

  it('leaves the active user unchanged when the profile request fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: 'Update failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    );
    const store = createTestStore();

    await expect(
      store.dispatch(userApi.endpoints.updateProfile.initiate({ name: 'Updated Owner' })).unwrap()
    ).rejects.toBeTruthy();

    expect(store.getState().auth.user).toEqual(currentUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null')).toEqual(currentUser);
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('rejects a malformed successful response without changing the active user', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), {
        headers: { 'content-type': 'application/json' },
      })
    );
    const store = createTestStore();

    await expect(
      store.dispatch(userApi.endpoints.updateProfile.initiate({ name: 'Updated Owner' })).unwrap()
    ).rejects.toBeTruthy();

    expect(store.getState().auth.user).toEqual(currentUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null')).toEqual(currentUser);
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('ignores a delayed response after another user signs in', async () => {
    let resolveProfile!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () => new Promise<Response>((resolve) => (resolveProfile = resolve))
    );
    const store = createTestStore();
    const pendingUpdate = store.dispatch(
      userApi.endpoints.updateProfile.initiate({ name: 'Updated Owner' })
    );
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());

    const nextUser = { ...currentUser, id: 'owner-2', name: 'Second Owner' };
    store.dispatch(
      setCredentials({
        user: nextUser,
        tenant: nextUser.tenant,
        tokens: { accessToken: 'next-access', refreshToken: 'next-refresh' },
      })
    );
    resolveProfile(profileResponse());
    await pendingUpdate.unwrap();

    expect(store.getState().auth.user).toEqual(nextUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null')).toEqual(nextUser);
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('keeps the newest profile when overlapping requests finish out of order', async () => {
    let resolveOlder!: (response: Response) => void;
    let resolveNewer!: (response: Response) => void;
    vi.mocked(fetch)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveOlder = resolve)))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveNewer = resolve)));
    const store = createTestStore();

    const older = store.dispatch(
      userApi.endpoints.updateProfile.initiate({ name: 'Older response' })
    );
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const newer = store.dispatch(
      userApi.endpoints.updateProfile.initiate({ name: 'Newest response' })
    );
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    resolveNewer(profileResponse('Newest response'));
    await newer.unwrap();
    resolveOlder(profileResponse('Older response'));
    await older.unwrap();

    expect(store.getState().auth.user?.name).toBe('Newest response');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null').name).toBe(
      'Newest response'
    );
    store.dispatch(apiSlice.util.resetApiState());
  });

  it('applies an older successful request when the newer request fails', async () => {
    let resolveOlder!: (response: Response) => void;
    let resolveNewer!: (response: Response) => void;
    vi.mocked(fetch)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveOlder = resolve)))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveNewer = resolve)));
    const store = createTestStore();

    const older = store.dispatch(
      userApi.endpoints.updateProfile.initiate({ name: 'Accepted older request' })
    );
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const newer = store.dispatch(
      userApi.endpoints.updateProfile.initiate({ name: 'Rejected newer request' })
    );
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    resolveNewer(
      new Response(JSON.stringify({ success: false, message: 'Update failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    );
    await expect(newer.unwrap()).rejects.toBeTruthy();
    resolveOlder(profileResponse('Accepted older request'));
    await older.unwrap();

    expect(store.getState().auth.user?.name).toBe('Accepted older request');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null').name).toBe(
      'Accepted older request'
    );
    store.dispatch(apiSlice.util.resetApiState());
  });
});
