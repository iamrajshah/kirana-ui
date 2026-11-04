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

  it('blocks a direct reports route after the feature is disabled for a legacy shop', () => {
    useLocation.mockReturnValue({ pathname: ROUTES.REPORTS });
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['OWNER'] })
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({
        planCode: 'LEGACY_COMPAT',
        state: 'ACTIVE',
        accessStateVersion: '8',
        entitlements: ['DASHBOARD', 'BILLING'],
        limits: { staff: null, firms: null },
        demoExpiresAt: null,
        endsAt: null,
        graceExpiresAt: null,
      });

    render(
      <PrivateRoute permission="reports" commercialFeature="REPORTS">
        <div>shop reports</div>
      </PrivateRoute>
    );

    expect(screen.getByTestId('redirect').textContent).toBe(ROUTES.DASHBOARD);
    expect(screen.queryByText('shop reports')).toBeNull();
  });

  it.each([
    [ROUTES.EXPIRY_ALERTS, 'inventory', 'EXPIRY_TRACKING'],
    [ROUTES.PURCHASE_IMPORT, 'purchases', 'PURCHASE_BILL_IMPORT'],
    [ROUTES.GST_REPORTS, 'reports', 'GST_CA_REPORTS'],
  ] as const)(
    'blocks direct access to %s when the feature is not entitled',
    (path, permission, feature) => {
      useLocation.mockReturnValue({ pathname: path });
      useAppSelector
        .mockReturnValueOnce(true)
        .mockReturnValueOnce({ roles: ['OWNER'] })
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          planCode: 'STARTER',
          state: 'ACTIVE',
          accessStateVersion: '6',
          entitlements: [],
          limits: { staff: 3, firms: 1 },
          demoExpiresAt: null,
          endsAt: null,
          graceExpiresAt: null,
        });

      render(
        <PrivateRoute permission={permission} commercialFeature={feature}>
          <div>protected feature</div>
        </PrivateRoute>
      );

      expect(screen.getByTestId('redirect').textContent).toBe(ROUTES.DASHBOARD);
      expect(screen.queryByText('protected feature')).toBeNull();
    }
  );

  it.each([
    [ROUTES.EXPIRY_ALERTS, 'inventory', 'EXPIRY_TRACKING', ['EXPIRY_TRACKING', 'INVENTORY']],
    [
      ROUTES.PURCHASE_IMPORT,
      'purchases',
      'PURCHASE_BILL_IMPORT',
      ['PURCHASE_BILL_IMPORT', 'PURCHASES', 'SUPPLIERS', 'PRODUCTS'],
    ],
    [ROUTES.GST_REPORTS, 'reports', 'GST_CA_REPORTS', ['GST_CA_REPORTS', 'ESSENTIAL_REPORTS']],
  ] as const)(
    'blocks direct access to %s when an enabled add-on is missing a dependency',
    (path, permission, feature, entitlements) => {
      useLocation.mockReturnValue({ pathname: path });
      useAppSelector
        .mockReturnValueOnce(true)
        .mockReturnValueOnce({ roles: ['OWNER'] })
        .mockReturnValueOnce(false)
        .mockReturnValueOnce({
          planCode: 'PRO',
          state: 'ACTIVE',
          accessStateVersion: '7',
          entitlements,
          limits: { staff: 3, firms: 1 },
          demoExpiresAt: null,
          endsAt: null,
          graceExpiresAt: null,
        });

      render(
        <PrivateRoute permission={permission} commercialFeature={feature}>
          <div>dependency-protected feature</div>
        </PrivateRoute>
      );

      expect(screen.getByTestId('redirect').textContent).toBe(ROUTES.DASHBOARD);
      expect(screen.queryByText('dependency-protected feature')).toBeNull();
    }
  );

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

  it('keeps a provisioning owner on setup recovery instead of account actions', () => {
    useLocation.mockReturnValue({ pathname: ROUTES.ACCOUNT_RENEWAL });
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['OWNER'] })
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ state: 'PROVISIONING' });

    render(
      <PrivateRoute>
        <div>renewal</div>
      </PrivateRoute>
    );

    expect(screen.getByTestId('redirect').textContent).toBe(ROUTES.RESTRICTED);
    expect(screen.queryByText('renewal')).toBeNull();
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
      [ROUTES.PURCHASE_IMPORT, 'purchases'],
      [ROUTES.EXPIRY_ALERTS, 'inventory'],
      [ROUTES.GST_REPORTS, 'reports'],
      [ROUTES.DASHBOARD, 'dashboard'],
      [ROUTES.BILLING, 'billing'],
      [ROUTES.CUSTOMERS, 'customers'],
      [ROUTES.SUPPLIERS, 'suppliers'],
      [ROUTES.PURCHASES, 'purchases'],
      [ROUTES.PRODUCTS, 'products'],
      [ROUTES.INVENTORY, 'inventory'],
      [ROUTES.INVOICES, 'invoices'],
      [ROUTES.STOREFRONT_ORDERS, 'invoices'],
      [ROUTES.PAYMENTS, 'payments'],
      [ROUTES.REPORTS, 'reports'],
      [ROUTES.USERS, 'users'],
      [ROUTES.CATEGORIES, 'products'],
      [ROUTES.IMPORT_EXPORT, 'import-export'],
      [ROUTES.SHIFTS, 'shifts'],
    ]);
  });
});
