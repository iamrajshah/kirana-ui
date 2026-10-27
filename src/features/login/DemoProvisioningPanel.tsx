import React, { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@core/constants';
import { Button } from '@components';
import { useTranslation } from 'react-i18next';

interface ProvisioningStatus {
  state: string;
  completedStage?: string;
  nextStage?: string | null;
  retryable?: boolean;
  inProgress?: boolean;
  error?: { message: string } | null;
}

const request = async (token: string, path: string, method: 'GET' | 'POST') => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as { data?: ProvisioningStatus; message?: string };
  if (!response.ok || !body.data) throw new Error(body.message || 'Demo setup could not continue');
  return body.data;
};

export const DemoProvisioningPanel: React.FC<{
  token: string;
  onReady: () => Promise<void> | void;
}> = ({ token, onReady }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ProvisioningStatus>({ state: 'STARTING' });
  const [error, setError] = useState('');
  const running = useRef(false);

  const provision = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setError('');
    try {
      let current = await request(token, '/demo/provision', 'POST');
      setStatus(current);
      while (current.state !== 'READY' && current.state !== 'TERMINAL_FAILURE') {
        if (!current.retryable && current.state !== 'PROVISIONING') break;
        current = await request(token, '/demo/provision/resume', 'POST');
        setStatus(current);
        if (current.inProgress) await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      if (current.state === 'READY') await onReady();
      if (current.state === 'TERMINAL_FAILURE') {
        setError(current.error?.message || 'Demo setup needs support');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Demo setup could not continue');
    } finally {
      running.current = false;
    }
  }, [onReady, token]);

  useEffect(() => {
    void provision();
  }, [provision]);

  return (
    <section
      className="mt-4 rounded-lg border border-[var(--ion-color-primary)] p-4"
      aria-live="polite"
    >
      <h3 className="font-semibold">{t('auth.demoPreparing')}</h3>
      <p className="mt-2 text-sm">
        {t('auth.demoStatus', { status: status.state.replace(/_/g, ' ') })}
      </p>
      {status.completedStage && (
        <p className="text-sm">{t('auth.demoCompleted', { stage: status.completedStage })}</p>
      )}
      {status.nextStage && (
        <p className="text-sm">{t('auth.demoNext', { stage: status.nextStage })}</p>
      )}
      {error && <p className="mt-2 text-sm text-[var(--ion-color-danger)]">{error}</p>}
      {error && status.state !== 'TERMINAL_FAILURE' && (
        <Button type="button" onClick={() => void provision()} fullWidth>
          {t('auth.demoRetry')}
        </Button>
      )}
    </section>
  );
};
