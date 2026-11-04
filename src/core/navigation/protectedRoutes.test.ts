import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@core/constants';
import { protectedPageRoutes } from './protectedRoutes';

describe('protected page route precedence', () => {
  it('selects purchase creation before the parameterized detail route', () => {
    const selectedRoute = protectedPageRoutes.find(({ path }) =>
      matchPath('/purchases/create', { path, exact: true })
    );

    expect(selectedRoute?.id).toBe('purchase-create');
  });

  it('does not treat the purchase creation URL as a purchase ID', () => {
    const detailRoute = protectedPageRoutes.find(({ id }) => id === 'purchase-detail');

    expect(detailRoute).toBeDefined();
    expect(matchPath('/purchases/create', { path: detailRoute!.path, exact: true })).toBeNull();
    expect(matchPath('/purchases/42', { path: detailRoute!.path, exact: true })).not.toBeNull();
  });

  it.each([
    [ROUTES.PURCHASE_IMPORT, 'purchase-import', 'PURCHASE_BILL_IMPORT'],
    [ROUTES.EXPIRY_ALERTS, 'expiry-alerts', 'EXPIRY_TRACKING'],
    [ROUTES.GST_REPORTS, 'gst-reports', 'GST_CA_REPORTS'],
  ] as const)('gates %s with its dedicated commercial feature', (path, id, feature) => {
    const route = protectedPageRoutes.find((candidate) => candidate.path === path);

    expect(route?.id).toBe(id);
    expect(route?.commercialFeature).toBe(feature);
  });
});
