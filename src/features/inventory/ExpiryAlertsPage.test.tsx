import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExpiryAlertsPage from './ExpiryAlertsPage';

const state = vi.hoisted(() => ({
  push: vi.fn(),
  refetch: vi.fn(),
  adjust: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useHistory: () => ({ push: state.push }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/auth/authSlice', () => ({
  selectCurrentUser: 'current-user-selector',
  selectCommercialAccess: 'commercial-selector',
}));
vi.mock('@core/hooks', () => ({
  useAppSelector: (selector: string) =>
    selector === 'current-user-selector' ? { roles: ['OWNER'] } : { status: 'ACTIVE' },
}));
vi.mock('@core/commercial/commercialAccess', () => ({
  canUseCommercialFeature: () => true,
}));
vi.mock('@core/permissions/permissions', () => ({ hasPermission: () => true }));
vi.mock('@core/services/notificationService', () => ({
  apiErrorMessage: () => 'expiry.adjustFailed',
}));
vi.mock('@core/api/expiryApi', () => ({
  useAdjustExpiryBatchMutation: () => [state.adjust, { isLoading: false }],
  useGetExpiryAlertsQuery: () => ({
    data: {
      data: {
        summary: {
          expiredBatches: 1,
          nearExpiryBatches: 1,
          affectedUnits: 9,
          affectedValue: 540,
          valuationEstimated: true,
        },
        batches: [
          {
            id: 'batch-1',
            productId: '42',
            productName: 'Groundnut oil',
            sku: 'OIL-1',
            batchNumber: 'LOT-9',
            expiryDate: '2026-11-20',
            quantity: 6,
            daysToExpiry: 16,
            state: 'NEAR_EXPIRY',
          },
          {
            id: 'batch-2',
            productId: '43',
            productName: 'Milk powder',
            sku: 'MILK-1',
            batchNumber: 'LOT-2',
            expiryDate: '2026-10-30',
            quantity: 3,
            daysToExpiry: -5,
            state: 'EXPIRED',
          },
        ],
      },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: state.refetch,
  }),
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonRefresher: Container,
    IonRefresherContent: Container,
    IonBadge: Container,
    IonIcon: Container,
    IonSelect: Container,
    IonSelectOption: Container,
    IonModal: ({ children, isOpen }: PropsWithChildren<{ isOpen?: boolean }>) =>
      isOpen ? <div role="dialog">{children}</div> : null,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
  };
});

afterEach(() => {
  cleanup();
  state.push.mockClear();
  state.refetch.mockReset();
  state.adjust.mockReset();
});

it('requires an explicit reason and confirmation before writing off a batch', async () => {
  state.adjust.mockReturnValue({ unwrap: () => Promise.resolve({ data: { batchId: 'batch-2' } }) });
  state.refetch.mockResolvedValue(undefined);
  render(<ExpiryAlertsPage />);

  fireEvent.click(screen.getAllByRole('button', { name: 'expiry.writeOff' })[0]);
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('expiry.adjustQuantity'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('expiry.adjustReason'), {
    target: { value: 'Expired stock removed from shelf' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'expiry.confirmWriteOff' }));

  expect(state.adjust).toHaveBeenCalledWith(
    expect.objectContaining({
      batchId: 'batch-2',
      quantity: 2,
      disposition: 'EXPIRED',
      reason: 'Expired stock removed from shelf',
      idempotencyKey: expect.stringMatching(/^.{8,}$/),
    })
  );
});

describe.each([
  ['mobile', 390],
  ['tablet', 768],
  ['web', 1440],
])('ExpiryAlertsPage on %s', (_device, width) => {
  it('keeps the summary, batch state and product action available', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    render(<ExpiryAlertsPage />);

    expect(screen.getByText('expiry.expired')).toBeTruthy();
    expect(screen.getByText('expiry.nearExpiry')).toBeTruthy();
    expect(screen.getByText('expiry.stockAtRiskEstimated')).toBeTruthy();
    expect(screen.getByText('expiry.valuationEstimatedHint')).toBeTruthy();
    expect(screen.getByText('Groundnut oil')).toBeTruthy();
    const groundnutRow = screen.getByText('Groundnut oil').closest('article');
    expect(groundnutRow).toBeTruthy();
    fireEvent.click(within(groundnutRow!).getByRole('button', { name: 'expiry.reviewProduct' }));
    expect(state.push).toHaveBeenCalledWith('/products/42');
  });
});
