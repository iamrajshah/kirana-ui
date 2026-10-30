import React, { type PropsWithChildren } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CustomersPage } from './CustomersPage';

const query = vi.hoisted(() => ({
  data: { data: [{ id: 'customer-1', name: 'Asha Stores', phone: '9876543210', email: '', credit_balance: 120, is_active: true, created_at: '2026-10-12' }], meta: { total: 1 } } as unknown,
  isError: false,
  failAtSkip: null as number | null,
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
    const failed = query.isError || query.failAtSkip === (args as { skip: number }).skip;
    return { ...query, currentData: failed ? undefined : query.data, isError: failed, isLoading: false, isFetching: false };
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
    IonInfiniteScroll: ({ children, onIonInfinite, disabled }: PropsWithChildren<{ onIonInfinite?: (event: CustomEvent) => void; disabled?: boolean }>) => (
      <button aria-label="load-more" disabled={disabled} onClick={() => onIonInfinite?.({ target: { complete: vi.fn() } } as unknown as CustomEvent)}>{children}</button>
    ),
    IonInfiniteScrollContent: Container,
  };
});

beforeEach(() => {
  query.data = { data: [{ id: 'customer-1', name: 'Asha Stores', phone: '9876543210', email: '', credit_balance: 120, is_active: true, created_at: '2026-10-12' }], meta: { total: 1 } };
  query.isError = false;
  query.failAtSkip = null;
  query.refetch.mockClear();
  query.args.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('shows a visible customer edit action without requiring a swipe', async () => {
  render(<CustomersPage />);
  fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
  expect(await screen.findByText('customers.editCustomer')).toBeTruthy();
});

it('filters customers locally before sending the debounced search to the API', () => {
  vi.useFakeTimers();
  render(<CustomersPage />);
  fireEvent.change(screen.getByRole('textbox', { name: 'search' }), {
    target: { value: 'asha' },
  });
  expect(screen.getByText('Asha Stores')).toBeTruthy();
  expect(query.args.mock.calls.every(([args]) => !('search' in (args as object)))).toBe(true);
  expect(query.args).toHaveBeenLastCalledWith({ skip: 0, take: 50 });

  act(() => vi.advanceTimersByTime(300));
  expect(query.args).toHaveBeenLastCalledWith({ skip: 0, take: 50, search: 'asha' });
});

it('loads customers in 50-row pages', async () => {
  query.data = { data: [{ id: 'customer-1', name: 'Asha Stores', phone: '9876543210', email: '', credit_balance: 120, is_active: true, created_at: '2026-10-12' }], meta: { total: 100 } };
  render(<CustomersPage />);

  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  await waitFor(() => expect(query.args).toHaveBeenLastCalledWith({ skip: 50, take: 50 }));
});

it('keeps loaded customers visible and offers retry when a later page fails', async () => {
  query.data = { data: [{ id: 'customer-1', name: 'Asha Stores', phone: '9876543210', email: '', credit_balance: 120, is_active: true, created_at: '2026-10-12' }], meta: { total: 100 } };
  query.failAtSkip = 50;
  render(<CustomersPage />);

  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  expect(await screen.findByText('common.loadMoreError')).toBeTruthy();
  expect(screen.getByText('Asha Stores')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});

it('distinguishes a failed fetch from an empty customer search and offers retry', () => {
  query.data = undefined;
  query.isError = true;
  render(<CustomersPage />);
  expect(screen.getByText('customers.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});
