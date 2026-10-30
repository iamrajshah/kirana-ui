import React, { type PropsWithChildren } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InventoryPage } from './InventoryPage';

const query = vi.hoisted(() => ({
  data: { data: [{ variant_id: 'variant-1', quantity: 3, low_stock_threshold: 5, is_low_stock: true, variant: { sku: 'RICE-1', product: { name: 'Rice' } } }], meta: { total: 1 } } as unknown,
  searchData: null as unknown,
  isError: false,
  failAtSkip: null as number | null,
  refetch: vi.fn(),
  args: vi.fn(),
  updateInventory: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/api/inventoryApi', () => ({
  useGetInventoryQuery: (args: unknown) => {
    query.args(args);
    const failed = query.isError || query.failAtSkip === (args as { skip: number }).skip;
    const response = (args as { search?: string }).search && query.searchData
      ? query.searchData
      : query.data;
    return { ...query, currentData: failed ? undefined : response, isError: failed, isLoading: false, isFetching: false };
  },
  useUpdateInventoryMutation: () => [query.updateInventory, { isLoading: false }],
}));
vi.mock('@components', () => ({
  SearchBar: ({ onChange }: { onChange: (value: string) => void }) => (
    <input aria-label="search" onChange={(event) => onChange(event.target.value)} />
  ),
  Loading: () => <div>loading</div>,
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
  Input: ({ label }: { label: string }) => <input aria-label={label} />,
  Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container, IonContent: Container, IonList: Container, IonItem: Container,
    IonLabel: Container, IonBadge: Container, IonIcon: Container, IonModal: Container,
    IonButtons: Container, IonToast: Container, IonHeader: Container, IonToolbar: Container,
    IonTitle: Container, IonListHeader: Container,
    IonInfiniteScroll: ({ children, onIonInfinite, disabled }: PropsWithChildren<{ onIonInfinite?: (event: CustomEvent) => void; disabled?: boolean }>) => (
      <button aria-label="load-more" disabled={disabled} onClick={() => onIonInfinite?.({ target: { complete: vi.fn() } } as unknown as CustomEvent)}>{children}</button>
    ),
    IonInfiniteScrollContent: Container,
    IonButton: ({ children, onClick, ...props }: PropsWithChildren<{ onClick?: () => void; 'aria-label'?: string }>) => <button onClick={onClick} aria-label={props['aria-label']}>{children}</button>,
  };
});

beforeEach(() => {
  query.data = { data: [{ variant_id: 'variant-1', quantity: 3, low_stock_threshold: 5, is_low_stock: true, variant: { sku: 'RICE-1', product: { name: 'Rice' } } }], meta: { total: 1 } };
  query.searchData = null;
  query.isError = false;
  query.failAtSkip = null;
  query.refetch.mockClear();
  query.args.mockClear();
  query.updateInventory.mockReset();
  query.updateInventory.mockReturnValue({
    unwrap: () => Promise.resolve({ data: { variant_id: 'variant-1', quantity: 4 } }),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('keeps a low-stock item editable with a named visible action', () => {
  render(<InventoryPage />);
  expect(screen.getByText('inventory.lowStockWarning')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
  expect(screen.getByText('inventory.updateInventoryTitle')).toBeTruthy();
});

it('filters the loaded inventory locally before sending a debounced search request', () => {
  vi.useFakeTimers();
  render(<InventoryPage />);
  fireEvent.change(screen.getByRole('textbox', { name: 'search' }), {
    target: { value: 'salt' },
  });
  expect(screen.getByText('inventory.noInventoryItems')).toBeTruthy();
  expect(query.args.mock.calls.every(([args]) => !('search' in (args as object)))).toBe(true);

  act(() => vi.advanceTimersByTime(300));
  expect(query.args).toHaveBeenLastCalledWith({ skip: 0, take: 50, search: 'salt' });
});

it('keeps a server-returned brand or packaging match visible', () => {
  vi.useFakeTimers();
  const brandSearchResult = {
    data: [
      {
        variant_id: 'variant-2',
        quantity: 8,
        low_stock_threshold: 2,
        is_low_stock: false,
        variant: {
          sku: 'SKU-2',
          brand: 'Harvest Gold',
          packaging: 'POUCH',
          product: { name: 'Atta' },
        },
      },
    ],
    meta: { total: 1 },
  };
  query.data = brandSearchResult;
  query.searchData = { ...brandSearchResult, data: [...brandSearchResult.data] };
  render(<InventoryPage />);

  fireEvent.change(screen.getByRole('textbox', { name: 'search' }), {
    target: { value: 'harvest' },
  });
  expect(screen.getByText('Atta')).toBeTruthy();

  act(() => vi.advanceTimersByTime(300));
  expect(query.args).toHaveBeenLastCalledWith({ skip: 0, take: 50, search: 'harvest' });
  expect(screen.getByText('Atta')).toBeTruthy();
});

it('loads inventory in 50-row pages', async () => {
  query.data = { data: [{ variant_id: 'variant-1', quantity: 3, low_stock_threshold: 5, is_low_stock: true, variant: { sku: 'RICE-1', product: { name: 'Rice' } } }], meta: { total: 100 } };
  render(<InventoryPage />);

  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  await waitFor(() => expect(query.args).toHaveBeenLastCalledWith({ skip: 50, take: 50 }));
});

it('restarts the ordered inventory window after editing from a later page', async () => {
  query.data = { data: [{ variant_id: 'variant-1', quantity: 3, low_stock_threshold: 5, is_low_stock: true, variant: { sku: 'RICE-1', product: { name: 'Rice' } } }], meta: { total: 100 } };
  render(<InventoryPage />);

  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  await waitFor(() => expect(query.args).toHaveBeenLastCalledWith({ skip: 50, take: 50 }));

  fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
  fireEvent.click(screen.getByRole('button', { name: 'inventory.updateInventoryButton' }));

  await waitFor(() => expect(query.updateInventory).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(query.args).toHaveBeenLastCalledWith({ skip: 0, take: 50 }));
});

it('keeps loaded inventory visible and offers retry when a later page fails', async () => {
  query.data = { data: [{ variant_id: 'variant-1', quantity: 3, low_stock_threshold: 5, is_low_stock: true, variant: { sku: 'RICE-1', product: { name: 'Rice' } } }], meta: { total: 100 } };
  query.failAtSkip = 50;
  render(<InventoryPage />);

  fireEvent.click(screen.getByRole('button', { name: 'load-more' }));
  expect(await screen.findByText('common.loadMoreError')).toBeTruthy();
  expect(screen.getByText('Rice')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});

it('offers retry when inventory cannot be loaded', () => {
  query.data = undefined;
  query.isError = true;
  render(<InventoryPage />);
  expect(screen.getByText('inventory.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});
