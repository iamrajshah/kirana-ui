import React, { lazy } from 'react';
import { render, screen } from '@testing-library/react';
import { setupIonicReact } from '@ionic/react';
import { describe, expect, it } from 'vitest';
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
});
