import { describe, expect, it } from 'vitest';
import { getNavigationItems, getPrimaryTabForPath } from './navigation';
import type { CommercialAccessSummary } from '@core/commercial';

describe('workspace navigation', () => {
  it('keeps the same permitted destinations for mobile and wide navigation', () => {
    const cashier = getNavigationItems(['CASHIER']);
    expect(cashier.filter((item) => item.primary).map((item) => item.id)).toEqual([
      'dashboard',
      'billing',
      'customers',
      'payments',
    ]);
    expect(cashier.map((item) => item.id)).toContain('invoices');
    expect(cashier.map((item) => item.id)).not.toContain('inventory');
    expect(cashier.map((item) => item.id)).not.toContain('users');
    expect(cashier.map((item) => item.id)).toContain('about');
  });

  it('offers owner-only staff management and permitted catalog destinations', () => {
    const owner = getNavigationItems(['OWNER']);
    const manager = getNavigationItems(['MANAGER']);
    expect(owner.map((item) => item.id)).toContain('users');
    expect(manager.map((item) => item.id)).not.toContain('users');
    expect(manager.map((item) => item.id)).toContain('categories');
  });

  it('removes shop-disabled reports from legacy navigation when the access snapshot changes', () => {
    const access: CommercialAccessSummary = {
      planCode: 'LEGACY_COMPAT',
      state: 'ACTIVE',
      accessStateVersion: '1',
      entitlements: ['DASHBOARD', 'BILLING', 'REPORTS'],
      limits: { staff: null, firms: null },
      demoExpiresAt: null,
      endsAt: null,
      graceExpiresAt: null,
    };
    expect(getNavigationItems(['OWNER'], access).map((item) => item.id)).toContain('reports');

    const disabled = {
      ...access,
      accessStateVersion: '2',
      entitlements: access.entitlements.filter((feature) => feature !== 'REPORTS'),
    };
    const destinations = getNavigationItems(['OWNER'], disabled).map((item) => item.id);
    expect(destinations).not.toContain('reports');
    expect(destinations).toContain('billing');
  });

  it('keeps related secondary screens anchored to their primary mobile destination', () => {
    expect(getPrimaryTabForPath('/invoices/42')).toBe('billing');
    expect(getPrimaryTabForPath('/customers/7/ledger')).toBe('customers');
    expect(getPrimaryTabForPath('/inventory')).toBe('products');
    expect(getPrimaryTabForPath('/purchases/create')).toBe('products');
    expect(getPrimaryTabForPath('/reports')).toBeUndefined();
  });
});
