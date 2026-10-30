import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';

const inventoryPayload = vi.hoisted(() => ({ value: null as unknown }));
const purchasePayload = vi.hoisted(() => ({ value: [] as unknown[] }));
const purchaseSummary = vi.hoisted(() => ({ value: undefined as unknown }));
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
const reportArgs = vi.hoisted(() => ({ sales: [] as unknown[] }));
const commercialState = vi.hoisted(() => ({
  allowed: true,
  multiFirmAllowed: false,
  access: null as null | { planCode: string },
}));
const firmState = vi.hoisted(() => ({
  firms: [] as Array<{ id: string; legal_name: string; is_default_sales: boolean }>,
  calls: [] as Array<{ params: unknown; options: unknown }>,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({ Loading: () => null, EmptyState: () => <div>empty</div> }));
vi.mock('@core/hooks', () => ({ useAppSelector: (selector: (state: unknown) => unknown) => selector({ auth: { user: { roles: ['OWNER'] }, sessionContext: null } }) }));
vi.mock('@core/auth/authSlice', () => ({
  selectCurrentUser: (state: { auth: { user: unknown } }) => state.auth.user,
  selectCommercialAccess: () => commercialState.access,
}));
vi.mock('@core/commercial/commercialAccess', () => ({
  canUseCommercialFeature: (_roles: unknown, _access: unknown, feature: string) =>
    feature === 'MULTI_FIRM' ? commercialState.multiFirmAllowed : commercialState.allowed,
}));
vi.mock('@core/api/firmApi', () => ({
  useGetFirmsQuery: (params: unknown, options: unknown) => {
    firmState.calls.push({ params, options });
    return {
      data: firmState.firms.length ? { data: { firms: firmState.firms } } : undefined,
    };
  },
}));
vi.mock('@core/api/reportsApi', () => {
  const emptyReport = (id: string) => () => ({
    data: undefined,
    isLoading: false,
    ...reportRequests[id],
  });
  return {
    useGetSalesReportQuery: (_arg: unknown, options?: { skip?: boolean }) => {
      reportArgs.sales.push(_arg);
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
      data: {
        data: purchasePayload.value,
        summary: purchaseSummary.value,
        pagination: { total: purchasePayload.value.length, page: 1, limit: 50, totalPages: 1 },
      },
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
  const Card = ({ children, className }: PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  );
  return {
    IonPage: Container,
    IonContent: Container,
    IonCard: Card,
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
    IonButton: ({ children, onClick, disabled }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
      <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
    IonSelectOption: Container,
    IonSelect: ({
      onIonChange,
      'aria-label': ariaLabel,
    }: {
      onIonChange: (event: { detail: { value: string } }) => void;
      'aria-label'?: string;
    }) => (
      ariaLabel === 'reports.accountingFirm' ? (
        <button onClick={() => onIonChange({ detail: { value: 'firm-2' } })}>
          select firm two
        </button>
      ) : (
        <>
          <button onClick={() => onIonChange({ detail: { value: 'inventory' } })}>
            inventory report
          </button>
          <button onClick={() => onIonChange({ detail: { value: 'purchaseRegister' } })}>
            purchase register
          </button>
        </>
      )
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
  purchaseSummary.value = undefined;
  salesPayload.value = undefined;
  Object.values(reportRequests).forEach((request) => {
    request.isError = false;
    request.refetch.mockClear();
  });
  querySkips.sales.length = 0;
  querySkips.inventory.length = 0;
  reportArgs.sales.length = 0;
  commercialState.allowed = true;
  commercialState.multiFirmAllowed = false;
  commercialState.access = null;
  firmState.firms = [];
  firmState.calls.length = 0;
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

it('locks advanced reports before a direct UI selection can trigger their query', () => {
  commercialState.allowed = false;
  render(<ReportsPage />);

  const profitLoss = screen.getByRole('button', { name: /reports.profitAndLoss/ });
  expect(profitLoss.hasAttribute('disabled')).toBe(true);
  fireEvent.click(profitLoss);
  expect(querySkips.sales[querySkips.sales.length - 1]).toBe(false);
});

it('lets a demo shop select a seeded firm for firm-scoped reports', () => {
  commercialState.access = { planCode: 'DEMO' };
  commercialState.multiFirmAllowed = true;
  firmState.firms = [
    { id: 'firm-1', legal_name: 'Demo Main Firm', is_default_sales: true },
    { id: 'firm-2', legal_name: 'Demo Second Firm', is_default_sales: false },
  ];

  render(<ReportsPage />);
  expect(firmState.calls.at(-1)?.options).toEqual({ skip: false });
  expect(reportArgs.sales.at(-1)).toEqual({ groupBy: 'day', firmId: 'firm-1', scope: 'FIRM' });

  fireEvent.click(screen.getByText('select firm two'));
  expect(reportArgs.sales.at(-1)).toEqual({ groupBy: 'day', firmId: 'firm-2', scope: 'FIRM' });
});

it('keeps the accounting-firm control independent from the mobile-only report chooser', () => {
  commercialState.multiFirmAllowed = true;
  firmState.firms = [
    { id: 'firm-1', legal_name: 'Main Firm', is_default_sales: true },
    { id: 'firm-2', legal_name: 'Second Firm', is_default_sales: false },
  ];

  render(<ReportsPage />);

  expect(screen.getByText('inventory report').closest('.report-mobile-select-card')).toBeTruthy();
  const firmControl = screen.getByText('select firm two').closest('.report-firm-select-card');
  expect(firmControl).toBeTruthy();
  expect(firmControl?.classList.contains('report-mobile-select-card')).toBe(false);
});

it('enables firm scope from the MULTI_FIRM entitlement instead of the plan name', () => {
  commercialState.access = { planCode: 'PRO' };
  commercialState.multiFirmAllowed = true;
  firmState.firms = [
    { id: 'firm-1', legal_name: 'Entitled Firm', is_default_sales: true },
  ];

  render(<ReportsPage />);

  expect(firmState.calls.at(-1)?.options).toEqual({ skip: false });
  expect(reportArgs.sales.at(-1)).toEqual({ groupBy: 'day', firmId: 'firm-1', scope: 'FIRM' });
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

it('renders the canonical purchase register summary fields returned by the API', () => {
  purchasePayload.value = [
    {
      id: 'purchase-1',
      invoice_number: 'P-100',
      supplier_name: 'Local Supplier',
      supplier_phone: '123',
      invoice_date: '2026-10-12',
      item_count: 2,
      total_amount: 1250,
      pending_amount: 700,
      status: 'PARTIAL',
    },
  ];
  purchaseSummary.value = {
    total_purchases: 4,
    total_amount: 1250,
    total_paid: 550,
    total_outstanding: 700,
  };

  render(<ReportsPage />);
  fireEvent.click(screen.getByText('purchase register'));

  expect(screen.getByText('reports.totalPurchasesCount').nextElementSibling?.textContent).toBe('4');
  expect(screen.getByText('reports.totalAmountLabel').nextElementSibling?.textContent).toContain(
    '1,250'
  );
  expect(screen.getByText('reports.pendingAmountLabel').nextElementSibling?.textContent).toContain(
    '700'
  );
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
