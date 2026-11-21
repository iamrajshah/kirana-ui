import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { browserWorkspace } from './browserWorkspace';
import { store } from '@core/store';
import { logout, setCredentials } from '@core/auth/authSlice';
import { apiSlice } from '@core/api/apiSlice';
import { STORAGE_KEYS } from '@core/constants';
import type { SessionContext, User } from '@core/types';
import i18n from '@core/i18n';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import './workspaceGate.css';

// Load this feature's four languages with its UI, outside the initial POS bundle.
for (const [language, workspaceLease] of Object.entries({ en, hi, mr, gu })) {
  i18n.addResourceBundle(language, 'translation', { workspaceLease }, true, true);
}
const subscribeNative = () => () => undefined;
const nativeState = () => 'active' as const;
export const WorkspaceGate = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    browserWorkspace?.subscribe ?? subscribeNative,
    browserWorkspace?.snapshot ?? nativeState
  );
  const [mounted, setMounted] = useState(!browserWorkspace);
  const mountedRef = useRef(!browserWorkspace);
  const [synchronized, setSynchronized] = useState(!browserWorkspace);
  const [sessionChanged, setSessionChanged] = useState(false);
  useEffect(() => {
    if (!browserWorkspace) return;
    const start = () => browserWorkspace.start();
    const stop = () => browserWorkspace.stop();
    start();
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', start);
    return () => {
      window.removeEventListener('pagehide', stop);
      window.removeEventListener('pageshow', start);
      stop();
    };
  }, []);
  useEffect(() => {
    if (!browserWorkspace || state !== 'active') {
      setSynchronized(!browserWorkspace);
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null') as User | null;
      const current = store.getState().auth.user;
      const identity = (u: User | null) => (u ? `${u.id}:${u.tenant?.id ?? ''}` : '');
      // Never apply a different shop's credentials to a preserved in-memory bill.
      if (mountedRef.current && identity(current) !== identity(user)) {
        setSessionChanged(true);
        return;
      }
      const access = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (user && access && refresh) {
        store.dispatch(
          setCredentials({
            user,
            access_token: access,
            refresh_token: refresh,
            isFirstLogin: localStorage.getItem(STORAGE_KEYS.MUST_CHANGE_PASSWORD) === 'true',
            sessionContext: JSON.parse(
              localStorage.getItem(STORAGE_KEYS.SESSION_CONTEXT) || 'null'
            ) as SessionContext,
          })
        );
      }
      if (!user && current) store.dispatch(logout());
      store.dispatch(
        apiSlice.util.invalidateTags([
          'User',
          'Customer',
          'Invoice',
          'Payment',
          'Inventory',
          'Dashboard',
          'Report',
        ])
      );
      mountedRef.current = true;
      setMounted(true);
      setSynchronized(true);
    } catch {
      setSessionChanged(true);
    }
  }, [state]); // Preserved children must not remount when a tab relinquishes its lock.
  const active = state === 'active' && synchronized && !sessionChanged;
  return (
    <>
      {mounted && (
        <div
          className="pos-workspace-content"
          hidden={!active}
          {...(!active ? { inert: '' } : {})}
          aria-hidden={!active}
        >
          {children}
        </div>
      )}
      {!active && (
        <section className="pos-workspace-blocker" role="status" aria-live="polite">
          <h1>{t(sessionChanged ? 'workspaceLease.sessionChanged' : 'workspaceLease.title')}</h1>
          <p>
            {t(
              state === 'handing-over'
                ? 'workspaceLease.finishing'
                : state === 'unsupported' || state === 'error'
                  ? 'workspaceLease.unsupported'
                  : 'workspaceLease.description'
            )}
          </p>
          {state === 'waiting' && !sessionChanged && (
            <button type="button" onClick={browserWorkspace?.takeOver}>
              {t('workspaceLease.takeOver')}
            </button>
          )}
          {sessionChanged && (
            <button type="button" onClick={() => window.location.reload()}>
              {t('workspaceLease.reload')}
            </button>
          )}
        </section>
      )}
    </>
  );
};
