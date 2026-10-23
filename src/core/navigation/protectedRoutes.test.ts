import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { protectedPageRoutes } from './protectedRoutes';

describe('protected page route precedence', () => {
  it('selects purchase creation before the parameterized detail route', () => {
    const selectedRoute = protectedPageRoutes.find(({ path }) =>
      matchPath('/purchases/create', { path, exact: true })
    );

    expect(selectedRoute?.id).toBe('purchase-create');
  });

  it('does not treat the purchase creation URL as a purchase id', () => {
    const purchaseDetailRoute = protectedPageRoutes.find(({ id }) => id === 'purchase-detail');

    expect(
      matchPath('/purchases/create', { path: purchaseDetailRoute?.path, exact: true })
    ).toBeNull();
  });
});
