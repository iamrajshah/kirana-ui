import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@core/hooks';
import { selectCommercialAccess } from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';
import { MINUTE_MS, trialCountdown } from './trialCountdown';
import './TrialCountdownBanner.css';

export const TrialCountdownBanner: React.FC = () => {
  const { t } = useTranslation();
  const access = useAppSelector(selectCommercialAccess);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (access?.state !== 'TRIALING' || !access.demoExpiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => window.clearInterval(timer);
  }, [access?.demoExpiresAt, access?.state]);

  const countdown = useMemo(
    () => (access?.demoExpiresAt ? trialCountdown(access.demoExpiresAt, now) : null),
    [access?.demoExpiresAt, now]
  );

  if (access?.state !== 'TRIALING' || !countdown) return null;

  const remaining = countdown.expired
    ? t('trialBanner.expired')
    : countdown.days > 0
      ? t('trialBanner.daysHours', { days: countdown.days, hours: countdown.hours })
      : t('trialBanner.hoursMinutes', {
          hours: countdown.hours,
          minutes: countdown.minutes,
        });

  return (
    <aside
      className={`trial-countdown ${countdown.critical || countdown.expired ? 'trial-countdown--critical' : ''}`}
      role="status"
      aria-live={countdown.critical ? 'polite' : 'off'}
    >
      <span className="trial-countdown__label">{t('trialBanner.label')}</span>
      <strong>{remaining}</strong>
      <Link to={ROUTES.ACCOUNT}>{t('trialBanner.viewPlans')}</Link>
    </aside>
  );
};
