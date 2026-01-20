import React from 'react';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { Route, Redirect } from 'react-router';
import {
  home,
  cart,
  people,
  cube,
  cash,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '../core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { hasAccessToTab } from '@core/permissions/rolePermissions';
import { SideMenu } from '@components';
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
import { CategoriesPage } from '@features/categories/CategoriesPage';
import SuppliersPage from '@features/suppliers/SuppliersPage';
import PurchasesPage from '@features/purchases/PurchasesPage';

export const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];

  return (
    <>
      <SideMenu />
      <IonTabs>
        <IonRouterOutlet id="main-content">
          <Route exact path="/">
            <Redirect to={ROUTES.DASHBOARD} />
          </Route>
          <Route exact path={ROUTES.DASHBOARD} component={DashboardPage} />
          <Route exact path={ROUTES.BILLING} component={BillingPage} />
          <Route exact path={ROUTES.CUSTOMERS} component={CustomersPage} />
          <Route exact path={ROUTES.PRODUCTS} component={ProductsPage} />
          <Route exact path={ROUTES.PAYMENTS} component={PaymentsPage} />
          <Route exact path={ROUTES.SUPPLIERS} component={SuppliersPage} />
          <Route exact path={ROUTES.PURCHASES} component={PurchasesPage} />
          <Route exact path={ROUTES.INVENTORY} component={InventoryPage} />
          <Route exact path={ROUTES.INVOICES} component={InvoicesPage} />
          <Route exact path={ROUTES.REPORTS} component={ReportsPage} />
          <Route exact path={ROUTES.USERS} component={UsersPage} />
          <Route exact path={ROUTES.CATEGORIES} component={CategoriesPage} />
          <Route exact path={ROUTES.IMPORT_EXPORT} component={ImportExportPage} />
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

          {hasAccessToTab(userRoles, 'payments') && (
            <IonTabButton tab="payments" href={ROUTES.PAYMENTS}>
              <IonIcon icon={cash} />
              <IonLabel>{t('payments.title')}</IonLabel>
            </IonTabButton>
          )}
        </IonTabBar>
      </IonTabs>
    </>
  );
};
