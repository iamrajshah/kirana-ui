import { describe, expect, it } from 'vitest';
import {
  commercialDenialMessage,
  commercialFeatureDependencyFailure,
  canUseCommercialFeature,
  isCommercialDenial,
} from './commercialAccess';

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

  it('uses the server-provided role matrix without a POS redeployment', () => {
    expect(
      canUseCommercialFeature(
        ['MANAGER'],
        {
          ...summary,
          entitlements: ['LIVE_MARGIN_PREVIEW'],
          featureRoles: { LIVE_MARGIN_PREVIEW: ['OWNER', 'MANAGER'] },
        },
        'LIVE_MARGIN_PREVIEW'
      )
    ).toBe(true);
  });

  it('uses resolved legacy entitlements without bypassing lifecycle or role policy', () => {
    const legacy = {
      ...summary,
      planCode: 'LEGACY_COMPAT' as const,
      planLabel: 'Kirana',
      entitlements: ['CUSTOM_BARCODE'] as const,
    };

    expect(canUseCommercialFeature(['OWNER'], legacy, 'CUSTOM_BARCODE')).toBe(true);
    expect(canUseCommercialFeature(['CASHIER'], legacy, 'CUSTOM_BARCODE')).toBe(false);
    expect(
      canUseCommercialFeature(
        ['OWNER'],
        { ...legacy, featureRoles: { CUSTOM_BARCODE: [] } },
        'CUSTOM_BARCODE'
      )
    ).toBe(false);
    expect(
      canUseCommercialFeature(['OWNER'], { ...legacy, state: 'READ_ONLY' }, 'CUSTOM_BARCODE')
    ).toBe(false);
  });

  it('honors legacy dependency entitlements and role restrictions', () => {
    const legacy = {
      ...summary,
      planCode: 'LEGACY_COMPAT' as const,
      planLabel: 'Kirana',
      entitlements: ['EXPIRY_TRACKING', 'INVENTORY', 'PRODUCTS'] as const,
      featureRoles: {
        EXPIRY_TRACKING: ['OWNER'],
        INVENTORY: [] as readonly string[],
      },
    };

    expect(canUseCommercialFeature(['OWNER'], legacy, 'EXPIRY_TRACKING')).toBe(false);
    expect(commercialFeatureDependencyFailure(['OWNER'], legacy, 'EXPIRY_TRACKING')).toBe(
      'INVENTORY'
    );

    const enabled = {
      ...legacy,
      featureRoles: { EXPIRY_TRACKING: ['OWNER'], INVENTORY: ['OWNER'] },
    };
    expect(canUseCommercialFeature(['OWNER'], enabled, 'EXPIRY_TRACKING')).toBe(true);
    expect(
      canUseCommercialFeature(
        ['OWNER'],
        { ...enabled, entitlements: ['EXPIRY_TRACKING', 'PRODUCTS'] },
        'EXPIRY_TRACKING'
      )
    ).toBe(false);
  });

  it('honors shop-disabled features in legacy plans instead of granting the whole plan', () => {
    const legacy = {
      ...summary,
      planCode: 'LEGACY_COMPAT' as const,
      entitlements: ['BILLING'] as const,
    };

    expect(canUseCommercialFeature(['OWNER'], legacy, 'BILLING')).toBe(true);
    expect(canUseCommercialFeature(['OWNER'], legacy, 'REPORTS')).toBe(false);
    expect(canUseCommercialFeature(['OWNER'], legacy, 'LIVE_MARGIN_PREVIEW')).toBe(false);
    expect(canUseCommercialFeature(['OWNER'], { ...legacy, entitlements: [] }, 'BILLING')).toBe(
      false
    );
  });

  it('keeps GST/CA reports owner-only by fallback while honoring runtime role policy', () => {
    const gstSummary = {
      ...summary,
      entitlements: ['GST_CA_REPORTS', 'ESSENTIAL_REPORTS', 'BILLING'] as const,
    };
    expect(canUseCommercialFeature(['OWNER'], gstSummary, 'GST_CA_REPORTS')).toBe(true);
    expect(canUseCommercialFeature(['MANAGER'], gstSummary, 'GST_CA_REPORTS')).toBe(false);
    expect(
      canUseCommercialFeature(
        ['MANAGER'],
        { ...gstSummary, featureRoles: { GST_CA_REPORTS: ['OWNER', 'MANAGER'] } },
        'GST_CA_REPORTS'
      )
    ).toBe(true);
  });

  it.each([
    ['EXPIRY_TRACKING', ['INVENTORY', 'PRODUCTS'], 'PRODUCTS'],
    ['PURCHASE_BILL_IMPORT', ['PURCHASES', 'SUPPLIERS', 'PRODUCTS', 'BILLING'], 'BILLING'],
    ['GST_CA_REPORTS', ['ESSENTIAL_REPORTS', 'BILLING'], 'BILLING'],
  ] as const)(
    'requires the runtime dependency closure for %s',
    (feature, dependencies, removedDependency) => {
      const complete = {
        ...summary,
        entitlements: [feature, ...dependencies],
      };
      expect(canUseCommercialFeature(['OWNER'], complete, feature)).toBe(true);

      const incomplete = {
        ...complete,
        entitlements: complete.entitlements.filter((item) => item !== removedDependency),
      };
      expect(canUseCommercialFeature(['OWNER'], incomplete, feature)).toBe(false);
      expect(commercialFeatureDependencyFailure(['OWNER'], incomplete, feature)).toBe(
        removedDependency
      );
    }
  );

  it.each([
    ['COMMERCIAL_ENTITLEMENT_MISSING', 'Upgrade'],
    ['COMMERCIAL_READ_ONLY', 'renew'],
    ['COMMERCIAL_PROVISIONING', 'setup'],
  ])('provides actionable guidance for %s', (code, phrase) => {
    expect(commercialDenialMessage({ code: code as never, reason: '', action: 'UPGRADE' })).toMatch(
      new RegExp(phrase, 'i')
    );
  });

  it('rejects unknown or malformed commercial denial payloads', () => {
    expect(
      isCommercialDenial({
        code: 'COMMERCIAL_UNKNOWN',
        reason: 'unknown',
        action: 'UPGRADE',
      })
    ).toBe(false);
    expect(
      isCommercialDenial({
        code: 'COMMERCIAL_READ_ONLY',
        reason: 'read only',
        action: 'UNKNOWN',
      })
    ).toBe(false);
    expect(isCommercialDenial({ code: 'COMMERCIAL_READ_ONLY', action: 'RENEW' })).toBe(false);
  });
});
