import React, { type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingPage } from './BillingPage';

const mocks = vi.hoisted(() => ({
  historyReplace: vi.fn(),
  createInvoice: vi.fn(),
  cancelInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  finalizeInvoice: vi.fn(),
  createPayment: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const mutation = (operation: ReturnType<typeof vi.fn>) => (payload: unknown) => ({
  unwrap: () => operation(payload),
});

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ replace: mocks.historyReplace }),
  useLocation: () => ({ search: '?edit=edit-1' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@components/Navbar', () => ({ Navbar: () => null }));

vi.mock('@components', () => ({
  Loading: () => null,
  SearchBar: () => null,
  PaymentModal: ({
    isOpen,
    onClose,
    onPayment,
  }: {
    isOpen: boolean;
    onClose: () => void | Promise<void>;
    onPayment: (amount: number, mode: 'CASH') => Promise<void>;
  }) =>
    isOpen ? (
      <div aria-label="payment-recovery">
        <button onClick={() => void onPayment(100, 'CASH')}>retry payment</button>
        <button onClick={() => void onClose()}>cancel checkout</button>
      </div>
    ) : null,
}));

vi.mock('@core/api/invoiceApi', () => ({
  useCreateInvoiceMutation: () => [mutation(mocks.createInvoice), { isLoading: false }],
  useCancelInvoiceMutation: () => [mutation(mocks.cancelInvoice), { isLoading: false }],
  useUpdateInvoiceMutation: () => [mutation(mocks.updateInvoice), { isLoading: false }],
  useFinalizeInvoiceMutation: () => [mutation(mocks.finalizeInvoice), { isLoading: false }],
  useGetInvoiceByIdQuery: () => ({
    data: {
      data: {
        id: 'edit-1',
        customer: null,
        gst_amount: 0,
        discount_amount: 0,
        items: [
          {
            variant_id: 'variant-1',
            quantity: 1,
            unit_price: 100,
            discount_amount: 0,
            variant: { sku: 'RICE-1', product: { name: 'Rice' } },
          },
        ],
      },
    },
    isLoading: false,
  }),
}));

vi.mock('@core/api/paymentApi', () => ({
  useCreatePaymentMutation: () => [mutation(mocks.createPayment), { isLoading: false }],
}));

vi.mock('@core/api/customerApi', () => ({
  useLazySearchCustomersQuery: () => [vi.fn(), { data: undefined, isLoading: false }],
}));

vi.mock('@core/api/productApi', () => ({
  useLazySearchVariantsQuery: () => [vi.fn(), { data: undefined, isLoading: false }],
}));

vi.mock('@core/services/notificationService', () => ({
  default: { error: mocks.notifyError, success: mocks.notifySuccess },
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

vi.mock('ionicons/icons', () => ({
  add: 'add',
  bookmark: 'bookmark',
  card: 'card',
  cash: 'cash',
  personAdd: 'personAdd',
  remove: 'remove',
  scan: 'scan',
  trash: 'trash',
}));

vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const IonButton = ({ children, onClick, disabled }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
  const IonItem = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  );
  return {
    IonButton,
    IonItem,
    IonIcon: () => null,
    IonPage: Container,
    IonContent: Container,
    IonCard: Container,
    IonCardContent: Container,
    IonLabel: Container,
    IonList: Container,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
  mocks.finalizeInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
  mocks.cancelInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
});

afterEach(cleanup);

describe('BillingPage checkout recovery', () => {
  it('opens recovery after quick payment fails and completes the same invoice on retry', async () => {
    mocks.createPayment
      .mockRejectedValueOnce(new Error('payment unavailable'))
      .mockResolvedValueOnce({ data: { id: 'payment-1' } });

    render(<BillingPage />);
    await screen.findByText('Rice');

    fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));

    await screen.findByLabelText('payment-recovery');
    expect(mocks.createPayment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ invoice_id: 'edit-1', amount: 100, payment_mode: 'CASH' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'retry payment' }));

    await waitFor(() => expect(mocks.createPayment).toHaveBeenCalledTimes(2));
    expect(mocks.createPayment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ invoice_id: 'edit-1', amount: 100, payment_mode: 'CASH' })
    );
    await waitFor(() => expect(screen.queryByLabelText('payment-recovery')).toBeNull());
    expect(mocks.historyReplace).toHaveBeenCalledWith('/billing');
  });

  it('keeps recovery available after cancellation fails and clears the edit route after retry', async () => {
    mocks.createPayment.mockRejectedValueOnce(new Error('payment unavailable'));
    mocks.cancelInvoice
      .mockRejectedValueOnce(new Error('cancel unavailable'))
      .mockResolvedValueOnce({ data: { id: 'edit-1' } });

    render(<BillingPage />);
    await screen.findByText('Rice');
    fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));
    await screen.findByLabelText('payment-recovery');

    fireEvent.click(screen.getByRole('button', { name: 'cancel checkout' }));
    await waitFor(() => expect(mocks.cancelInvoice).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('payment-recovery')).toBeTruthy();
    expect(mocks.historyReplace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'cancel checkout' }));

    await waitFor(() => expect(mocks.cancelInvoice).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByLabelText('payment-recovery')).toBeNull());
    expect(mocks.historyReplace).toHaveBeenCalledWith('/billing');
  });
});
