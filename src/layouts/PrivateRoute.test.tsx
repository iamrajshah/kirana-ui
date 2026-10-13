import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateRoute } from './PrivateRoute';
import { protectedMainLayoutRoutes, protectedPageRoutes } from '@core/navigation/protectedRoutes';
import { ROUTES } from '@core/constants';

const useAppSelector = vi.fn();

vi.mock('@hooks/useAppSelector', () => ({ useAppSelector: (selector: unknown) => useAppSelector(selector) }));
vi.mock('react-router', () => ({ Redirect: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div> }));

describe('PrivateRoute', () => {
  beforeEach(() => useAppSelector.mockReset());
  afterEach(cleanup);

  it('sends signed-out users to login', () => {
    useAppSelector.mockReturnValueOnce(false);

    render(<PrivateRoute><div>protected</div></PrivateRoute>);

    expect(screen.getByTestId('redirect').textContent).toBe('/login');
  });

  it('blocks a signed-in cashier from an owner-only route', () => {
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['CASHIER'] });

    render(<PrivateRoute permission="reports"><div>reports</div></PrivateRoute>);

    expect(screen.getByTestId('redirect').textContent).toBe('/dashboard');
    expect(screen.queryByText('reports')).toBeNull();
  });

  it('renders an allowed route', () => {
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['CASHIER'] });

    render(<PrivateRoute permission="billing"><div>billing</div></PrivateRoute>);

    expect(screen.getByText('billing')).toBeTruthy();
  });
});

describe('protected route configuration', () => {
  it('maps every permissioned route to the intended capability', () => {
    expect([...protectedPageRoutes, ...protectedMainLayoutRoutes].map(({ path, permission }) => [path, permission])).toEqual([
      ['/customers/:id/ledger', 'customers'],
      ['/products/:id', 'products'],
      [ROUTES.PRODUCT_BARCODE, 'products'],
      ['/suppliers/:id/ledger', 'suppliers'],
      ['/invoices/:id', 'invoices'],
      [ROUTES.PURCHASE_CREATE, 'purchases'],
      ['/purchases/:id', 'purchases'],
      [ROUTES.DASHBOARD, 'dashboard'],
      [ROUTES.BILLING, 'billing'],
      [ROUTES.CUSTOMERS, 'customers'],
      [ROUTES.SUPPLIERS, 'suppliers'],
      [ROUTES.PURCHASES, 'purchases'],
      [ROUTES.PRODUCTS, 'products'],
      [ROUTES.INVENTORY, 'inventory'],
      [ROUTES.INVOICES, 'invoices'],
      [ROUTES.PAYMENTS, 'payments'],
      [ROUTES.REPORTS, 'reports'],
      [ROUTES.USERS, 'users'],
      [ROUTES.CATEGORIES, 'products'],
      [ROUTES.IMPORT_EXPORT, 'import-export'],
    ]);
  });
});
