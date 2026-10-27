// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformLeadPanel } from './PlatformLeadPanel';

const mocks = vi.hoisted(() => ({
  listLeads: vi.fn(),
  getLead: vi.fn(),
  activate: vi.fn(),
  reauth: vi.fn(),
  repair: vi.fn(),
  decideDeletion: vi.fn(),
  previewCleanup: vi.fn(),
  cleanup: vi.fn(),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/api/platformApi', () => ({
  platformApi: {
    listLeads: (...args: unknown[]) => mocks.listLeads(...args),
    getLeadDetails: (...args: unknown[]) => mocks.getLead(...args),
    activateLead: (...args: unknown[]) => mocks.activate(...args),
    reauthenticate: (...args: unknown[]) => mocks.reauth(...args),
    repairIdentityMembership: (...args: unknown[]) => mocks.repair(...args),
    decideDeletionRequest: (...args: unknown[]) => mocks.decideDeletion(...args),
    previewDemoCleanup: (...args: unknown[]) => mocks.previewCleanup(...args),
    executeDemoCleanup: (...args: unknown[]) => mocks.cleanup(...args),
  },
}));
const lead = {
  id: '5',
  status: 'QUALIFIED',
  email: 'owner@example.com',
  phone: '9876543210',
  shopName: 'Prospect Shop',
  source: 'GOOGLE',
  identity: { id: '9', name: 'Owner', provider: 'google', lastSignInAt: '2026-10-27' },
  demo: {
    status: 'READY',
    stage: 'VERIFIED',
    createdAt: '2026-10-20',
    completedAt: '2026-10-20',
    expiresAt: '2026-10-27',
  },
  milestones: [{ code: 'FIRST_BILL', firstObservedAt: '2026-10-21' }],
};
const secondLead = {
  ...lead,
  id: '6',
  email: 'second@example.com',
  shopName: 'Second Prospect',
  identity: { ...lead.identity, id: '10', name: 'Second Owner' },
};
const plans = [{ code: 'PRO', name: 'Pro', version: 1 }] as never;
const detail = {
  ...lead,
  identity: {
    id: '9',
    name: 'Owner',
    email: 'owner@example.com',
    status: 'ACTIVE',
    providers: [{ provider: 'google', lastSeenAt: '2026-10-27' }],
    memberships: [],
  },
  demo: null,
  milestones: lead.milestones.map((item) => ({ ...item, metadata: null })),
  conversions: [],
  deletionRequests: [
    { id: '31', status: 'PENDING', requestedAt: '2026-10-27', resolvedAt: null, notes: null },
  ],
};
const secondDetail = {
  ...detail,
  ...secondLead,
  identity: {
    ...detail.identity,
    id: '10',
    name: 'Second Owner',
    email: 'second@example.com',
    providers: [{ provider: 'google-second', lastSeenAt: '2026-10-27' }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listLeads.mockResolvedValue([lead]);
  mocks.getLead.mockResolvedValue(detail);
  mocks.reauth.mockResolvedValue({ accessToken: 'new' });
});
afterEach(cleanup);

describe('PlatformLeadPanel', () => {
  it('shows lead activity and recovers an idempotent activation response', async () => {
    mocks.activate.mockResolvedValue({ idempotent: true, conversionId: '8', tenant: { id: '11' } });
    render(<PlatformLeadPanel plans={plans} onActivated={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Prospect Shop/ }));
    fireEvent.click(screen.getByRole('button', { name: 'platform.commercial.activate' }));
    expect(await screen.findByText('platform.commercial.activationRecovered')).toBeTruthy();
    expect(mocks.activate).toHaveBeenCalledWith(
      '5',
      expect.objectContaining({ planCode: 'PRO', billingCycle: 'YEARLY' })
    );
  });

  it('requires explicit repair confirmation and server reauthentication', async () => {
    mocks.repair.mockResolvedValue({ sessionsRevoked: true });
    render(<PlatformLeadPanel plans={plans} onActivated={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Prospect Shop/ }));
    fireEvent.click(screen.getByText('platform.commercial.repairMembership'));
    fireEvent.change(screen.getByLabelText('platform.commercial.userId'), {
      target: { value: '22' },
    });
    fireEvent.change(screen.getByLabelText('platform.commercial.tenantId'), {
      target: { value: '11' },
    });
    fireEvent.change(screen.getByLabelText('platform.commercial.reason'), {
      target: { value: 'Wrong membership' },
    });
    fireEvent.change(screen.getByLabelText('platform.commercial.adminPassword'), {
      target: { value: 'secret' },
    });
    expect(
      (screen.getByRole('button', { name: 'platform.commercial.repair' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    fireEvent.click(screen.getByLabelText('platform.commercial.confirmRepair'));
    fireEvent.click(screen.getByRole('button', { name: 'platform.commercial.repair' }));
    await waitFor(() => expect(mocks.reauth).toHaveBeenCalledWith('secret'));
    expect(mocks.repair).toHaveBeenCalledWith('9', '22', '11', 'Wrong membership');
  });

  it('requires confirmation and recent server reauthentication for a deletion decision', async () => {
    mocks.decideDeletion.mockResolvedValue({ id: '31', status: 'REJECTED' });
    render(<PlatformLeadPanel plans={plans} onActivated={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Prospect Shop/ }));
    fireEvent.click(await screen.findByText('platform.commercial.deletionHandling'));
    fireEvent.change(screen.getByLabelText('platform.commercial.deletionRequest'), {
      target: { value: '31' },
    });
    fireEvent.change(screen.getByLabelText('platform.commercial.decision'), {
      target: { value: 'REJECTED' },
    });
    fireEvent.change(screen.getByLabelText('platform.commercial.notes'), {
      target: { value: 'Verified duplicate request' },
    });
    fireEvent.change(screen.getAllByLabelText('platform.commercial.adminPassword').at(-1)!, {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByLabelText('platform.commercial.confirmDeletion'));
    fireEvent.click(screen.getByRole('button', { name: 'platform.commercial.applyDecision' }));
    await waitFor(() => expect(mocks.reauth).toHaveBeenCalledWith('secret'));
    expect(mocks.decideDeletion).toHaveBeenCalledWith(
      '31',
      'REJECTED',
      'Verified duplicate request'
    );
  });

  it('keeps the newest selected lead when an older details request resolves late', async () => {
    let resolveFirst!: (value: typeof detail) => void;
    mocks.listLeads.mockResolvedValue([lead, secondLead]);
    mocks.getLead.mockImplementation((id: string) =>
      id === '5'
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve(secondDetail)
    );
    render(<PlatformLeadPanel plans={plans} onActivated={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Prospect Shop/ }));
    fireEvent.click(screen.getByRole('button', { name: /Second Prospect/ }));
    expect(await screen.findByText(/google-second/)).toBeTruthy();

    resolveFirst(detail);
    await waitFor(() => expect(screen.getByText(/google-second/)).toBeTruthy());
    expect(screen.queryByText(/^google$/)).toBeNull();
  });

  it('clears sensitive confirmations whenever another lead is selected', async () => {
    mocks.listLeads.mockResolvedValue([lead, secondLead]);
    mocks.getLead.mockImplementation((id: string) =>
      Promise.resolve(id === '5' ? detail : secondDetail)
    );
    render(<PlatformLeadPanel plans={plans} onActivated={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Prospect Shop/ }));
    fireEvent.click(screen.getByText('platform.commercial.repairMembership'));
    fireEvent.click(screen.getByLabelText('platform.commercial.confirmRepair'));
    fireEvent.click(await screen.findByText('platform.commercial.deletionHandling'));
    fireEvent.click(screen.getByLabelText('platform.commercial.confirmDeletion'));

    fireEvent.click(screen.getByRole('button', { name: /Second Prospect/ }));
    await screen.findByText(/google-second/);
    expect((screen.getByLabelText('platform.commercial.confirmRepair') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('platform.commercial.confirmDeletion') as HTMLInputElement).checked).toBe(false);
  });
});
