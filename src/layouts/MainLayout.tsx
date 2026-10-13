import React, { lazy } from 'react';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import { Route } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '../core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { getNavigationItems } from '@core/navigation/navigation';
import { protectedMainLayoutRoutes } from '@core/navigation/protectedRoutes';
import { SideMenu } from '@components';
import { PrivateRoute } from './PrivateRoute';
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

const mainPageComponents: Record<string, React.ComponentType> = {
  [ROUTES.DASHBOARD]: DashboardPage,
  [ROUTES.BILLING]: BillingPage,
  [ROUTES.CUSTOMERS]: CustomersPage,
  [ROUTES.PRODUCTS]: ProductsPage,
  [ROUTES.PAYMENTS]: PaymentsPage,
  [ROUTES.SUPPLIERS]: SuppliersPage,
  [ROUTES.PURCHASES]: PurchasesPage,
  [ROUTES.INVENTORY]: InventoryPage,
  [ROUTES.INVOICES]: InvoicesPage,
  [ROUTES.REPORTS]: ReportsPage,
  [ROUTES.USERS]: UsersPage,
  [ROUTES.CATEGORIES]: CategoriesPage,
  [ROUTES.IMPORT_EXPORT]: ImportExportPage,
};

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
          {protectedMainLayoutRoutes.map(({ path, permission }) => {
            const Component = mainPageComponents[path];
            return (
              <Route
                key={path}
                exact
                path={path}
                render={() => (
                  <PrivateRoute permission={permission}>
                    <Component />
                  </PrivateRoute>
                )}
              />
            );
          })}
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
