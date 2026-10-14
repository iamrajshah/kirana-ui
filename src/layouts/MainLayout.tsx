import React, { lazy } from 'react';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import { Route } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '../core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { getNavigationItems } from '@core/navigation/navigation';
import type { TabPermission } from '@core/permissions/rolePermissions';
import {
  protectedMainLayoutRoutes,
  protectedPageRoutes,
  type ProtectedPageRouteId,
} from '@core/navigation/protectedRoutes';
import { SideMenu } from '@components';
import { PrivateRoute } from './PrivateRoute';
import { RoutePageSuspense } from './RoutePageSuspense';
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
const ProfilePage = lazy(() => import('@features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const ChangePasswordPage = lazy(() => import('@features/profile/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })));
const CustomerLedgerPage = lazy(() => import('@features/customers/CustomerLedgerPage').then((module) => ({ default: module.CustomerLedgerPage })));
const ProductDetailPage = lazy(() => import('@features/products/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })));
const AddProductBarcodePage = lazy(() => import('@features/products/AddProductBarcodePage').then((module) => ({ default: module.AddProductBarcodePage })));
const InvoiceDetailPage = lazy(() => import('@features/invoices/InvoiceDetailPage'));
const SupplierLedgerPage = lazy(() => import('@features/suppliers/SupplierLedgerPage'));
const CreatePurchasePage = lazy(() => import('@features/purchases/CreatePurchasePage'));
const PurchaseDetailPage = lazy(() => import('@features/purchases/PurchaseDetailPage'));

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

const protectedPageComponents: Record<ProtectedPageRouteId, React.ComponentType> = {
  'customer-ledger': CustomerLedgerPage,
  'product-detail': ProductDetailPage,
  'product-barcode': AddProductBarcodePage,
  'supplier-ledger': SupplierLedgerPage,
  'invoice-detail': InvoiceDetailPage,
  'purchase-detail': PurchaseDetailPage,
  'purchase-create': CreatePurchasePage,
};

export const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const primaryItems = getNavigationItems(userRoles).filter((item) => item.primary);
  const renderPage = (Component: React.ComponentType, permission?: TabPermission) => (
    <PrivateRoute permission={permission}>
      <RoutePageSuspense loadingLabel={t('common.loading')}>
        <Component />
      </RoutePageSuspense>
    </PrivateRoute>
  );

  return (
    <IonSplitPane contentId="main-content" when="(min-width: 992px)" className="workspace-split-pane">
      <SideMenu />
      <div id="main-content" className="workspace-main">
      <IonTabs className="workspace-tabs">
        <IonRouterOutlet>
          <Route exact path={ROUTES.PROFILE} render={() => renderPage(ProfilePage)} />
          <Route exact path={ROUTES.CHANGE_PASSWORD} render={() => renderPage(ChangePasswordPage)} />
          {protectedPageRoutes.map(({ id, path, permission }) => {
            const Component = protectedPageComponents[id];
            return (
              <Route
                key={id}
                exact
                path={path}
                render={() => renderPage(Component, permission)}
              />
            );
          })}
          {protectedMainLayoutRoutes.map(({ path, permission }) => {
            const Component = mainPageComponents[path];
            return (
              <Route
                key={path}
                exact
                path={path}
                render={() => renderPage(Component, permission)}
              />
            );
          })}
          <Route exact path={ROUTES.ABOUT} render={() => renderPage(AboutPage)} />
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
