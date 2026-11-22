import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { logout, setCredentials } from './authSlice';
import { createNativeCredentialGate } from './nativeCredentialGate';
import type { User } from '@core/types';

const credentials = {
  user: { id: '1' } as User,
  access_token: 'native-access',
  refresh_token: 'native-refresh',
};
const makeStore = (
  native: boolean,
  persist: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>
) =>
  configureStore({
    reducer: (state: { authenticated: boolean } = { authenticated: false }, action) =>
      setCredentials.match(action) ? { authenticated: true } : state,
    middleware: (defaults) => defaults().prepend(createNativeCredentialGate(() => native, persist)),
  });

describe('native credential commit gate', () => {
  it('waits for durable storage before exposing an authenticated state', async () => {
    let finish!: () => void;
    const persist = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const store = makeStore(true, persist);
    const pending = store.dispatch(setCredentials(credentials));
    await Promise.resolve();
    expect(store.getState().authenticated).toBe(false);
    expect(persist).toHaveBeenCalledWith({
      accessToken: 'native-access',
      refreshToken: 'native-refresh',
    });
    finish();
    await pending;
    expect(store.getState().authenticated).toBe(true);
  });
  it('rejects a failed native save without authenticating', async () => {
    const store = makeStore(true, () => Promise.reject(new Error('Keychain unavailable')));
    await expect(store.dispatch(setCredentials(credentials))).rejects.toThrow(
      'Keychain unavailable'
    );
    expect(store.getState().authenticated).toBe(false);
  });
  it('keeps normal browser dispatch synchronous', () => {
    const persist = vi.fn();
    const store = makeStore(false, persist);
    const action = setCredentials(credentials);
    expect(store.dispatch(action)).toEqual(action);
    expect(store.getState().authenticated).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });
  it('rejects incomplete native credentials without writing or authenticating', async () => {
    const persist = vi.fn();
    const store = makeStore(true, persist);
    await expect(
      store.dispatch(setCredentials({ ...credentials, refresh_token: '' }))
    ).rejects.toThrow('Session credentials are incomplete');
    expect(persist).not.toHaveBeenCalled();
    expect(store.getState().authenticated).toBe(false);
  });
  it('does not authenticate after logout while a secure save is pending', async () => {
    let finish!: () => void;
    const store = makeStore(
      true,
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const pending = store.dispatch(setCredentials(credentials));
    await Promise.resolve();
    store.dispatch(logout());
    finish();
    await expect(pending).rejects.toThrow('Sign-in was cancelled');
    expect(store.getState().authenticated).toBe(false);
  });
  it('serializes competing native session commits', async () => {
    let finish!: () => void;
    const persist = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          })
      )
      .mockResolvedValue(undefined);
    const store = makeStore(true, persist);
    const first = store.dispatch(setCredentials(credentials));
    const second = store.dispatch(setCredentials({ ...credentials, access_token: 'second' }));
    await Promise.resolve();
    expect(persist).toHaveBeenCalledTimes(1);
    finish();
    await first;
    await second;
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenLastCalledWith({
      accessToken: 'second',
      refreshToken: 'native-refresh',
    });
  });
});
