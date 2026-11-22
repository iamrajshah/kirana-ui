import React, { lazy } from 'react';
import { render, screen } from '@testing-library/react';
import { NavContext, StackContext, setupIonicReact } from '@ionic/react';
import { describe, expect, it, vi } from 'vitest';
import { RoutePageSuspense } from './RoutePageSuspense';

setupIonicReact({ mode: 'md' });

describe('RoutePageSuspense', () => {
  it('shows a branded page skeleton while a lazy route is loading', () => {
    const PendingPage = lazy(() => new Promise<{ default: React.ComponentType }>(() => undefined));

    const { container } = render(
      <RoutePageSuspense loadingLabel="Loading page">
        <PendingPage />
      </RoutePageSuspense>
    );

    expect(screen.getByRole('status').textContent).toContain('Loading page');
    expect(container.querySelectorAll('.route-loading-skeleton__card')).toHaveLength(3);
  });
  it('does not register a temporary loading skeleton as the route page', () => {
    const registerIonPage = vi.fn();
    const PendingPage = lazy(() => new Promise<{ default: React.ComponentType }>(() => undefined));
    const Routed = () => {
      const nav = React.useContext(NavContext);
      const stack = React.useContext(StackContext);
      return (
        <NavContext.Provider value={{ ...nav, hasIonicRouter: () => true }}>
          <StackContext.Provider value={{ ...stack, registerIonPage }}>
            <RoutePageSuspense loadingLabel="Loading page">
              <PendingPage />
            </RoutePageSuspense>
          </StackContext.Provider>
        </NavContext.Provider>
      );
    };
    render(<Routed />);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(registerIonPage).not.toHaveBeenCalled();
  });
});
