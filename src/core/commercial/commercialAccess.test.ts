import { describe, expect, it } from 'vitest';
import { commercialDenialMessage, canUseCommercialFeature } from './commercialAccess';

const summary = {
  planCode: 'PRO' as const,
  planLabel: 'Pro',
  state: 'ACTIVE' as const,
  accessStateVersion: '4',
  entitlements: ['CUSTOM_BARCODE', 'ADVANCED_REPORTS'] as const,
  limits: { staff: 7, firms: 1 },
  demoExpiresAt: null,
  endsAt: null,
  graceExpiresAt: null,
};

describe('commercial client helpers', () => {
  it('intersects staff role and plan entitlement', () => {
    expect(canUseCommercialFeature(['OWNER'], summary, 'CUSTOM_BARCODE')).toBe(true);
    expect(canUseCommercialFeature(['CASHIER'], summary, 'CUSTOM_BARCODE')).toBe(false);
  });

  it.each([
    ['COMMERCIAL_ENTITLEMENT_MISSING', 'Upgrade'],
    ['COMMERCIAL_READ_ONLY', 'renew'],
    ['COMMERCIAL_PROVISIONING', 'setup'],
  ])('provides actionable guidance for %s', (code, phrase) => {
    expect(commercialDenialMessage({ code: code as never, reason: '', action: 'UPGRADE' })).toMatch(
      new RegExp(phrase, 'i')
    );
  });
});
