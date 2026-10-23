import React, { lazy, useEffect, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  IonApp,
  IonBackButton,
  IonButtons,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonToolbar,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Switch, useHistory } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { mainLayoutPaths } from '@core/navigation/protectedRoutes';
import { RoutePageSuspense } from '@layouts/RoutePageSuspense';

setupIonicReact({ mode: 'md' });

describe('main application navigation', () => {
  it.each([1, 2, 3, 4, 5])(
    'keeps one shell mounted while navigating between primary and detail routes (run %s)',
    async () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();

    let resolveProductDetail: () => void = () => undefined;
    const ProductDetail = () => (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/products" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <p>Product details</p>
      </IonPage>
    );
    const LazyProductDetail = lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) => {
          resolveProductDetail = () => resolve({ default: ProductDetail });
        })
    );

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
                  <IonItem button onClick={() => history.push('/products')}>
                    <IonLabel>Open products</IonLabel>
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
                  <IonItem button onClick={() => history.push('/products')}>
                    <IonLabel>Open products</IonLabel>
                  </IonItem>
                </>
              )}
            />
            <Route
              exact
              path="/products"
              render={() => (
                <>
                  <IonInput aria-label="Product list search" />
                  <IonItem button onClick={() => history.push('/products/137')}>
                    <IonLabel>Open product details</IonLabel>
                  </IonItem>
                </>
              )}
            />
            <Route
              exact
              path="/products/:id"
              render={() => (
                <RoutePageSuspense loadingLabel="Loading page">
                  <LazyProductDetail />
                </RoutePageSuspense>
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

    const view = render(
      <IonApp>
        <IonReactRouter>
          <Switch>
            <Route exact path={mainLayoutPaths} render={() => <LayoutProbe />} />
          </Switch>
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

    fireEvent.click(screen.getByText('Open products').closest('ion-item')!);
    await waitFor(() => {
      expect(screen.getByLabelText('Product list search')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Open product details').closest('ion-item')!);
    expect((await screen.findByRole('status')).textContent).toBe('Loading page');
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();

    resolveProductDetail();
    await waitFor(() => {
      expect(screen.getByText('Product details')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('ion-back-button')!);
    await waitFor(() => {
      expect(screen.getByLabelText('Product list search')).toBeTruthy();
    });
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    expect(document.querySelectorAll('ion-tabs')).toHaveLength(1);

    await act(async () => {
      view.unmount();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    expect(unmounted).toHaveBeenCalledTimes(1);
    }
  );
});
