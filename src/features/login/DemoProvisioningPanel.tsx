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

class ProvisioningRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ProvisioningRequestError';
  }
}

const request = async (
  token: string,
  path: string,
  method: 'GET' | 'POST',
  signal: AbortSignal
) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` },
    signal,
  });
  let body: { data?: ProvisioningStatus; message?: string } | null = null;
  try {
    body = (await response.json()) as { data?: ProvisioningStatus; message?: string };
  } catch {
    // Gateways and older rate-limit middleware can return plain text. Keep the
    // transport detail out of the customer UI and classify by HTTP status.
  }
  if (!response.ok || !body?.data) {
    throw new ProvisioningRequestError(
      body?.message || '',
      response.status
    );
  }
  return body.data;
};

const waitForResume = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException('Demo setup cancelled', 'AbortError'));
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, 500);
    if (signal.aborted) handleAbort();
    else signal.addEventListener('abort', handleAbort, { once: true });
  });

export const DemoProvisioningPanel: React.FC<{
  token: string;
  onReady: () => Promise<void> | void;
}> = ({ token, onReady }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ProvisioningStatus>({ state: 'STARTING' });
  const [error, setError] = useState('');
  const generation = useRef(0);
  const activeRun = useRef<{ generation: number; controller: AbortController } | null>(null);
  const onReadyRef = useRef(onReady);
  const tRef = useRef(t);

  useEffect(() => {
    onReadyRef.current = onReady;
    tRef.current = t;
  }, [onReady, t]);

  const provision = useCallback(async () => {
    if (activeRun.current) return;
    const currentGeneration = ++generation.current;
    const controller = new AbortController();
    activeRun.current = { generation: currentGeneration, controller };
    const isCurrent = () =>
      activeRun.current?.generation === currentGeneration && !controller.signal.aborted;

    setError('');
    try {
      let current = await request(token, '/demo/provision', 'POST', controller.signal);
      if (!isCurrent()) return;
      setStatus(current);

      while (current.state === 'PROVISIONING') {
        // Provisioning is a bounded stage machine, not a tight polling loop.
        // A small pause also leaves room for the previous transaction to finish
        // and avoids bursting authenticated resume requests at the API edge.
        await waitForResume(controller.signal);
        current = await request(token, '/demo/provision/resume', 'POST', controller.signal);
        if (!isCurrent()) return;
        setStatus(current);
      }

      if (current.state === 'READY' && isCurrent()) await onReadyRef.current();
      if (
        (current.state === 'RETRYABLE_FAILURE' || current.state === 'TERMINAL_FAILURE') &&
        isCurrent()
      ) {
        setError(current.error?.message || 'Demo setup needs support');
      }
    } catch (reason) {
      if (isCurrent()) {
        setError(
          reason instanceof ProvisioningRequestError
            ? reason.status === 429
              ? tRef.current('auth.demoRateLimited')
              : reason.message || tRef.current('auth.demoRequestFailed')
            : reason instanceof Error
              ? reason.message
              : tRef.current('auth.demoRequestFailed')
        );
      }
    } finally {
      if (activeRun.current?.generation === currentGeneration) activeRun.current = null;
    }
  }, [token]);

  useEffect(() => {
    setStatus({ state: 'STARTING' });
    setError('');
    void provision();
    return () => {
      generation.current += 1;
      activeRun.current?.controller.abort();
      activeRun.current = null;
    };
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
