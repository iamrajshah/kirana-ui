import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PaymentsPage } from './PaymentsPage';

const query = vi.hoisted(() => ({ data: undefined as unknown, isError: false, refetch: vi.fn() }));
const createPayment = vi.hoisted(() => vi.fn());
const dismissPaymentModal = vi.hoisted(() => vi.fn<[], Promise<void>>());
const pendingInvoicesQuery = vi.hoisted(() => ({
  data: undefined as unknown,
  isLoading: false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@core/api/paymentApi', () => ({
  useGetPaymentsQuery: () => ({ ...query, isLoading: false }),
  useCreatePaymentMutation: () => [createPayment, { isLoading: false }],
}));
const customersQuery = vi.hoisted(() => ({ data: { data: [] as Array<{ id: string; name: string; phone: string }> } }));
const searchCustomers = vi.hoisted(() => vi.fn());

vi.mock('@core/api/customerApi', () => ({
  useLazySearchCustomersQuery: () => [
    searchCustomers,
    { ...customersQuery, isLoading: false, isFetching: false },
  ],
}));
vi.mock('@core/api/invoiceApi', () => ({
  useLazyGetPendingInvoicesByCustomerQuery: () => [vi.fn(), pendingInvoicesQuery],
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
  Select: ({
    label,
    value,
    onChange,
    options = [],
  }: {
    label: string;
    value?: string;
    onChange?: (value: string) => void;
    options?: Array<{ value: string; label: string }>;
  }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
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
  const IonModal = React.forwardRef<
    { dismiss: () => Promise<void> },
    PropsWithChildren<{ isOpen?: boolean }>
  >(({ children, isOpen }, ref) => {
    React.useImperativeHandle(ref, () => ({ dismiss: dismissPaymentModal }));
    return (
      <div data-testid="payment-modal" data-open={String(Boolean(isOpen))}>
        {children}
      </div>
    );
  });
  return {
    IonPage: Container,
    IonContent: Container,
    IonList: Container,
    IonItem: Container,
    IonLabel: Container,
    IonIcon: Container,
    IonFab: Container,
    IonFabButton: Container,
    IonModal,
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
  dismissPaymentModal.mockReset();
  dismissPaymentModal.mockResolvedValue();
  customersQuery.data = { data: [] };
  searchCustomers.mockClear();
  pendingInvoicesQuery.data = undefined;
  pendingInvoicesQuery.isLoading = false;
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

it('searches customers lazily only after two debounced characters', async () => {
  query.data = { data: [] };
  render(<PaymentsPage />);
  fireEvent.click(screen.getAllByRole('button', { name: 'payments.recordPayment' })[0]);

  const customerSearch = screen.getByLabelText('payments.searchCustomers');
  fireEvent.change(customerSearch, { target: { value: 'a' } });
  expect(searchCustomers).not.toHaveBeenCalled();
  expect(screen.getByText('payments.customerSearchMinimum')).toBeTruthy();

  fireEvent.change(customerSearch, { target: { value: 'amit' } });
  await waitFor(() => expect(searchCustomers).toHaveBeenCalledWith('amit', true));
});

it('keeps the Ionic modal mounted while its successful dismissal completes', async () => {
  query.data = { data: [] };
  customersQuery.data = {
    data: [{ id: 'customer-1', name: 'Amit Patel', phone: '9000000201' }],
  };
  createPayment.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: 'payment-1' } }) });
  let completeDismissal: (() => void) | undefined;
  dismissPaymentModal.mockReturnValue(
    new Promise<void>((resolve) => {
      completeDismissal = resolve;
    })
  );

  render(<PaymentsPage />);

  expect(screen.getByTestId('payment-modal').getAttribute('data-open')).toBe('false');
  fireEvent.click(screen.getAllByRole('button', { name: 'payments.recordPayment' })[0]);
  fireEvent.change(screen.getByLabelText('payments.searchCustomers'), {
    target: { value: 'Amit' },
  });
  await waitFor(() => expect(screen.getByRole('option', { name: 'Amit Patel (9000000201)' })).toBeTruthy());
  fireEvent.change(screen.getByLabelText('billing.selectCustomer'), {
    target: { value: 'customer-1' },
  });
  fireEvent.change(screen.getByLabelText('common.amount'), { target: { value: '100' } });
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

  await waitFor(() => expect(dismissPaymentModal).toHaveBeenCalledOnce());
  expect(screen.getByTestId('payment-modal').getAttribute('data-open')).toBe('true');
  expect(screen.queryByText('payments.paymentRecorded')).toBeNull();

  completeDismissal?.();
  await waitFor(() => {
    expect(screen.getByTestId('payment-modal').getAttribute('data-open')).toBe('false');
  });
  expect(screen.getByText('payments.paymentRecorded')).toBeTruthy();
});

it('explains that an unassigned collection settles oldest bills first', async () => {
  query.data = { data: [] };
  customersQuery.data = {
    data: [{ id: 'customer-1', name: 'Amit Patel', phone: '9000000201' }],
  };
  pendingInvoicesQuery.data = {
    data: [
      {
        id: 'invoice-1',
        invoice_number: 'INV-1',
        total_amount: 500,
        paid_amount: 0,
        status: 'UNPAID',
      },
    ],
  };

  render(<PaymentsPage />);
  fireEvent.click(screen.getAllByRole('button', { name: 'payments.recordPayment' })[0]);
  fireEvent.change(screen.getByLabelText('payments.searchCustomers'), {
    target: { value: 'Amit' },
  });
  await waitFor(() => expect(screen.getByRole('option', { name: 'Amit Patel (9000000201)' })).toBeTruthy());
  fireEvent.change(screen.getByLabelText('billing.selectCustomer'), {
    target: { value: 'customer-1' },
  });

  expect(screen.getByText('payments.oldestFirstHint')).toBeTruthy();
  expect(screen.getByRole('option', { name: 'payments.generalPayment' })).toBeTruthy();
});
