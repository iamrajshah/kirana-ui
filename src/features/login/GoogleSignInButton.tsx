import React, { useEffect, useRef } from 'react';
import { WebGoogleIdentityProvider } from './googleIdentityProvider';
import { useTranslation } from 'react-i18next';

export const GoogleSignInButton: React.FC<{
  onCredential: (credential: string, source: 'web' | 'android') => void;
  onCancel: () => void;
  onError: (message: string) => void;
}> = ({ onCredential, onCancel, onError }) => {
  const { t } = useTranslation();
  const target = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
  const entryEnabled = import.meta.env.VITE_GOOGLE_ENTRY_ENABLED === 'true';

  useEffect(() => {
    if (!entryEnabled || !target.current || !clientId) return;
    return new WebGoogleIdentityProvider(clientId).render(target.current, {
      onCredential: (identity) => onCredential(identity.credential, identity.source),
      onCancel,
      onError,
    });
  }, [clientId, entryEnabled, onCancel, onCredential, onError]);

  if (!entryEnabled || !clientId) return null;
  return <div ref={target} aria-label={t('auth.googleSignIn')} className="flex justify-center" />;
};
