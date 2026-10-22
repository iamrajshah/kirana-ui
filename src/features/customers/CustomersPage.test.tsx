import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CustomersPage } from './CustomersPage';

const query = vi.hoisted(() => ({
  data: { data: [{ id: 'customer-1', name: 'Asha Stores', phone: '9876543210', email: '', credit_balance: 120, is_active: true, created_at: '2026-10-12' }], meta: { total: 1 } } as unknown,
  isError: false,
  refetch: vi.fn(),
  args: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useHistory: () => ({ push: vi.fn() }) }));
vi.mock('@core/hooks', () => ({ useAppSelector: () => ({ roles: ['OWNER'] }) }));
vi.mock('@core/auth/authSlice', () => ({ selectCurrentUser: vi.fn() }));
vi.mock('@core/api/customerApi', () => ({
  useGetCustomersQuery: (args: unknown) => {
    query.args(args);
    return { ...query, isLoading: false, isFetching: false };
  },
  useCreateCustomerMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateCustomerMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('@core/services/notificationService', () => ({ default: { success: vi.fn(), handleApiError: vi.fn() } }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({
  SearchBar: ({ onChange }: { onChange: (value: string) => void }) => <input aria-label="search" onChange={(event) => onChange(event.target.value)} />,
  Input: ({ label }: { label: string }) => <input aria-label={label} />,
  Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
  EmptyState: ({ message, action }: { message: string; action?: React.ReactNode }) => <div>{message}{action}</div>,
  Loading: () => <div>loading</div>,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container, IonContent: Container, IonList: Container, IonLabel: Container,
    IonItem: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <div onClick={onClick}>{children}</div>,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
    IonIcon: Container, IonFab: Container, IonFabButton: Container, IonModal: Container,
    IonButtons: Container, IonToast: Container, IonHeader: Container, IonToolbar: Container,
    IonTitle: Container, IonItemSliding: Container, IonItemOptions: Container, IonItemOption: Container,
    IonInfiniteScroll: Container, IonInfiniteScrollContent: Container,
  };
});

beforeEach(() => {
  query.data = { data: [{ id: 'customer-1', name: 'Asha Stores', phone: '9876543210', email: '', credit_balance: 120, is_active: true, created_at: '2026-10-12' }], meta: { total: 1 } };
  query.isError = false;
  query.refetch.mockClear();
  query.args.mockClear();
});
afterEach(cleanup);

it('shows a visible customer edit action without requiring a swipe', async () => {
  render(<CustomersPage />);
  fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
  expect(await screen.findByText('customers.editCustomer')).toBeTruthy();
});

it('filters customers locally without sending each search value to the API', () => {
  render(<CustomersPage />);
  fireEvent.change(screen.getByRole('textbox', { name: 'search' }), {
    target: { value: 'asha' },
  });
  expect(screen.getByText('Asha Stores')).toBeTruthy();
  expect(query.args.mock.calls.every(([args]) => !('search' in (args as object)))).toBe(true);
  expect(query.args).toHaveBeenLastCalledWith({ skip: 0, take: 1000 });
});

it('distinguishes a failed fetch from an empty customer search and offers retry', () => {
  query.data = undefined;
  query.isError = true;
  render(<CustomersPage />);
  expect(screen.getByText('customers.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});
