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
  receipt,
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
import { InvoicesPage } from '@features/invoices/InvoicesPage';
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
        <Route exact path={ROUTES.INVOICES} component={InvoicesPage} />
        <Route exact path={ROUTES.PAYMENTS} component={PaymentsPage} />
        <Route exact path={ROUTES.REPORTS} component={ReportsPage} />
        <Route exact path={ROUTES.USERS} component={UsersPage} />
        <Route exact path={ROUTES.IMPORT_EXPORT} component={ImportExportPage} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        {hasAccessToTab(userRoles, 'dashboard') && (
          <IonTabButton tab={ROUTES.DASHBOARD} href={ROUTES.DASHBOARD}>
            <IonIcon icon={home} />
            <IonLabel>{t('dashboard.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'billing') && (
          <IonTabButton tab={ROUTES.BILLING} href={ROUTES.BILLING}>
            <IonIcon icon={cart} />
            <IonLabel>{t('billing.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'customers') && (
          <IonTabButton tab={ROUTES.CUSTOMERS} href={ROUTES.CUSTOMERS}>
            <IonIcon icon={people} />
            <IonLabel>{t('customers.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'products') && (
          <IonTabButton tab={ROUTES.PRODUCTS} href={ROUTES.PRODUCTS}>
            <IonIcon icon={cube} />
            <IonLabel>{t('products.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'inventory') && (
          <IonTabButton tab={ROUTES.INVENTORY} href={ROUTES.INVENTORY}>
            <IonIcon icon={layers} />
            <IonLabel>{t('inventory.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'invoices') && (
          <IonTabButton tab={ROUTES.INVOICES} href={ROUTES.INVOICES}>
            <IonIcon icon={receipt} />
            <IonLabel>Invoices</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'payments') && (
          <IonTabButton tab={ROUTES.PAYMENTS} href={ROUTES.PAYMENTS}>
            <IonIcon icon={cash} />
            <IonLabel>{t('payments.title')}</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'reports') && (
          <IonTabButton tab={ROUTES.REPORTS} href={ROUTES.REPORTS}>
            <IonIcon icon={statsChart} />
            <IonLabel>Reports</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'users') && (
          <IonTabButton tab={ROUTES.USERS} href={ROUTES.USERS}>
            <IonIcon icon={personAdd} />
            <IonLabel>Users</IonLabel>
          </IonTabButton>
        )}

        {hasAccessToTab(userRoles, 'import-export') && (
          <IonTabButton tab={ROUTES.IMPORT_EXPORT} href={ROUTES.IMPORT_EXPORT}>
            <IonIcon icon={swapHorizontal} />
            <IonLabel>Import/Export</IonLabel>
          </IonTabButton>
        )}
      </IonTabBar>
    </IonTabs>
  );
};
