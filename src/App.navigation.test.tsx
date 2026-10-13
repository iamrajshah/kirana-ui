import React, { useEffect, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  IonApp,
  IonInput,
  IonItem,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, useHistory } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { mainLayoutPaths } from '@core/navigation/protectedRoutes';

setupIonicReact({ mode: 'md' });

describe('main application navigation', () => {
  it('keeps one shell mounted while Ionic switches primary routes', async () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();

    const LayoutProbe = () => {
      const [query, setQuery] = useState('');
      const history = useHistory();

      useEffect(() => {
        mounted();
        return unmounted;
      }, []);

      return (
        <IonTabs>
          <IonRouterOutlet>
            <Route
              exact
              path="/dashboard"
              render={() => (
                <>
                  <IonInput
                    aria-label="Product search"
                    value={query}
                    onIonInput={(event) => setQuery(event.detail.value ?? '')}
                  />
                  <output aria-label="Search value">{query}</output>
                  <IonItem button onClick={() => history.push('/billing')}>
                    <IonLabel>Open billing</IonLabel>
                  </IonItem>
                </>
              )}
            />
            <Route
              exact
              path="/billing"
              render={() => (
                <>
                  <IonInput
                    aria-label="Billing product search"
                    value={query}
                    onIonInput={(event) => setQuery(event.detail.value ?? '')}
                  />
                  <output aria-label="Billing search value">{query}</output>
                </>
              )}
            />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>
            <IonTabButton tab="billing" href="/billing">
              <IonLabel>Billing</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      );
    };

    window.history.replaceState({}, '', '/dashboard');

    render(
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path={mainLayoutPaths} render={() => <LayoutProbe />} />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    );

    fireEvent(screen.getByLabelText('Product search'), new CustomEvent('ionInput', {
      detail: { value: 'rice' },
      bubbles: true,
    }));
    expect(screen.getByLabelText('Search value').textContent).toBe('rice');

    fireEvent.click(screen.getByText('Open billing').closest('ion-item')!);

    await waitFor(() => {
      expect(screen.getByLabelText('Billing product search')).toBeTruthy();
    });
    fireEvent(screen.getByLabelText('Billing product search'), new CustomEvent('ionInput', {
      detail: { value: 'wheat' },
      bubbles: true,
    }));
    expect(screen.getByLabelText('Billing search value').textContent).toBe('wheat');
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
  });
});
