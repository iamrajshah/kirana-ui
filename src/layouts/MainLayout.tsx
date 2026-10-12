import React, { lazy } from 'react';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import { Route, Redirect } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '../core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { getNavigationItems } from '@core/navigation/navigation';
import { SideMenu } from '@components';
import '@components/Workspace/workspace.css';

const DashboardPage = lazy(() => import('@features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const BillingPage = lazy(() => import('@features/billing/BillingPage').then((module) => ({ default: module.BillingPage })));
const CustomersPage = lazy(() => import('@features/customers/CustomersPage').then((module) => ({ default: module.CustomersPage })));
const ProductsPage = lazy(() => import('@features/products/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const InventoryPage = lazy(() => import('@features/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })));
const InvoicesPage = lazy(() => import('@features/invoices/InvoicesPage').then((module) => ({ default: module.InvoicesPage })));
const PaymentsPage = lazy(() => import('@features/payments/PaymentsPage').then((module) => ({ default: module.PaymentsPage })));
const ReportsPage = lazy(() => import('@features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const UsersPage = lazy(() => import('@features/users/UsersPage').then((module) => ({ default: module.UsersPage })));
const ImportExportPage = lazy(() => import('@features/import-export/ImportExportPage').then((module) => ({ default: module.ImportExportPage })));
const CategoriesPage = lazy(() => import('@features/categories/CategoriesPage').then((module) => ({ default: module.CategoriesPage })));
const SuppliersPage = lazy(() => import('@features/suppliers/SuppliersPage'));
const PurchasesPage = lazy(() => import('@features/purchases/PurchasesPage'));
const AboutPage = lazy(() => import('@features/about/AboutPage').then((module) => ({ default: module.AboutPage })));

export const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const primaryItems = getNavigationItems(userRoles).filter((item) => item.primary);

  return (
    <IonSplitPane contentId="main-content" when="(min-width: 992px)" className="workspace-split-pane">
      <SideMenu />
      <div id="main-content" className="workspace-main">
      <IonTabs className="workspace-tabs">
        <IonRouterOutlet>
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
          <Route exact path={ROUTES.ABOUT} component={AboutPage} />
        </IonRouterOutlet>

        <IonTabBar slot="bottom" className="workspace-bottom-tabs">
          {primaryItems.map((item) => (
            <IonTabButton key={item.id} tab={item.id} href={item.href}>
              <IonIcon icon={item.icon} />
              <IonLabel>{t(item.labelKey)}</IonLabel>
            </IonTabButton>
          ))}
        </IonTabBar>
      </IonTabs>
      </div>
    </IonSplitPane>
  );
};
