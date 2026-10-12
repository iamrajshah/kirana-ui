import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PurchasesPage from './PurchasesPage';

const state = vi.hoisted(() => ({
  data: { data: [{ id: 'purchase-1', invoice_number: 'INV-1', invoice_date: '2026-10-12', total_amount: 150, paid_amount: 50, status: 'PARTIAL', suppliers: { name: 'Patel Traders' } }] } as unknown,
  isError: false,
  refetch: vi.fn(),
  push: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useHistory: () => ({ push: state.push }) }));
vi.mock('@core/hooks', () => ({ useAppSelector: () => ({ roles: ['OWNER'] }) }));
vi.mock('@core/auth/authSlice', () => ({ selectCurrentUser: vi.fn() }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('../../core/api/purchaseApi', () => ({ useGetPurchasesQuery: () => ({ ...state, isLoading: false }) }));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container, IonContent: Container, IonList: Container, IonCardHeader: Container,
    IonCardTitle: Container, IonCardContent: Container, IonBadge: Container, IonIcon: Container,
    IonSpinner: Container, IonRefresher: Container, IonRefresherContent: Container,
    IonText: Container, IonFab: Container, IonFabButton: Container, IonToolbar: Container,
    IonCard: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
    IonSearchbar: ({ onIonInput }: { onIonInput: (event: { detail: { value: string } }) => void }) => <input aria-label="search" onChange={(event) => onIonInput({ detail: { value: event.target.value } })} />,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
  };
});

beforeEach(() => {
  state.data = { data: [{ id: 'purchase-1', invoice_number: 'INV-1', invoice_date: '2026-10-12', total_amount: 150, paid_amount: 50, status: 'PARTIAL', suppliers: { name: 'Patel Traders' } }] };
  state.isError = false;
  state.refetch.mockClear(); state.push.mockClear();
});
afterEach(cleanup);

it('shows a visible create purchase action and keeps the purchase detail link', () => {
  render(<PurchasesPage />);
  fireEvent.click(screen.getByRole('button', { name: 'purchases.createPurchase' }));
  expect(state.push).toHaveBeenCalledWith('/purchases/create');
  fireEvent.click(screen.getByRole('button', { name: /INV-1/ }));
  expect(state.push).toHaveBeenCalledWith('/purchases/purchase-1');
});

it('offers retry when purchases cannot be loaded', () => {
  state.data = undefined;
  state.isError = true;
  render(<PurchasesPage />);
  expect(screen.getByText('purchases.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(state.refetch).toHaveBeenCalledTimes(1);
});

it('can search by supplier when an older purchase has no invoice number', () => {
  state.data = { data: [{ id: 'purchase-1', invoice_number: null, invoice_date: '2026-10-12', total_amount: 150, paid_amount: 50, status: 'PARTIAL', suppliers: { name: 'Patel Traders' } }] };
  render(<PurchasesPage />);
  fireEvent.change(screen.getByRole('textbox', { name: 'search' }), { target: { value: 'Patel' } });
  expect(screen.getByText('Patel Traders')).toBeTruthy();
});
