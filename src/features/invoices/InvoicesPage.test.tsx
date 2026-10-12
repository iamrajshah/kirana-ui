import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InvoicesPage } from './InvoicesPage';

const query = vi.hoisted(() => ({ data: undefined as unknown, isError: false, refetch: vi.fn() }));
const push = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('react-router-dom', () => ({ useHistory: () => ({ push }) }));
vi.mock('@core/api/invoiceApi', () => ({ useGetInvoicesQuery: () => ({ ...query, isLoading: false, isFetching: false }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({
  SearchBar: () => <input aria-label="search" />,
  Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
  Loading: () => <div>loading</div>,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container, IonContent: Container, IonList: Container, IonBadge: Container,
    IonCard: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
    IonCardContent: Container, IonIcon: Container, IonInfiniteScroll: Container,
    IonInfiniteScrollContent: Container, IonSegment: Container, IonSegmentButton: Container, IonLabel: Container,
  };
});

beforeEach(() => { query.data = undefined; query.isError = false; query.refetch.mockClear(); push.mockClear(); });
afterEach(cleanup);

it('offers a retry when invoices cannot be loaded', () => {
  query.isError = true;
  render(<InvoicesPage />);
  expect(screen.getByText('invoices.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});

it('keeps invoice drill-down from a readable record', () => {
  query.data = { data: [{ id: 'invoice-1', invoice_number: 'INV-101', created_at: '2026-10-12T09:00:00Z', status: 'UNPAID', total_amount: 150, paid_amount: 0, customer: { name: 'Asha Stores', phone: '9876543210' } }], pagination: { total: 1 } };
  render(<InvoicesPage />);
  fireEvent.click(screen.getByRole('button', { name: /INV-101/ }));
  expect(push).toHaveBeenCalledWith('/invoices/invoice-1');
});
