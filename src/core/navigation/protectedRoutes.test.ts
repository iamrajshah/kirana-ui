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
});
