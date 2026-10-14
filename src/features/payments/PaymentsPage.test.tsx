import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PaymentsPage } from './PaymentsPage';

const query = vi.hoisted(() => ({ data: undefined as unknown, isError: false, refetch: vi.fn() }));
const createPayment = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@core/api/paymentApi', () => ({
  useGetPaymentsQuery: () => ({ ...query, isLoading: false }),
  useCreatePaymentMutation: () => [createPayment, { isLoading: false }],
}));
vi.mock('@core/api/customerApi', () => ({ useGetCustomersQuery: () => ({ data: { data: [] } }) }));
vi.mock('@core/api/invoiceApi', () => ({
  useLazyGetPendingInvoicesByCustomerQuery: () => [vi.fn(), { data: undefined, isLoading: false }],
}));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({
  Input: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value?: string;
    onChange?: (value: string) => void;
  }) => (
    <input
      aria-label={label}
      value={value || ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
  SearchBar: ({ onChange }: { onChange: (value: string) => void }) => (
    <input aria-label="payment-search" onChange={(event) => onChange(event.target.value)} />
  ),
  Select: ({ label }: { label: string }) => <select aria-label={label} />,
  Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick}>{children}</button>
  ),
  EmptyState: ({ message, action }: { message: string; action?: React.ReactNode }) => (
    <div>
      {message}
      {action}
    </div>
  ),
  Loading: () => <div>loading</div>,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonList: Container,
    IonItem: Container,
    IonLabel: Container,
    IonIcon: Container,
    IonFab: Container,
    IonFabButton: Container,
    IonModal: Container,
    IonButtons: Container,
    IonToast: ({ message, isOpen }: { message: string; isOpen: boolean }) =>
      isOpen ? <div>{message}</div> : null,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonItemDivider: Container,
    IonItemGroup: Container,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
  };
});

beforeEach(() => {
  query.data = undefined;
  query.isError = false;
  query.refetch.mockClear();
  createPayment.mockClear();
});
afterEach(cleanup);

it('distinguishes failed payment history from no collections and can retry', () => {
  query.isError = true;
  render(<PaymentsPage />);
  expect(screen.getByText('payments.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});

it('keeps cached collections visible when their refresh fails', () => {
  query.data = {
    data: [
      {
        id: 'payment-1',
        amount: 250,
        payment_mode: 'CASH',
        created_at: '2026-10-12T08:00:00.000Z',
        customer: { name: 'Asha Stores' },
      },
    ],
  };
  query.isError = true;

  render(<PaymentsPage />);

  expect(screen.getByText('Asha Stores')).toBeTruthy();
  expect(screen.getByText('payments.refreshWarning')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});

it('filters payment history by customer', () => {
  query.data = {
    data: [
      {
        id: 'payment-1',
        amount: 250,
        payment_mode: 'CASH',
        created_at: '2026-10-12T08:00:00.000Z',
        customer: { name: 'Asha Stores' },
      },
      {
        id: 'payment-2',
        amount: 100,
        payment_mode: 'UPI',
        created_at: '2026-10-12T09:00:00.000Z',
        customer: { name: 'Bina Mart' },
      },
    ],
  };
  render(<PaymentsPage />);
  fireEvent.change(screen.getByRole('textbox', { name: 'payment-search' }), {
    target: { value: 'Bina' },
  });
  expect(screen.getByText('Bina Mart')).toBeTruthy();
  expect(screen.queryByText('Asha Stores')).toBeNull();
});

it('identifies this screen as customer collections rather than walk-in billing', () => {
  query.data = { data: [] };
  render(<PaymentsPage />);
  expect(screen.getByText('payments.pageHint')).toBeTruthy();
});

it('keeps manual collection tied to a selected customer', () => {
  query.data = { data: [] };
  render(<PaymentsPage />);
  fireEvent.click(screen.getAllByRole('button', { name: 'payments.recordPayment' })[0]);
  expect(screen.getByLabelText('billing.selectCustomer')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
  expect(screen.getByText('payments.selectCustomerError')).toBeTruthy();
  expect(createPayment).not.toHaveBeenCalled();
});
