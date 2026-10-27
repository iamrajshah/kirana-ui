import { useEffect } from 'react';
import { useGetSessionContextQuery } from '@core/api/lifecycleApi';
import { useGetCommercialAccessQuery } from '@core/api/subscriptionApi';

export const SessionLifecycleSync = () => {
  const session = useGetSessionContextQuery();
  const commercial = useGetCommercialAccessQuery();

  useEffect(() => {
    const refresh = () => {
      if (!navigator.onLine || document.visibilityState === 'hidden') return;
      void session.refetch();
      void commercial.refetch();
    };
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [commercial, session]);

  return null;
};
