import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateRoute } from './PrivateRoute';

const useAppSelector = vi.fn();

vi.mock('@hooks/useAppSelector', () => ({ useAppSelector: (selector: unknown) => useAppSelector(selector) }));
vi.mock('react-router', () => ({ Redirect: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div> }));

describe('PrivateRoute', () => {
  beforeEach(() => useAppSelector.mockReset());
  afterEach(cleanup);

  it('sends signed-out users to login', () => {
    useAppSelector.mockReturnValueOnce(false);

    render(<PrivateRoute><div>protected</div></PrivateRoute>);

    expect(screen.getByTestId('redirect').textContent).toBe('/login');
  });

  it('blocks a signed-in cashier from an owner-only route', () => {
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['CASHIER'] });

    render(<PrivateRoute permission="reports"><div>reports</div></PrivateRoute>);

    expect(screen.getByTestId('redirect').textContent).toBe('/dashboard');
    expect(screen.queryByText('reports')).toBeNull();
  });

  it('renders an allowed route', () => {
    useAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce({ roles: ['CASHIER'] });

    render(<PrivateRoute permission="billing"><div>billing</div></PrivateRoute>);

    expect(screen.getByText('billing')).toBeTruthy();
  });
});
