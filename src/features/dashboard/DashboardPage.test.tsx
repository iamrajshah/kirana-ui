import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refetch: vi.fn(),
  roles: ['OWNER'] as string[],
  query: {
    data: {
      data: {
        today_sales: 2450,
        pending_invoices: 3,
        low_stock_items: 2,
        total_customers: 40,
        supplier_payables: 500,
        customer_receivables: 300,
        decision_inbox: {
          money_to_collect: {
            available: true,
            records: [
              {
                type: 'CUSTOMER_CREDIT_DUE',
                priority: 1,
                customer_id: 'customer-1',
                customer_name: 'Asha Stores',
                due_amount: 1250,
                reason: { credit_balance: 1250 },
                destination: { kind: 'CUSTOMER', customer_id: 'customer-1' },
              },
            ],
          },
          low_stock: {
            available: true,
            records: [
              {
                type: 'LOW_STOCK',
                priority: 1,
                variant_id: 'variant-7',
                product_id: 'product-7',
                product_name: 'Basmati Rice',
                sku: 'RICE-5KG',
                brand: 'Fresh Farm',
                size: '5 kg',
                reason: { quantity: 1, low_stock_threshold: 5, threshold_ratio: 0.2 },
                destination: {
                  kind: 'PRODUCT_VARIANT',
                  product_id: 'product-7',
                  variant_id: 'variant-7',
                },
              },
            ],
          },
          held_bills: {
            available: true,
            records: [
              {
                type: 'HELD_BILL_ATTENTION',
                priority: 1,
                invoice_id: 'invoice-9',
                invoice_number: 'DRAFT-9',
                total_amount: 340,
                item_count: 2,
                held_at: '2026-10-12T08:30:00.000Z',
                lease_state: 'UNCLAIMED',
                reason: {
                  held_at: '2026-10-12T08:30:00.000Z',
                  held_by: null,
                  lease_expires_at: null,
                },
                destination: { kind: 'HELD_BILL', invoice_id: 'invoice-9' },
              },
            ],
          },
        },
      },
    } as { data: Record<string, unknown> } | undefined,
    isLoading: false,
    isError: false,
  },
}));

vi.mock('react-router-dom', () => ({ useHistory: () => ({ push: mocks.push }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({
  Card: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Loading: () => <div>common.loading</div>,
}));
vi.mock('@core/hooks', () => ({ useAppSelector: () => ({ roles: mocks.roles }) }));
vi.mock('@core/auth/authSlice', () => ({ selectCurrentUser: vi.fn() }));
vi.mock('@core/api/dashboardApi', () => ({
  useGetDashboardStatsQuery: () => ({ ...mocks.query, refetch: mocks.refetch }),
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonGrid: Container,
    IonRow: Container,
    IonCol: Container,
    IonRefresher: ({ children, onIonRefresh }: PropsWithChildren<{ onIonRefresh: (event: { detail: { complete: () => void } }) => void }>) => (
      <div>
        {children}
        <button onClick={() => onIonRefresh({ detail: { complete: vi.fn() } })}>pull to refresh</button>
      </div>
    ),
    IonRefresherContent: () => null,
  };
});

describe('DashboardPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.push.mockClear();
    mocks.refetch.mockReset().mockResolvedValue(undefined);
    mocks.roles = ['OWNER'];
    mocks.query = {
      data: {
        data: {
          today_sales: 2450,
          pending_invoices: 3,
          low_stock_items: 2,
          total_customers: 40,
          supplier_payables: 500,
          customer_receivables: 300,
          decision_inbox: {
            money_to_collect: {
              available: true,
              records: [
                {
                  type: 'CUSTOMER_CREDIT_DUE',
                  priority: 1,
                  customer_id: 'customer-1',
                  customer_name: 'Asha Stores',
                  due_amount: 1250,
                  reason: { credit_balance: 1250 },
                  destination: { kind: 'CUSTOMER', customer_id: 'customer-1' },
                },
              ],
            },
            low_stock: {
              available: true,
              records: [
                {
                  type: 'LOW_STOCK',
                  priority: 1,
                  variant_id: 'variant-7',
                  product_id: 'product-7',
                  product_name: 'Basmati Rice',
                  sku: 'RICE-5KG',
                  brand: 'Fresh Farm',
                  size: '5 kg',
                  reason: { quantity: 1, low_stock_threshold: 5, threshold_ratio: 0.2 },
                  destination: {
                    kind: 'PRODUCT_VARIANT',
                    product_id: 'product-7',
                    variant_id: 'variant-7',
                  },
                },
              ],
            },
            held_bills: {
              available: true,
              records: [
                {
                  type: 'HELD_BILL_ATTENTION',
                  priority: 1,
                  invoice_id: 'invoice-9',
                  invoice_number: 'DRAFT-9',
                  total_amount: 340,
                  item_count: 2,
                  held_at: '2026-10-12T08:30:00.000Z',
                  lease_state: 'UNCLAIMED',
                  reason: {
                    held_at: '2026-10-12T08:30:00.000Z',
                    held_by: null,
                    lease_expires_at: null,
                  },
                  destination: { kind: 'HELD_BILL', invoice_id: 'invoice-9' },
                },
              ],
            },
          },
        },
      },
      isLoading: false,
      isError: false,
    };
  });

  it('prioritizes sales, pending invoices, and low stock with owner shortcuts', () => {
    render(<DashboardPage />);

    const priorities = screen.getByTestId('dashboard-priorities');
    expect(within(priorities).getByText('dashboard.todaySales')).toBeTruthy();
    expect(within(priorities).getByText('dashboard.pendingInvoices')).toBeTruthy();
    expect(within(priorities).getByText('dashboard.lowStock')).toBeTruthy();
    expect(within(priorities).getByText('₹2,450')).toBeTruthy();
    expect(screen.getByText('dashboard.totalCustomers')).toBeTruthy();
    expect(screen.getByText('dashboard.supplierPayables')).toBeTruthy();
    expect(screen.getByText('dashboard.customerReceivables')).toBeTruthy();
    const actions = screen.getByRole('region', { name: 'dashboard.quickActions' });
    const secondary = screen.getByRole('region', { name: 'dashboard.moreMetrics' });
    expect(actions.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'billing.title' }));
    expect(mocks.push).toHaveBeenCalledWith('/billing');
    fireEvent.click(screen.getByRole('button', { name: 'invoices.title' }));
    expect(mocks.push).toHaveBeenCalledWith('/invoices');
    fireEvent.click(screen.getByRole('button', { name: 'inventory.title' }));
    expect(mocks.push).toHaveBeenCalledWith('/inventory');
  });

  it('places the owner decision inbox before metrics and routes every primary action', () => {
    render(<DashboardPage />);

    const inbox = screen.getByRole('region', { name: 'dashboard.decisionInbox.title' });
    const priorities = screen.getByTestId('dashboard-priorities');
    expect(inbox.compareDocumentPosition(priorities) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(inbox).getByText('Asha Stores')).toBeTruthy();
    expect(within(inbox).getByText('Basmati Rice')).toBeTruthy();
    expect(within(inbox).getByText('RICE-5KG')).toBeTruthy();
    expect(within(inbox).getByText('DRAFT-9')).toBeTruthy();
    expect(within(inbox).getAllByRole('button')).toHaveLength(3);

    fireEvent.click(within(inbox).getByRole('button', { name: 'dashboard.decisionInbox.money.action' }));
    expect(mocks.push).toHaveBeenCalledWith('/customers/customer-1/ledger');
    fireEvent.click(within(inbox).getByRole('button', { name: 'dashboard.decisionInbox.stock.action' }));
    expect(mocks.push).toHaveBeenCalledWith('/products/product-7');
    fireEvent.click(within(inbox).getByRole('button', { name: 'dashboard.decisionInbox.held.action' }));
    expect(mocks.push).toHaveBeenCalledWith('/billing?held=invoice-9');
  });

  it('shows the decision inbox to managers but not cashiers', () => {
    mocks.roles = ['MANAGER'];
    const { rerender } = render(<DashboardPage />);
    expect(screen.getByRole('region', { name: 'dashboard.decisionInbox.title' })).toBeTruthy();

    mocks.roles = ['CASHIER'];
    rerender(<DashboardPage />);
    expect(screen.queryByRole('region', { name: 'dashboard.decisionInbox.title' })).toBeNull();
    expect(screen.getByTestId('dashboard-priorities')).toBeTruthy();
  });

  it('degrades one unavailable decision group without hiding successful groups or totals', () => {
    const dashboard = mocks.query.data?.data;
    const decisionInbox = dashboard?.decision_inbox as {
      low_stock: { available: boolean; records: unknown[] };
    };
    decisionInbox.low_stock = { available: false, records: [] };
    render(<DashboardPage />);

    expect(screen.getByText('Asha Stores')).toBeTruthy();
    expect(screen.getByText('DRAFT-9')).toBeTruthy();
    expect(screen.getByTestId('dashboard-priorities')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('dashboard.decisionInbox.groupUnavailable');
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.decisionInbox.stock.retry' }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps shortcuts and totals usable when the owner decision payload is missing', () => {
    const dashboard = mocks.query.data?.data;
    if (dashboard) delete dashboard.decision_inbox;
    render(<DashboardPage />);

    expect(screen.getByTestId('dashboard-priorities')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'billing.title' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('dashboard.decisionInbox.unavailable');
  });

  it('omits shortcuts outside the cashier permissions', () => {
    mocks.roles = ['CASHIER'];
    render(<DashboardPage />);

    expect(screen.getByRole('button', { name: 'billing.title' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'invoices.title' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'inventory.title' })).toBeNull();
  });

  it('shows a retryable error instead of displaying zeroes when stats fail', () => {
    mocks.query = { data: undefined, isLoading: false, isError: true };
    render(<DashboardPage />);

    expect(screen.getByRole('alert').textContent).toContain('dashboard.statsUnavailable');
    expect(screen.queryByTestId('dashboard-priorities')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.retry' }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'billing.title' })).toBeTruthy();
  });

  it('preserves visible zero metrics and pull-to-refresh', () => {
    mocks.query.data = {
      data: {
        today_sales: 0,
        pending_invoices: 0,
        low_stock_items: 0,
        total_customers: 0,
        supplier_payables: 0,
        customer_receivables: 0,
        decision_inbox: {
          money_to_collect: { available: true, records: [] },
          low_stock: { available: true, records: [] },
          held_bills: { available: true, records: [] },
        },
      },
    };
    render(<DashboardPage />);

    expect(screen.getByText('dashboard.noSalesToday')).toBeTruthy();
    expect(screen.getByText('dashboard.noPendingInvoices')).toBeTruthy();
    expect(screen.getByText('dashboard.stockHealthy')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'pull to refresh' }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows loading separately from empty and error states', () => {
    mocks.query = { data: undefined, isLoading: true, isError: false };
    render(<DashboardPage />);

    expect(screen.getByRole('status')).toHaveProperty('textContent', 'common.loading');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
