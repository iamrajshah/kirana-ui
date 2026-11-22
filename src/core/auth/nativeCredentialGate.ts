import type { Middleware } from '@reduxjs/toolkit';
import { logout, setCredentials } from './authSlice';
import { isNativeMobile } from './deviceIdentity';
import { persistTokens, type StoredTokens } from './tokenVault';

export const createNativeCredentialGate = (
  native = isNativeMobile,
  persist: (tokens: StoredTokens) => Promise<void> = persistTokens
): Middleware => {
  let queue: Promise<unknown> = Promise.resolve();
  let generation = 0;
  return () => (next) => (action) => {
    if (logout.match(action)) {
      generation += 1;
      return next(action);
    }
    if (!native() || !setCredentials.match(action)) return next(action);
    const payload = action.payload;
    const accessToken = payload.tokens
      ? payload.tokens.accessToken || payload.tokens.access_token || payload.tokens.access
      : payload.access_token;
    const refreshToken = payload.tokens
      ? payload.tokens.refreshToken || payload.tokens.refresh_token || payload.tokens.refresh
      : payload.refresh_token;

    // Native callers await dispatch before navigating. The reducer, subscribers
    // and authenticated requests see credentials only after durable storage.
    const requestedGeneration = generation;
    const commit = queue.then(async () => {
      if (requestedGeneration !== generation) throw new Error('Sign-in was cancelled');
      if (!accessToken || !refreshToken) throw new Error('Session credentials are incomplete');
      await persist({ accessToken, refreshToken });
      if (requestedGeneration !== generation) throw new Error('Sign-in was cancelled');
      return next(action);
    });
    queue = commit.catch(() => undefined);
    return commit;
  };
};
