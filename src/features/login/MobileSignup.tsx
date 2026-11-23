import translations from './mobileSignupTranslations.json';
import i18n from '@core/i18n';
import './MobileSignup.css';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@core/constants';
import { runInActiveWorkspace } from '@core/workspace/browserWorkspace';
import { DemoProvisioningPanel } from './DemoProvisioningPanel';

for (const [language, values] of Object.entries(translations)) {
  i18n.addResourceBundle(language, 'translation', { mobileSignup: values }, true, true);
}

export const MobileSignup: React.FC<{
  legal: { privacyVersion: string; termsVersion: string };
  accepted: boolean;
  onReady: (phone: string, password: string) => void;
}> = ({ legal, accepted, onReady }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const submit = async (action: 'request' | 'verify' | 'resume') => {
    if (pending.current) return;
    if (!accepted) {
      setError(t('mobileSignup.accept'));
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const payload =
        action === 'request'
          ? {
              phone,
              name,
              password,
              ...(email.trim() ? { email: email.trim() } : {}),
              privacyVersion: legal.privacyVersion,
              termsVersion: legal.termsVersion,
            }
          : action === 'verify'
            ? { challengeId: challenge, otp }
            : { phone, password };
      const data = await runInActiveWorkspace(async () => {
        const response = await fetch(`${API_BASE_URL}/auth/signup/mobile/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success) {
          const errors =
            body?.errors && typeof body.errors === 'object'
              ? Object.values(body.errors)
                  .flat()
                  .filter((item): item is string => typeof item === 'string')
              : [];
          throw new Error(
            errors.length ? errors.join(' ') : body?.message || t('mobileSignup.failed')
          );
        }
        return body.data as { challengeId?: string; provisioningToken?: string };
      });
      if (data.challengeId) setChallenge(data.challengeId);
      if (data.provisioningToken) setToken(data.provisioningToken);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('mobileSignup.failed'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="mobile-signup" aria-label={t('mobileSignup.title')}>
      <button type="button" onClick={() => setOpen(!open)}>
        {t('mobileSignup.title')}
      </button>
      {open && (
        <div
          className="mobile-signup__panel"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !token) {
              event.preventDefault();
              void submit(challenge ? 'verify' : 'request');
            }
          }}
        >
          <p>{t('mobileSignup.help')}</p>
          {!token && (
            <>
              <label>
                {t('mobileSignup.name')}
                <input
                  value={name}
                  disabled={busy || !!challenge}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </label>
              <label>
                {t('mobileSignup.phone')}
                <input
                  value={phone}
                  disabled={busy || !!challenge}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="tel"
                  autoComplete="tel-national"
                />
              </label>
              <label>
                {t('mobileSignup.email')}
                <input
                  value={email}
                  disabled={busy || !!challenge}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </label>
              <label>
                {t('mobileSignup.password')}
                <input
                  value={password}
                  disabled={busy || !!challenge}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                />
              </label>
              {challenge && (
                <label>
                  {t('mobileSignup.code')}
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
              )}
              <button
                type="button"
                disabled={busy || !accepted}
                onClick={() => void submit(challenge ? 'verify' : 'request')}
              >
                {t(challenge ? 'mobileSignup.verify' : 'mobileSignup.send')}
              </button>
              {challenge && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setChallenge('');
                    setOtp('');
                  }}
                >
                  {t('mobileSignup.change')}
                </button>
              )}
              <button
                type="button"
                disabled={busy || !accepted}
                onClick={() => void submit('resume')}
              >
                {t('mobileSignup.resume')}
              </button>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          {token && (
            <DemoProvisioningPanel token={token} onReady={() => onReady(phone, password)} />
          )}
        </div>
      )}
    </section>
  );
};
