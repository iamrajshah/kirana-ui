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
      },
    } as { data: Record<string, number> } | undefined,
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
