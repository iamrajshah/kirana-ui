// @vitest-environment jsdom
import React, { type PropsWithChildren } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MainLayout } from './MainLayout';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: '/dashboard' }),
  Route: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock('../core/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      user: { id: 'owner-1', roles: ['OWNER'] },
      commercialAccess: { state: 'PROVISIONING', planCode: 'DEMO' },
    }),
}));
vi.mock('@core/auth/authSlice', () => ({
  selectCurrentUser: (state: { user: unknown }) => state.user,
  selectCommercialAccess: (state: { commercialAccess: unknown }) => state.commercialAccess,
}));
vi.mock('@core/api/subscriptionApi', () => ({ useGetCommercialAccessQuery: () => ({}) }));
vi.mock('@core/navigation/navigation', () => ({
  getNavigationItems: () => [{ id: 'dashboard', href: '/dashboard', primary: true }],
  getPrimaryTabForPath: () => 'dashboard',
}));
vi.mock('@core/navigation/protectedRoutes', () => ({
  protectedMainLayoutRoutes: [],
  protectedPageRoutes: [],
}));
vi.mock('@components', () => ({ SideMenu: () => <div data-testid="side-menu" /> }));
vi.mock('./BackgroundDataWarmup', () => ({
  BackgroundDataWarmup: () => <div data-testid="background-warmup" />,
}));
vi.mock('./SessionLifecycleSync', () => ({
  SessionLifecycleSync: () => <div data-testid="lifecycle-sync" />,
}));
vi.mock('./routePreload', () => ({ scheduleRoutePreload: vi.fn() }));
vi.mock('@features/account/ProvisioningRecoveryPage', () => ({
  ProvisioningRecoveryPage: () => <div data-testid="provisioning-recovery" />,
}));
vi.mock('@ionic/react', () => {
  const Box = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonTabs: Box,
    IonTabBar: Box,
    IonTabButton: Box,
    IonIcon: Box,
    IonLabel: Box,
    IonRouterOutlet: Box,
    IonSplitPane: Box,
  };
});

afterEach(cleanup);

describe('MainLayout provisioning boundary', () => {
  it('shows only setup recovery and does not mount operational navigation or warmups', () => {
    render(<MainLayout />);

    expect(screen.getByTestId('provisioning-recovery')).toBeTruthy();
    expect(screen.queryByTestId('side-menu')).toBeNull();
    expect(screen.queryByTestId('background-warmup')).toBeNull();
    expect(screen.queryByTestId('lifecycle-sync')).toBeNull();
  });
});
