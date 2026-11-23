import { deviceRequestBlocked, deviceRequestFeature } from './deviceRequestPolicy';
import { describe, it, expect } from 'vitest';
import { detectDeviceProfile, deviceFeatureMode } from './deviceAccess';
import { canUseCommercialFeature, canWriteCommercialFeature } from './commercialAccess';
import type { CommercialAccessSummary } from './types';
const access: CommercialAccessSummary = {
  planCode: 'BUSINESS',
  state: 'ACTIVE',
  accessStateVersion: '1.d2',
  entitlements: ['PURCHASES', 'DASHBOARD', 'PRODUCTS', 'BILLING'],
  limits: { staff: 5, firms: 3 },
  demoExpiresAt: null,
  endsAt: null,
  graceExpiresAt: null,
  deviceProfile: 'MOBILE',
  deviceAccess: {
    revision: 2,
    profiles: {
      MOBILE: { PURCHASES: 'READ_ONLY', DASHBOARD: 'FULL', PRODUCTS: 'HIDDEN', BILLING: 'FULL' },
      TABLET: { PURCHASES: 'FULL' },
      WEB: { PURCHASES: 'FULL' },
    },
  },
};
describe('device feature presentation and request guard', () => {
  it.each([
    ['iPhone Mobile', undefined, 0, 'MOBILE'],
    ['iPad', 'ios', 5, 'TABLET'],
    ['Android Mobile', 'android', 5, 'MOBILE'],
    ['Android', 'android', 5, 'TABLET'],
    ['Macintosh', undefined, 5, 'TABLET'],
    ['Macintosh', undefined, 0, 'WEB'],
    ['', 'ios', 0, 'MOBILE'],
  ] as const)('detects %s independently of viewport', (agent, platform, touch, expected) =>
    expect(detectDeviceProfile(agent, platform, touch)).toBe(expected)
  );
  it('keeps read-only routes visible but disables mutations and hidden features', () => {
    expect(canUseCommercialFeature(['OWNER'], access, 'PURCHASES')).toBe(true);
    expect(canWriteCommercialFeature(['OWNER'], access, 'PURCHASES')).toBe(false);
    expect(canUseCommercialFeature(['OWNER'], access, 'PRODUCTS')).toBe(false);
    expect(deviceRequestBlocked(access, '/purchases', 'GET')).toBeNull();
    expect(deviceRequestBlocked(access, '/purchases', 'POST')).toBe('PURCHASES');
    expect(deviceRequestBlocked(access, '/products?take=50', 'GET')).toBe('PRODUCTS');
  });
  it('allows tablet and web operations only within plan and role restrictions', () => {
    expect(
      canWriteCommercialFeature(['OWNER'], { ...access, deviceProfile: 'TABLET' }, 'PURCHASES')
    ).toBe(true);
    expect(
      canWriteCommercialFeature(
        ['OWNER'],
        { ...access, deviceProfile: 'WEB', entitlements: [] },
        'PURCHASES'
      )
    ).toBe(false);
    expect(
      canWriteCommercialFeature(['CASHIER'], { ...access, deviceProfile: 'WEB' }, 'PURCHASES')
    ).toBe(false);
  });
  it('fails closed for missing feature policy but stays compatible with older API summaries', () => {
    expect(deviceFeatureMode(access, 'BACKUP_RESTORE')).toBe('HIDDEN');
    expect(deviceFeatureMode({ ...access, deviceAccess: undefined }, 'BACKUP_RESTORE')).toBe(
      'FULL'
    );
  });
  it('preserves account recovery and shopper endpoints while identifying financial writes', () => {
    for (const path of [
      '/auth/refresh-token',
      '/users/me/profile',
      '/users/me/password',
      '/customer-auth/verify',
      '/orders',
      '/subscription/access',
    ])
      expect(deviceRequestBlocked(access, path, 'POST')).toBeNull();
    expect(deviceRequestFeature('/invoices/held/7/claim', 'POST')).toBe('BILLING');
    expect(deviceRequestFeature('/invoices/7', 'GET')).toBe('INVOICES');
    expect(deviceRequestFeature('/purchases/import/extract', 'POST')).toBe('PURCHASE_BILL_IMPORT');
  });
});
