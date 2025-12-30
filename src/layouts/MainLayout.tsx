import React from 'react';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { Route, Redirect } from 'react-router';
import {
  home,
  cart,
  people,
  cube,
  layers,
  cash,
  statsChart,
  personAdd,
  swapHorizontal,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '../core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { hasAccessToTab } from '@core/permissions/rolePermissions';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { BillingPage } from '@features/billing/BillingPage';
import { CustomersPage } from '@features/customers/CustomersPage';
import { ProductsPage } from '@features/products/ProductsPage';
import { InventoryPage } from '@features/inventory/InventoryPage';
import { PaymentsPage } from '@features/payments/PaymentsPage';
import { ReportsPage } from '@features/reports/ReportsPage';
import { UsersPage } from '@features/users/UsersPage';
import { ImportExportPage } from '@features/import-export/ImportExportPage';

export const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/">
          <Redirect to={ROUTES.DASHBOARD} />
        </Route>
        <Route exact path={ROUTES.DASHBOARD} component={DashboardPage} />
        <Route exact path={ROUTES.BILLING} component={BillingPage} />
        <Route exact path={ROUTES.CUSTOMERS} component={CustomersPage} />
        <Route exact path={ROUTES.PRODUCTS} component={ProductsPage} />
        <Route exact path={ROUTES.INVENTORY} component={InventoryPage} />
        <Route exact path={ROUTES.PAYMENTS} component={PaymentsPage} />
        <Route exact path="/reports" component={ReportsPage} />
        <Route exact path="/users" component={UsersPage} />
        <Route exact path="/import-export" component={ImportExportPage} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        {hasAccessToTab(userRoles, 'dashboard') && (
          <IonTabButton tab="dashboard" href={ROUTES.DASHBOARD}>
            <IonIcon icon={home} />
            <IonLabel>{t('dashboard.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'billing') && (
          <IonTabButton tab="billing" href={ROUTES.BILLING}>
            <IonIcon icon={cart} />
            <IonLabel>{t('billing.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'customers') && (
          <IonTabButton tab="customers" href={ROUTES.CUSTOMERS}>
            <IonIcon icon={people} />
            <IonLabel>{t('customers.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'products') && (
          <IonTabButton tab="products" href={ROUTES.PRODUCTS}>
            <IonIcon icon={cube} />
            <IonLabel>{t('products.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'inventory') && (
          <IonTabButton tab="inventory" href={ROUTES.INVENTORY}>
            <IonIcon icon={layers} />
            <IonLabel>{t('inventory.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'payments') && (
          <IonTabButton tab="payments" href={ROUTES.PAYMENTS}>
            <IonIcon icon={cash} />
            <IonLabel>{t('payments.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'reports') && (
          <IonTabButton tab="reports" href="/reports">
            <IonIcon icon={statsChart} />
            <IonLabel>Reports</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'users') && (
          <IonTabButton tab="users" href="/users">
            <IonIcon icon={personAdd} />
            <IonLabel>Users</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'import-export') && (
          <IonTabButton tab="import-export" href="/import-export">
            <IonIcon icon={swapHorizontal} />
            <IonLabel>Import/Export</IonLabel>
          </IonTabButton>
        )}
      </IonTabBar>
    </IonTabs>
  );
};
