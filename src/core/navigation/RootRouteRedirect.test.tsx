import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@core/constants';
import { RootRouteRedirect } from './RootRouteRedirect';

const authState = vi.hoisted(() => ({
  accessToken: null as string | null,
  mustChangePassword: false,
}));

vi.mock('@core/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: authState }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    Redirect: ({ to }: { to: string }) => <output data-testid="redirect-target">{to}</output>,
  };
});

describe('RootRouteRedirect', () => {
  afterEach(cleanup);

  beforeEach(() => {
    authState.accessToken = null;
    authState.mustChangePassword = false;
  });

  it('sends a signed-out session to login', () => {
    render(<RootRouteRedirect />);
    expect(screen.getByTestId('redirect-target').textContent).toBe(ROUTES.LOGIN);
  });

  it('restores a hydrated session to the dashboard', () => {
    authState.accessToken = 'restored-native-session';
    render(<RootRouteRedirect />);
    expect(screen.getByTestId('redirect-target').textContent).toBe(ROUTES.DASHBOARD);
  });

  it('preserves first-login password enforcement after hydration', () => {
    authState.accessToken = 'restored-native-session';
    authState.mustChangePassword = true;
    render(<RootRouteRedirect />);
    expect(screen.getByTestId('redirect-target').textContent).toBe(ROUTES.CHANGE_PASSWORD);
  });
});
