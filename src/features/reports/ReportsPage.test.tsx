import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';

const inventoryPayload = vi.hoisted(() => ({ value: null as unknown }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({ Loading: () => null, EmptyState: () => <div>empty</div> }));
vi.mock('@core/api/reportsApi', () => {
  const emptyReport = () => ({ data: undefined, isLoading: false });
  return {
    useGetSalesReportQuery: emptyReport,
    useGetOutstandingCustomersQuery: emptyReport,
    useGetInventorySummaryQuery: () => ({ data: { data: inventoryPayload.value }, isLoading: false }),
    useGetDailyCashbookQuery: emptyReport,
    useGetProfitLossQuery: emptyReport,
    useGetTopSellingQuery: emptyReport,
    useGetSupplierOutstandingQuery: emptyReport,
    useGetPurchaseRegisterQuery: emptyReport,
    useGetTopPayablesQuery: emptyReport,
    useGetSupplierLedgerSummaryQuery: emptyReport,
    useGetPurchaseTrendQuery: emptyReport,
  };
});
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container, IonContent: Container, IonCard: Container,
    IonCardHeader: Container, IonCardTitle: Container, IonCardContent: Container,
    IonList: Container, IonItem: Container, IonLabel: Container, IonBadge: Container,
    IonIcon: Container, IonInfiniteScroll: Container, IonInfiniteScrollContent: Container,
    IonSelectOption: Container,
    IonSelect: ({ onIonChange }: { onIonChange: (event: { detail: { value: string } }) => void }) => (
      <button onClick={() => onIonChange({ detail: { value: 'inventory' } })}>inventory report</button>
    ),
  };
});

const item = {
  variant_id: 'variant-1', product_name: 'Rice', sku: 'RICE', quantity: 3,
  low_stock_threshold: 5, is_low_stock: true, stock_value: 120,
};

beforeEach(() => {
  inventoryPayload.value = null;
});

afterEach(cleanup);

it('renders an inventory array using its computed summary', () => {
  inventoryPayload.value = [item];
  render(<ReportsPage />);
  fireEvent.click(screen.getByText('inventory report'));

  expect(screen.getByText('Rice')).toBeTruthy();
  expect(screen.getByText('reports.totalItems').nextElementSibling?.textContent).toBe('1');
  expect(screen.getByText('reports.lowStock').nextElementSibling?.textContent).toBe('1');
});

it('uses a supplied summary for an inventory object response', () => {
  inventoryPayload.value = {
    items: [item],
    summary: { total_items: 12, low_stock_items: 4, out_of_stock_items: 2, total_inventory_value: 600 },
  };
  render(<ReportsPage />);
  fireEvent.click(screen.getByText('inventory report'));

  expect(screen.getByText('Rice')).toBeTruthy();
  expect(screen.getByText('reports.totalItems').nextElementSibling?.textContent).toBe('12');
  expect(screen.getByText('reports.lowStock').nextElementSibling?.textContent).toBe('4');
});
