import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InventoryPage } from './InventoryPage';

const query = vi.hoisted(() => ({
  data: { data: [{ variant_id: 'variant-1', quantity: 3, low_stock_threshold: 5, is_low_stock: true, variant: { sku: 'RICE-1', product: { name: 'Rice' } } }] } as unknown,
  isError: false,
  refetch: vi.fn(),
  args: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/api/inventoryApi', () => ({
  useGetInventoryQuery: (args: unknown) => {
    query.args(args);
    return { ...query, isLoading: false };
  },
  useUpdateInventoryMutation: () => [vi.fn(), { isLoading: false }],
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
    IonButton: ({ children, onClick, ...props }: PropsWithChildren<{ onClick?: () => void; 'aria-label'?: string }>) => <button onClick={onClick} aria-label={props['aria-label']}>{children}</button>,
  };
});

beforeEach(() => {
  query.data = { data: [{ variant_id: 'variant-1', quantity: 3, low_stock_threshold: 5, is_low_stock: true, variant: { sku: 'RICE-1', product: { name: 'Rice' } } }] };
  query.isError = false;
  query.refetch.mockClear();
  query.args.mockClear();
});
afterEach(cleanup);

it('keeps a low-stock item editable with a named visible action', () => {
  render(<InventoryPage />);
  expect(screen.getByText('inventory.lowStockWarning')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
  expect(screen.getByText('inventory.updateInventoryTitle')).toBeTruthy();
});

it('filters the loaded inventory locally without a search API request', () => {
  render(<InventoryPage />);
  fireEvent.change(screen.getByRole('textbox', { name: 'search' }), {
    target: { value: 'salt' },
  });
  expect(screen.getByText('inventory.noInventoryItems')).toBeTruthy();
  expect(query.args.mock.calls.every(([args]) => !('search' in (args as object)))).toBe(true);
});

it('offers retry when inventory cannot be loaded', () => {
  query.data = undefined;
  query.isError = true;
  render(<InventoryPage />);
  expect(screen.getByText('inventory.loadError')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});
