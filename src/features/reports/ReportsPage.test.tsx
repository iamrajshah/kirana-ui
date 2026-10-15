import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';

const inventoryPayload = vi.hoisted(() => ({ value: null as unknown }));
const purchasePayload = vi.hoisted(() => ({ value: [] as unknown[] }));
const salesPayload = vi.hoisted(() => ({ value: undefined as unknown }));
const reportRequests = vi.hoisted(
  () =>
    Object.fromEntries(
      [
        'sales',
        'outstanding',
        'inventory',
        'cashbook',
        'profitLoss',
        'topSelling',
        'supplierOutstanding',
        'purchaseRegister',
        'topPayables',
        'supplierLedger',
        'purchaseTrend',
      ].map((id) => [id, { isError: false, refetch: vi.fn() }])
    ) as Record<string, { isError: boolean; refetch: ReturnType<typeof vi.fn> }>
);
const querySkips = vi.hoisted(() => ({ sales: [] as boolean[], inventory: [] as boolean[] }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({ Loading: () => null, EmptyState: () => <div>empty</div> }));
vi.mock('@core/api/reportsApi', () => {
  const emptyReport = (id: string) => () => ({
    data: undefined,
    isLoading: false,
    ...reportRequests[id],
  });
  return {
    useGetSalesReportQuery: (_arg: unknown, options?: { skip?: boolean }) => {
      querySkips.sales.push(Boolean(options?.skip));
      return {
        ...emptyReport('sales')(),
        data: salesPayload.value,
        ...reportRequests.sales,
      };
    },
    useGetOutstandingCustomersQuery: emptyReport('outstanding'),
    useGetInventorySummaryQuery: (_arg: unknown, options?: { skip?: boolean }) => {
      querySkips.inventory.push(Boolean(options?.skip));
      return {
        data: { data: inventoryPayload.value },
        isLoading: false,
        ...reportRequests.inventory,
      };
    },
    useGetDailyCashbookQuery: emptyReport('cashbook'),
    useGetProfitLossQuery: emptyReport('profitLoss'),
    useGetTopSellingQuery: emptyReport('topSelling'),
    useGetSupplierOutstandingQuery: emptyReport('supplierOutstanding'),
    useGetPurchaseRegisterQuery: () => ({
      data: { data: purchasePayload.value },
      isLoading: false,
      ...reportRequests.purchaseRegister,
    }),
    useGetTopPayablesQuery: emptyReport('topPayables'),
    useGetSupplierLedgerSummaryQuery: emptyReport('supplierLedger'),
    useGetPurchaseTrendQuery: emptyReport('purchaseTrend'),
  };
});
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonCard: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonCardContent: Container,
    IonList: Container,
    IonItem: ({ children, routerLink }: PropsWithChildren<{ routerLink?: string }>) => (
      <div data-router-link={routerLink}>{children}</div>
    ),
    IonLabel: Container,
    IonBadge: Container,
    IonIcon: Container,
    IonInfiniteScroll: Container,
    IonInfiniteScrollContent: Container,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
    IonSelectOption: Container,
    IonSelect: ({
      onIonChange,
    }: {
      onIonChange: (event: { detail: { value: string } }) => void;
    }) => (
      <>
        <button onClick={() => onIonChange({ detail: { value: 'inventory' } })}>
          inventory report
        </button>
        <button onClick={() => onIonChange({ detail: { value: 'purchaseRegister' } })}>
          purchase register
        </button>
      </>
    ),
  };
});

const item = {
  variant_id: 'variant-1',
  product_name: 'Rice',
  sku: 'RICE',
  quantity: 3,
  low_stock_threshold: 5,
  is_low_stock: true,
  stock_value: 120,
};

beforeEach(() => {
  inventoryPayload.value = null;
  purchasePayload.value = [];
  salesPayload.value = undefined;
  Object.values(reportRequests).forEach((request) => {
    request.isError = false;
    request.refetch.mockClear();
  });
  querySkips.sales.length = 0;
  querySkips.inventory.length = 0;
});

it('formats sales report dates for people instead of exposing API timestamps', () => {
  salesPayload.value = {
    data: {
      breakdown: [
        {
          date: '2026-10-14T00:00:00.000Z',
          invoice_count: 4,
          total_gst: 0,
          total_sales: 1435,
          paid_count: 2,
          unpaid_count: 1,
        },
      ],
    },
  };

  render(<ReportsPage />);

  expect(screen.getByText('14 Oct 2026')).toBeTruthy();
  expect(screen.queryByText('2026-10-14T00:00:00.000Z')).toBeNull();
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

it('only activates the query for the selected report', () => {
  render(<ReportsPage />);
  expect(querySkips.sales[querySkips.sales.length - 1]).toBe(false);
  expect(querySkips.inventory[querySkips.inventory.length - 1]).toBe(true);

  fireEvent.click(screen.getByText('inventory report'));
  expect(querySkips.sales[querySkips.sales.length - 1]).toBe(true);
  expect(querySkips.inventory[querySkips.inventory.length - 1]).toBe(false);
});

it('uses a supplied summary for an inventory object response', () => {
  inventoryPayload.value = {
    items: [item],
    summary: {
      total_items: 12,
      low_stock_items: 4,
      out_of_stock_items: 2,
      total_inventory_value: 600,
    },
  };
  render(<ReportsPage />);
  fireEvent.click(screen.getByText('inventory report'));

  expect(screen.getByText('Rice')).toBeTruthy();
  expect(screen.getByText('reports.totalItems').nextElementSibling?.textContent).toBe('12');
  expect(screen.getByText('reports.lowStock').nextElementSibling?.textContent).toBe('4');
});

it('opens the registered purchase detail route from the purchase register', async () => {
  purchasePayload.value = [
    {
      id: 'purchase-1',
      invoice_number: 'P-100',
      supplier_name: 'Local Supplier',
      supplier_phone: '123',
      invoice_date: '2026-10-12',
      item_count: 2,
      total_amount: 300,
      pending_amount: 0,
      status: 'PAID',
    },
  ];
  render(<ReportsPage />);
  fireEvent.click(screen.getByText('purchase register'));
  expect(
    (await screen.findByText('P-100'))
      .closest('[data-router-link]')
      ?.getAttribute('data-router-link')
  ).toBe('/purchases/purchase-1');
});

it('keeps a failed report separate from an empty report and retries it', () => {
  reportRequests.sales.isError = true;
  render(<ReportsPage />);
  expect(screen.getByText('reports.loadFailed')).toBeTruthy();
  fireEvent.click(screen.getByText('common.retry'));
  expect(reportRequests.sales.refetch).toHaveBeenCalledOnce();
});

it.each([
  ['outstanding', 'reports.outstandingCustomers'],
  ['inventory', 'reports.inventorySummaryReport'],
  ['cashbook', 'reports.dailyCashbook'],
  ['profitLoss', 'reports.profitAndLoss'],
  ['topSelling', 'reports.topSellingProducts'],
  ['supplierOutstanding', 'reports.supplierOutstandingReport'],
  ['purchaseRegister', 'reports.purchaseRegisterReport'],
  ['topPayables', 'reports.topPayablesReport'],
  ['supplierLedger', 'reports.supplierLedgerSummary'],
  ['purchaseTrend', 'reports.purchaseTrendReport'],
])('keeps the %s failure and retry bound to its selected query', (id, label) => {
  reportRequests[id].isError = true;
  render(<ReportsPage />);
  fireEvent.click(screen.getByRole('button', { name: label }));

  expect(screen.getByText('reports.loadFailed')).toBeTruthy();
  fireEvent.click(screen.getByText('common.retry'));
  expect(reportRequests[id].refetch).toHaveBeenCalledOnce();
  Object.entries(reportRequests)
    .filter(([requestId]) => requestId !== id)
    .forEach(([, request]) => expect(request.refetch).not.toHaveBeenCalled());
});
