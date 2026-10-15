import { describe, expect, it } from 'vitest';
import { getNavigationItems, getPrimaryTabForPath } from './navigation';

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

  it('keeps related secondary screens anchored to their primary mobile destination', () => {
    expect(getPrimaryTabForPath('/invoices/42')).toBe('billing');
    expect(getPrimaryTabForPath('/customers/7/ledger')).toBe('customers');
    expect(getPrimaryTabForPath('/inventory')).toBe('products');
    expect(getPrimaryTabForPath('/purchases/create')).toBe('products');
    expect(getPrimaryTabForPath('/reports')).toBeUndefined();
  });
});
