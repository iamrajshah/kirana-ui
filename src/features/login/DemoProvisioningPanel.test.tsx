// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoProvisioningPanel } from './DemoProvisioningPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${Object.values(values).join(':')}` : key,
  }),
}));

vi.mock('@components', () => ({
  Button: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

type Status = {
  state: string;
  inProgress?: boolean;
  retryable?: boolean;
  completedStage?: string;
  error?: { message: string };
};

const response = (data: Status) =>
  Promise.resolve({ ok: true, json: async () => ({ data }) } as Response);

const deferredResponse = () => {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

describe('DemoProvisioningPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows active progress and completes authentication only after READY', async () => {
    const resume = deferredResponse();
    vi.mocked(fetch)
      .mockImplementationOnce(() =>
        response({ state: 'PROVISIONING', completedStage: 'TENANT', inProgress: false })
      )
      .mockImplementationOnce(() => resume.promise);
    const onReady = vi.fn();

    render(<DemoProvisioningPanel token="prospect-a" onReady={onReady} />);

    expect(await screen.findByText('auth.demoStatus:PROVISIONING')).toBeTruthy();
    expect(screen.getByText('auth.demoCompleted:TENANT')).toBeTruthy();
    expect(onReady).not.toHaveBeenCalled();

    resume.resolve(await response({ state: 'READY' }));
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect(screen.getByText('auth.demoStatus:READY')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('stops on a retryable failure and resumes only after the user asks', async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(() =>
        response({
          state: 'RETRYABLE_FAILURE',
          retryable: true,
          error: { message: 'Temporary setup problem' },
        })
      )
      .mockImplementationOnce(() => response({ state: 'READY' }));
    const onReady = vi.fn();

    render(<DemoProvisioningPanel token="prospect-a" onReady={onReady} />);

    expect(await screen.findByText('Temporary setup problem')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'auth.demoRetry' }));
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shows terminal failure without offering a retry', async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      response({
        state: 'TERMINAL_FAILURE',
        retryable: false,
        error: { message: 'Setup needs support' },
      })
    );

    render(<DemoProvisioningPanel token="prospect-a" onReady={vi.fn()} />);

    expect(await screen.findByText('Setup needs support')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'auth.demoRetry' })).toBeNull();
  });

  it('discards a late completion when a newer provisioning token replaces it', async () => {
    const first = deferredResponse();
    vi.mocked(fetch)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => response({ state: 'READY' }));
    const firstReady = vi.fn();
    const secondReady = vi.fn();
    const view = render(<DemoProvisioningPanel token="prospect-a" onReady={firstReady} />);

    view.rerender(<DemoProvisioningPanel token="prospect-b" onReady={secondReady} />);
    await waitFor(() => expect(secondReady).toHaveBeenCalledTimes(1));

    first.resolve(await response({ state: 'READY' }));
    await Promise.resolve();
    expect(firstReady).not.toHaveBeenCalled();
    expect(secondReady).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[1]?.[1]?.headers).toEqual({
      authorization: 'Bearer prospect-b',
    });
  });

  it('does not update or authenticate after unmount', async () => {
    const pending = deferredResponse();
    vi.mocked(fetch).mockImplementationOnce(() => pending.promise);
    const onReady = vi.fn();
    const view = render(<DemoProvisioningPanel token="prospect-a" onReady={onReady} />);

    view.unmount();
    pending.resolve(await response({ state: 'READY' }));
    await Promise.resolve();

    expect(onReady).not.toHaveBeenCalled();
  });
});
