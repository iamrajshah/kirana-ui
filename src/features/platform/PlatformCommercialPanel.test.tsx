// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformCommercialPanel } from './PlatformCommercialPanel';

const mocks = vi.hoisted(() => ({ preview: vi.fn(), change: vi.fn(), reauth: vi.fn(), transition: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/api/platformApi', () => ({ platformApi: {
  previewSubscriptionChange: (...args: unknown[]) => mocks.preview(...args),
  changeSubscription: (...args: unknown[]) => mocks.change(...args),
  reauthenticate: (...args: unknown[]) => mocks.reauth(...args),
  transitionSubscription: (...args: unknown[]) => mocks.transition(...args),
} }));

const tenant = {
  id: '11', name: 'Shop', status: 'ACTIVE', createdAt: '2026-10-01',
  contact: { ownerName: 'Owner', phone: '9999999999', email: 'o@x.com', gstNumber: null }, counts: { users: 4, products: 3, invoices: 2 }, staff: [],
  commercial: { subscriptionId: '20', plan: { code: 'BUSINESS', name: 'Business', version: 1 }, state: 'ACTIVE', billingCycle: 'YEARLY', startsAt: '2026-10-01', endsAt: '2027-10-01', demoExpiresAt: null, graceExpiresAt: null, usage: { staff: 4, firms: 3 }, limits: { staff: 15, firms: 5 }, pendingPlan: null, pendingConflicts: null, history: [{ id: '1', from: null, to: 'ACTIVE', reason: 'ACTIVATED', occurredAt: '2026-10-01' }] },
  auditHistory: [{ id: 'a1', action: 'PROSPECT_ACTIVATED', occurredAt: '2026-10-01', metadata: null }],
} as const;
const plans = [
  { code: 'PRO', name: 'Pro', description: null, version: 1, monthlyPricePaise: 49900, yearlyPricePaise: 499900, limits: { staff: 7, firms: 1 }, entitlements: [] },
  { code: 'BUSINESS', name: 'Business', description: null, version: 1, monthlyPricePaise: 99900, yearlyPricePaise: 999900, limits: { staff: 15, firms: 5 }, entitlements: [] },
] as never;
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('PlatformCommercialPanel', () => {
  it('shows usage, subscription history and audit history in theme-neutral surfaces', () => {
    render(<PlatformCommercialPanel tenant={tenant as never} plans={plans} onChanged={vi.fn()} />);
    expect(screen.getByText('4 / 15')).toBeTruthy();
    expect(screen.getByText('platform.commercial.subscriptionHistory')).toBeTruthy();
    expect(screen.getByText('PROSPECT_ACTIVATED')).toBeTruthy();
    expect(document.querySelector('.platform-commercial-panel')).toBeTruthy();
  });

  it('renders downgrade conflicts and refuses to show the apply action', async () => {
    mocks.preview.mockResolvedValue({ targetPlan: 'PRO', canActivate: false, conflicts: [{ type: 'FIRM_LIMIT', current: 3, limit: 1, excess: 2 }] });
    render(<PlatformCommercialPanel tenant={tenant as never} plans={plans} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'platform.commercial.previewChange' }));
    expect(await screen.findByText('FIRM_LIMIT: 3 / 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'platform.commercial.applyChange' })).toBeNull();
  });

  it('reauthenticates before a sensitive lifecycle override', async () => {
    mocks.reauth.mockResolvedValue({ accessToken: 'new', reauthenticatedAt: new Date().toISOString() });
    mocks.transition.mockResolvedValue({ id: '20', state: 'SUSPENDED' });
    render(<PlatformCommercialPanel tenant={tenant as never} plans={plans} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByText('platform.commercial.lifecycleOverride'));
    fireEvent.change(screen.getByLabelText('platform.commercial.state'), { target: { value: 'SUSPENDED' } });
    fireEvent.change(screen.getByLabelText('platform.commercial.reason'), { target: { value: 'Support hold' } });
    fireEvent.change(screen.getByLabelText('platform.commercial.adminPassword'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'platform.commercial.confirmLifecycle' }));
    await waitFor(() => expect(mocks.reauth).toHaveBeenCalledWith('secret'));
    expect(mocks.transition).toHaveBeenCalledWith('11', 'SUSPENDED', 'Support hold');
  });

  it('requires and sends a future expiry for a grace transition', async () => {
    mocks.reauth.mockResolvedValue({ accessToken: 'new', reauthenticatedAt: new Date().toISOString() });
    mocks.transition.mockResolvedValue({ id: '20', state: 'GRACE' });
    render(<PlatformCommercialPanel tenant={tenant as never} plans={plans} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByText('platform.commercial.lifecycleOverride'));
    fireEvent.change(screen.getByLabelText('platform.commercial.state'), { target: { value: 'GRACE' } });
    fireEvent.change(screen.getByLabelText('platform.commercial.graceUntil'), { target: { value: '2099-01-02T10:30' } });
    fireEvent.change(screen.getByLabelText('platform.commercial.reason'), { target: { value: 'Payment grace' } });
    fireEvent.change(screen.getByLabelText('platform.commercial.adminPassword'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'platform.commercial.confirmLifecycle' }));

    await waitFor(() =>
      expect(mocks.transition).toHaveBeenCalledWith(
        '11',
        'GRACE',
        'Payment grace',
        new Date('2099-01-02T10:30').toISOString()
      )
    );
  });

  it('requires an explicit paid target for a legacy-compatible tenant', async () => {
    const legacyTenant = {
      ...tenant,
      commercial: {
        ...tenant.commercial,
        plan: { ...tenant.commercial.plan, code: 'LEGACY_COMPAT', name: 'Legacy compatibility' },
      },
    };
    mocks.preview.mockResolvedValue({ targetPlan: 'PRO', canActivate: true, conflicts: [] });
    render(<PlatformCommercialPanel tenant={legacyTenant as never} plans={plans} onChanged={vi.fn()} />);

    const previewButton = screen.getByRole('button', { name: 'platform.commercial.previewChange' }) as HTMLButtonElement;
    expect(previewButton.disabled).toBe(true);
    expect(mocks.preview).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('platform.commercial.targetPlan'), { target: { value: 'PRO' } });
    fireEvent.click(previewButton);
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledWith('11', 'PRO'));
  });

  it('discards a preview that resolves after the target plan changes', async () => {
    let resolvePreview!: (value: { targetPlan: string; canActivate: boolean; conflicts: never[] }) => void;
    mocks.preview.mockReturnValue(
      new Promise((resolve) => {
        resolvePreview = resolve;
      })
    );
    render(<PlatformCommercialPanel tenant={tenant as never} plans={plans} onChanged={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('platform.commercial.targetPlan'), { target: { value: 'PRO' } });
    fireEvent.click(screen.getByRole('button', { name: 'platform.commercial.previewChange' }));
    fireEvent.change(screen.getByLabelText('platform.commercial.targetPlan'), { target: { value: 'BUSINESS' } });
    resolvePreview({ targetPlan: 'PRO', canActivate: true, conflicts: [] });

    await waitFor(() => expect(mocks.preview).toHaveBeenCalledWith('11', 'PRO'));
    expect(screen.queryByRole('button', { name: 'platform.commercial.applyChange' })).toBeNull();
  });
});
