import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SuppliersPage from './SuppliersPage';

const state = vi.hoisted(() => ({
  data: {
    data: [
      {
        id: 'supplier-1',
        name: 'Patel Traders',
        phone: '9876543210',
        email: null,
        address: null,
        balance: 120,
        default_purchase_firm_id: '2',
        balances_by_firm: [{ firm_id: '2', balance: 120, firm: { id: '2', code: 'JT', legal_name: 'Jitendra Trading', display_name: 'Jitendra Trading', is_active: true, is_default_sales: false } }],
      },
    ],
    meta: { total: 1 },
  } as unknown,
  isError: false,
  refetch: vi.fn(),
  push: vi.fn(),
  makePayment: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useHistory: () => ({ push: state.push }) }));
vi.mock('@core/hooks', () => ({ useAppSelector: () => ({ roles: ['OWNER'] }) }));
vi.mock('@core/auth/authSlice', () => ({ selectCurrentUser: vi.fn() }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/api/supplierApi', () => ({
  useGetSuppliersQuery: () => ({ ...state, isLoading: false, isFetching: false }),
  useCreateSupplierMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateSupplierMutation: () => [vi.fn(), { isLoading: false }],
  useMakeSupplierPaymentMutation: () => [state.makePayment, { isLoading: false }],
}));
vi.mock('@core/api/firmApi', () => ({ useGetFirmsQuery: () => ({ data: { data: { firms: [] } } }) }));
vi.mock('@core/services/notificationService', () => ({
  default: { warning: vi.fn(), success: vi.fn(), handleApiError: vi.fn() },
}));
vi.mock('../../components', () => ({
  SearchBar: ({ onChange }: { onChange: (value: string) => void }) => (
    <input aria-label="search" onChange={(event) => onChange(event.target.value)} />
  ),
  Input: ({ label, onChange }: { label: string; onChange?: (value: string) => void }) => (
    <input aria-label={label} onChange={(event) => onChange?.(event.target.value)} />
  ),
  Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonList: Container,
    IonItem: Container,
    IonLabel: Container,
    IonText: Container,
    IonFab: Container,
    IonFabButton: Container,
    IonIcon: Container,
    IonSpinner: Container,
    IonRefresher: Container,
    IonRefresherContent: Container,
    IonButtons: Container,
    IonModal: Container,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonItemSliding: Container,
    IonItemOptions: Container,
    IonSelect: Container,
    IonSelectOption: Container,
    IonInfiniteScroll: Container,
    IonInfiniteScrollContent: Container,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
    IonItemOption: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
  };
});

beforeEach(() => {
  state.data = {
    data: [
      {
        id: 'supplier-1',
        name: 'Patel Traders',
        phone: '9876543210',
        email: null,
        address: null,
        balance: 120,
        default_purchase_firm_id: '2',
        balances_by_firm: [{ firm_id: '2', balance: 120, firm: { id: '2', code: 'JT', legal_name: 'Jitendra Trading', display_name: 'Jitendra Trading', is_active: true, is_default_sales: false } }],
      },
    ],
    meta: { total: 1 },
  };
  state.isError = false;
  state.refetch.mockClear();
  state.push.mockClear();
  state.makePayment.mockClear();
});
afterEach(cleanup);

it('shows named supplier actions and opens payment for the selected supplier', () => {
  render(<SuppliersPage />);
  fireEvent.click(screen.getByRole('button', { name: 'suppliers.viewLedger' }));
  expect(state.push).toHaveBeenCalledWith('/suppliers/supplier-1/ledger');
  fireEvent.click(screen.getByRole('button', { name: 'suppliers.makePayment' }));
  expect(screen.getByText('suppliers.outstandingBalance')).toBeTruthy();
});

it('offers retry when suppliers cannot be loaded', () => {
  state.data = undefined;
  state.isError = true;
  render(<SuppliersPage />);
  expect(screen.getByText('suppliers.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(state.refetch).toHaveBeenCalledTimes(1);
});

it('restores suppliers immediately after clearing a no-result search', () => {
  render(<SuppliersPage />);
  const search = screen.getByRole('textbox', { name: 'search' });
  fireEvent.change(search, { target: { value: 'missing' } });
  expect(screen.queryByText('Patel Traders')).toBeNull();
  fireEvent.change(search, { target: { value: '' } });
  expect(screen.getByText('Patel Traders')).toBeTruthy();
});

it('records a supplier-list payment against the preselected firm', () => {
  render(<SuppliersPage />);
  fireEvent.click(screen.getByRole('button', { name: 'suppliers.makePayment' }));
  fireEvent.change(screen.getByLabelText('suppliers.amountLabel'), { target: { value: '100' } });
  fireEvent.click(screen.getByRole('button', { name: 'suppliers.ledger.recordPayment' }));
  expect(state.makePayment).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'supplier-1', firm_id: 2, amount: 100 })
  );
});

it('offers payment for a positive firm balance even when an advance offsets the aggregate', () => {
  state.data = {
    data: [{
      id: 'supplier-1', name: 'Patel Traders', phone: '9876543210', email: null,
      address: null, balance: 0, default_purchase_firm_id: '2',
      balances_by_firm: [
        { firm_id: '2', balance: 120, firm: { id: '2', code: 'JT', legal_name: 'Jitendra Trading', display_name: 'Jitendra Trading', is_active: true, is_default_sales: false } },
        { firm_id: '3', balance: -120, firm: { id: '3', code: 'JY', legal_name: 'Jayesh Trading', display_name: 'Jayesh Trading', is_active: true, is_default_sales: false } },
      ],
    }],
    meta: { total: 1 },
  };
  render(<SuppliersPage />);
  expect(screen.getByRole('button', { name: 'suppliers.makePayment' })).toBeTruthy();
  expect(screen.getByText(/Jitendra Trading/)).toBeTruthy();
  expect(screen.getByText(/Jayesh Trading/)).toBeTruthy();
});
