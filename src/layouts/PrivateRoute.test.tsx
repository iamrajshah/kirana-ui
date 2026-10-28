import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateRoute } from './PrivateRoute';
import { protectedMainLayoutRoutes, protectedPageRoutes } from '@core/navigation/protectedRoutes';
import { ROUTES } from '@core/constants';

const useAppSelector = vi.fn();
const useLocation = vi.fn();

vi.mock('@hooks/useAppSelector', () => ({
  useAppSelector: (selector: unknown) => useAppSelector(selector),
}));
vi.mock('react-router', () => ({
  Redirect: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
  useLocation: () => useLocation(),
}));

describe('PrivateRoute', () => {
  beforeEach(() => {
    useAppSelector.mockReset();
    useLocation.mockReturnValue({ pathname: ROUTES.DASHBOARD });
  });
  afterEach(cleanup);

  it('sends signed-out users to login', () => {
    useAppSelector.mockReturnValueOnce(false);

    render(
      <PrivateRoute>
        <div>protected</div>
      </PrivateRoute>
    );

    expect(screen.getByTestId('redirect').textContent).toBe('/login');
  });

  it('blocks a signed-in cashier from an owner-only route', () => {
    useAppSelector.mockReturnValueOnce(true).mockReturnValueOnce({ roles: ['CASHIER'] });

    render(
      <PrivateRoute permission="reports">
        <div>reports</div>
      </PrivateRoute>
    );

    expect(screen.getByTestId('redirect').textContent).toBe('/dashboard');
    expect(screen.queryByText('reports')).toBeNull();
  });

  it('renders an allowed route', () => {
    useAppSelector.mockReturnValueOnce(true).mockReturnValueOnce({ roles: ['CASHIER'] });

    render(
      <PrivateRoute permission="billing">
        <div>billing</div>
      </PrivateRoute>
    );

    expect(screen.getByText('billing')).toBeTruthy();
  });

  it('blocks a direct stale Pro-only route when refreshed access is Starter', () => {
    useLocation.mockReturnValue({ pathname: ROUTES.PRODUCT_BARCODE });
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['OWNER'] })
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({
        planCode: 'STARTER',
        state: 'ACTIVE',
        accessStateVersion: '5',
        entitlements: ['CORE_POS'],
        limits: { staff: 3, firms: 1 },
        demoExpiresAt: null,
        endsAt: null,
        graceExpiresAt: null,
      });

    render(
      <PrivateRoute permission="products" commercialFeature="CUSTOM_BARCODE">
        <div>barcode</div>
      </PrivateRoute>
    );

    expect(screen.getByTestId('redirect').textContent).toBe(ROUTES.DASHBOARD);
    expect(screen.queryByText('barcode')).toBeNull();
  });

  it('forces a first-login owner to change the temporary password', () => {
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['OWNER'] })
      .mockReturnValueOnce(true);

    render(
      <PrivateRoute>
        <div>dashboard</div>
      </PrivateRoute>
    );

    expect(screen.getByTestId('redirect').textContent).toBe(ROUTES.CHANGE_PASSWORD);
    expect(screen.queryByText('dashboard')).toBeNull();
  });

  it('allows the password-change screen during first login', () => {
    useLocation.mockReturnValue({ pathname: ROUTES.CHANGE_PASSWORD });
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['OWNER'] })
      .mockReturnValueOnce(true);

    render(
      <PrivateRoute>
        <div>change password</div>
      </PrivateRoute>
    );

    expect(screen.getByText('change password')).toBeTruthy();
  });

  it('sends a restricted owner away from operational routes', () => {
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['OWNER'] })
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ state: 'READ_ONLY' });

    render(
      <PrivateRoute>
        <div>dashboard</div>
      </PrivateRoute>
    );

    expect(screen.getByTestId('redirect').textContent).toBe(ROUTES.RESTRICTED);
  });

  it('lets a restricted owner open the renewal recovery route', () => {
    useLocation.mockReturnValue({ pathname: ROUTES.ACCOUNT_RENEWAL });
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['OWNER'] })
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ state: 'READ_ONLY' });

    render(
      <PrivateRoute>
        <div>renewal</div>
      </PrivateRoute>
    );

    expect(screen.getByText('renewal')).toBeTruthy();
  });

  it('lets a restricted owner download a safe account export', () => {
    useLocation.mockReturnValue({ pathname: ROUTES.ACCOUNT_EXPORT });
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['OWNER'] })
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ state: 'EXPIRED' });

    render(
      <PrivateRoute>
        <div>account export</div>
      </PrivateRoute>
    );

    expect(screen.getByText('account export')).toBeTruthy();
  });

  it('keeps restricted staff on the notice page', () => {
    useLocation.mockReturnValue({ pathname: ROUTES.ACCOUNT });
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['CASHIER'] })
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ state: 'SUSPENDED' });

    render(
      <PrivateRoute>
        <div>account</div>
      </PrivateRoute>
    );

    expect(screen.getByTestId('redirect').textContent).toBe(ROUTES.RESTRICTED);
  });
});

describe('protected route configuration', () => {
  it('maps every permissioned route to the intended capability', () => {
    expect(
      [...protectedPageRoutes, ...protectedMainLayoutRoutes].map(({ path, permission }) => [
        path,
        permission,
      ])
    ).toEqual([
      ['/customers/:id/ledger', 'customers'],
      ['/products/:id', 'products'],
      [ROUTES.PRODUCT_BARCODE, 'products'],
      ['/suppliers/:id/ledger', 'suppliers'],
      ['/invoices/:id', 'invoices'],
      [ROUTES.PURCHASE_CREATE, 'purchases'],
      ['/purchases/:id(\\d+)', 'purchases'],
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
      [ROUTES.SHIFTS, 'shifts'],
    ]);
  });
});
