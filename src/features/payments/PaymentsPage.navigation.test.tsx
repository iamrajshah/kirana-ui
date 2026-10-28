import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  IonApp,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PaymentsPage } from './PaymentsPage';

const createPayment = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@core/api/paymentApi', () => ({
  useGetPaymentsQuery: () => ({ data: { data: [] }, isLoading: false, isError: false, refetch: vi.fn() }),
  useCreatePaymentMutation: () => [createPayment, { isLoading: false }],
}));
vi.mock('@core/api/customerApi', () => ({
  useGetCustomersQuery: () => ({
    data: { data: [{ id: 'customer-1', name: 'Amit Patel', phone: '9000000201' }] },
  }),
}));
vi.mock('@core/api/invoiceApi', () => ({
  useLazyGetPendingInvoicesByCustomerQuery: () => [vi.fn(), { data: { data: [] }, isLoading: false }],
}));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({
  Input: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value?: string;
    onChange?: (value: string) => void;
  }) => (
    <input
      aria-label={label}
      value={value || ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
  SearchBar: () => <input aria-label="payment-search" />,
  Select: ({
    label,
    value,
    onChange,
    options = [],
  }: {
    label: string;
    value?: string;
    onChange?: (value: string) => void;
    options?: Array<{ value: string; label: string }>;
  }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="" />
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick}>{children}</button>
  ),
  EmptyState: ({ action }: { action?: React.ReactNode }) => <div>{action}</div>,
}));

setupIonicReact({ mode: 'md', animated: false });

beforeEach(() => {
  createPayment.mockReset();
  createPayment.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: 'payment-1' } }) });
  window.history.replaceState({}, '', '/payments');
});

afterEach(cleanup);

it('dismisses the real Ionic payment modal before Dashboard navigation', async () => {
  render(
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/payments" render={() => <PaymentsPage />} />
            <Route
              exact
              path="/dashboard"
              render={() => (
                <IonPage>
                  <h1>Dashboard content</h1>
                </IonPage>
              )}
            />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="payments" href="/payments">
              <IonLabel>Payments tab</IonLabel>
            </IonTabButton>
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonLabel>Dashboard tab</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );

  fireEvent.click(screen.getAllByRole('button', { name: 'payments.recordPayment' })[0]);
  const customerSelect = await screen.findByLabelText(
    'billing.selectCustomer',
    undefined,
    { timeout: 5000 }
  );
  fireEvent.change(customerSelect, {
    target: { value: 'customer-1' },
  });
  fireEvent.change(screen.getByLabelText('common.amount'), { target: { value: '100' } });
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

  await waitFor(() => {
    expect(document.querySelector('ion-modal.show-modal')).toBeNull();
    expect(document.body.classList.contains('backdrop-no-scroll')).toBe(false);
  });

  const dashboardTab = document.querySelector('ion-tab-button[tab="dashboard"]');
  expect(dashboardTab).toBeTruthy();
  fireEvent.click(dashboardTab!);

  await waitFor(() => expect(screen.getByText('Dashboard content')).toBeTruthy());
});
