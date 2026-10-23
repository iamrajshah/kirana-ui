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

  it('does not treat the purchase creation URL as a purchase ID', () => {
    const detailRoute = protectedPageRoutes.find(({ id }) => id === 'purchase-detail');

    expect(detailRoute).toBeDefined();
    expect(matchPath('/purchases/create', { path: detailRoute!.path, exact: true })).toBeNull();
    expect(matchPath('/purchases/42', { path: detailRoute!.path, exact: true })).not.toBeNull();
  });
});
