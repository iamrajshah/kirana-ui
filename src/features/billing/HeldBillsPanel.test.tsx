import React, { type ButtonHTMLAttributes, type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeldBillsPanel } from './HeldBillsPanel';

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  release: vi.fn(),
  takeover: vi.fn(),
  refetch: vi.fn(),
  bills: [] as Array<Record<string, unknown>>,
}));

const trigger = (operation: ReturnType<typeof vi.fn>) => (payload: unknown) => ({
  unwrap: () => operation(payload),
});

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/api/invoiceApi', () => ({
  useGetHeldBillsQuery: () => ({
    data: { success: true, data: mocks.bills },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: mocks.refetch,
  }),
  useClaimHeldBillMutation: () => [trigger(mocks.claim), { isLoading: false }],
  useReleaseHeldBillMutation: () => [trigger(mocks.release), { isLoading: false }],
  useTakeoverHeldBillMutation: () => [trigger(mocks.takeover), { isLoading: false }],
}));
vi.mock('@core/services/notificationService', () => ({
  default: { error: vi.fn(), success: vi.fn() },
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('@utils/helpers', () => ({ formatCurrency: (value: number) => `INR ${value}` }));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const IonButton = ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  );
  return { IonButton, IonIcon: () => null, IonSpinner: Container };
});
vi.mock('ionicons/icons', () => ({ close: 'close', refresh: 'refresh' }));

const heldBill = (overrides: Record<string, unknown> = {}) => ({
  id: '41',
  invoice_number: 'DRAFT-41',
  total_amount: 325,
  gst_amount: 0,
  status: 'DRAFT',
  created_at: '2026-10-12T10:00:00.000Z',
  held_at: '2026-10-12T10:00:00.000Z',
  version: 3,
  item_count: 2,
  lease_state: 'unclaimed',
  holder: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.bills = [];
  mocks.claim.mockResolvedValue({ data: heldBill({ version: 4, held_by: '7' }) });
  mocks.release.mockResolvedValue({ data: heldBill({ version: 4 }) });
  mocks.takeover.mockResolvedValue({ data: heldBill({ version: 4, held_by: '7' }) });
});

afterEach(cleanup);

describe('HeldBillsPanel', () => {
  it('places a dashboard-linked bill first and marks it for attention', () => {
    mocks.bills = [heldBill({ id: '40' }), heldBill({ id: '41' })];

    render(
      <HeldBillsPanel
        currentUser={{ id: '7', name: 'Rajesh', roles: ['CASHIER'] }}
        counterLabel="Counter 2"
        onRequestCounterLabel={() => 'Counter 2'}
        onResume={vi.fn()}
        onClose={vi.fn()}
        focusBillId="41"
      />
    );

    const cards = screen.getAllByRole('article');
    expect(cards[0].getAttribute('data-highlighted')).toBe('true');
  });

  it('claims an unclaimed bill with the saved counter and resumes the returned version', async () => {
    mocks.bills = [heldBill()];
    const onResume = vi.fn();

    render(
      <HeldBillsPanel
        currentUser={{ id: '7', name: 'Rajesh', roles: ['CASHIER'] }}
        counterLabel="Counter 2"
        onRequestCounterLabel={() => 'Counter 2'}
        onResume={onResume}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'billing.heldBills.claim' }));

    await waitFor(() =>
      expect(mocks.claim).toHaveBeenCalledWith({
        id: '41',
        counter_label: 'Counter 2',
        expected_version: 3,
      })
    );
    expect(onResume).toHaveBeenCalledWith(expect.objectContaining({ id: '41', version: 4 }));
  });

  it('shows takeover only to a manager when another staff member owns an active lease', () => {
    mocks.bills = [
      heldBill({
        lease_state: 'active',
        holder: { id: '9', name: 'Asha' },
        held_by: '9',
        held_counter: 'Counter 1',
      }),
    ];

    const { rerender } = render(
      <HeldBillsPanel
        currentUser={{ id: '7', name: 'Rajesh', roles: ['CASHIER'] }}
        counterLabel="Counter 2"
        onRequestCounterLabel={() => 'Counter 2'}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('billing.heldBills.readOnly')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'billing.heldBills.takeOver' })).toBeNull();

    rerender(
      <HeldBillsPanel
        currentUser={{ id: '7', name: 'Rajesh', roles: ['MANAGER'] }}
        counterLabel="Counter 2"
        onRequestCounterLabel={() => 'Counter 2'}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'billing.heldBills.takeOver' })).toBeTruthy();
  });

  it('confirms local changes before releasing the open bill', async () => {
    mocks.bills = [
      heldBill({ lease_state: 'active', holder: { id: '7', name: 'Rajesh' }, held_by: '7' }),
    ];
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <HeldBillsPanel
        currentUser={{ id: '7', name: 'Rajesh', roles: ['CASHIER'] }}
        counterLabel="Counter 2"
        onRequestCounterLabel={() => 'Counter 2'}
        onResume={vi.fn()}
        onClose={vi.fn()}
        editingInvoiceId="41"
        editingHasChanges
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'billing.heldBills.release' }));
    expect(confirm).toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
  });
});
