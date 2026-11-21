import { useEffect, useState } from 'react';
import { store } from '@core/store';
import { hydrateSessionTokens } from './authSlice';
import { hydrateTokens } from './tokenVault';

export const useAuthBootstrap = () => {
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    setFailed(false);
    void hydrateTokens()
      .then((tokens) => {
        if (!active) return;
        if (tokens) store.dispatch(hydrateSessionTokens(tokens));
        setReady(true);
      })
      .catch(() => {
        // A locked/unavailable secure store must never become an unhandled
        // rejection or silently fall back to an unauthenticated/plaintext vault.
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return { ready, failed, retry: () => setAttempt((value) => value + 1) };
};
