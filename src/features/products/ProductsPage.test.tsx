import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProductsPage } from './ProductsPage';

const state = vi.hoisted(() => ({
  data: { data: [{ id: 'product-1', name: 'Rice', category: { name: 'Staples' }, is_active: true, variants: [{ id: 'variant-1', sku: 'RICE-1', price: 50 }] }], meta: { total: 1 } } as unknown,
  isError: false,
  refetch: vi.fn(),
  push: vi.fn(),
  query: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useHistory: () => ({ push: state.push }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/api/productApi', () => ({
  useGetProductsQuery: (args: unknown) => { state.query(args); return { ...state, isLoading: false, isFetching: false }; },
  useCreateProductMutation: () => [vi.fn(), { isLoading: false }],
  useCreateVariantMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('@core/api/categoryApi', () => ({ useGetCategoriesQuery: () => ({ data: { data: [] } }) }));
vi.mock('@components', () => ({
  SearchBar: ({ onChange }: { onChange: (value: string) => void }) => <input aria-label="search" onChange={(event) => onChange(event.target.value)} />,
  Loading: () => <div>loading</div>, EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
  Input: ({ label }: { label: string }) => <input aria-label={label} />,
  Select: () => <select />, AddCategoryModal: () => null,
  Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container, IonContent: Container, IonList: Container, IonItem: Container,
    IonLabel: Container, IonBadge: Container, IonIcon: Container, IonFab: Container,
    IonFabButton: Container, IonModal: Container, IonButtons: Container, IonToast: Container,
    IonHeader: Container, IonToolbar: Container, IonTitle: Container,
    IonInfiniteScroll: Container, IonInfiniteScrollContent: Container, IonListHeader: Container,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
    useIonActionSheet: () => [vi.fn()],
  };
});

beforeEach(() => {
  state.data = { data: [{ id: 'product-1', name: 'Rice', category: { name: 'Staples' }, is_active: true, variants: [{ id: 'variant-1', sku: 'RICE-1', price: 50 }] }], meta: { total: 1 } };
  state.isError = false;
  state.refetch.mockClear(); state.push.mockClear(); state.query.mockClear();
});
afterEach(cleanup);

it('shows product actions and filters the fetched index without another search request', () => {
  render(<ProductsPage />);
  fireEvent.click(screen.getByRole('button', { name: 'products.scanBarcode' }));
  expect(state.push).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'products.addManually' }));
  expect(screen.getByText('products.createProductTitle')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'search' }), { target: { value: 'rice' } });
  expect(screen.getByText('Rice')).toBeTruthy();
  expect(state.query.mock.calls.every(([args]) => !('search' in (args as object)))).toBe(true);
  expect(state.query).toHaveBeenLastCalledWith({ skip: 0, take: 1000 });
});

it('offers retry rather than an empty catalog on request failure', () => {
  state.data = undefined;
  state.isError = true;
  render(<ProductsPage />);
  expect(screen.getByText('products.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(state.refetch).toHaveBeenCalledTimes(1);
});
