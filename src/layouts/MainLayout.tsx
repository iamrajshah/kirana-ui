import React, { lazy, useEffect, useMemo } from 'react';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonSplitPane,
} from '@ionic/react';
import { Route, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '../core/hooks';
import { selectCommercialAccess, selectCurrentUser } from '@core/auth/authSlice';
import { getNavigationItems, getPrimaryTabForPath } from '@core/navigation/navigation';
import type { TabPermission } from '@core/permissions/rolePermissions';
import {
  protectedMainLayoutRoutes,
  protectedPageRoutes,
  type ProtectedPageRouteId,
} from '@core/navigation/protectedRoutes';
import { SideMenu } from '@components';
import { PrivateRoute } from './PrivateRoute';
import { RoutePageSuspense } from './RoutePageSuspense';
import { scheduleRoutePreload, type RouteLoader } from './routePreload';
import { BackgroundDataWarmup } from './BackgroundDataWarmup';
import '@components/Workspace/workspace.css';
import { useGetCommercialAccessQuery } from '@core/api/subscriptionApi';
import { SessionLifecycleSync } from './SessionLifecycleSync';

const DashboardPage = lazy(() =>
  import('@features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const loadBillingPage = () =>
  import('@features/billing/BillingPage').then((module) => ({ default: module.BillingPage }));
const loadCustomersPage = () =>
  import('@features/customers/CustomersPage').then((module) => ({ default: module.CustomersPage }));
const loadProductsPage = () =>
  import('@features/products/ProductsPage').then((module) => ({ default: module.ProductsPage }));
const loadInventoryPage = () =>
  import('@features/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage }));
const BillingPage = lazy(loadBillingPage);
const CustomersPage = lazy(loadCustomersPage);
const ProductsPage = lazy(loadProductsPage);
const InventoryPage = lazy(loadInventoryPage);
const InvoicesPage = lazy(() =>
  import('@features/invoices/InvoicesPage').then((module) => ({ default: module.InvoicesPage }))
);
const PaymentsPage = lazy(() =>
  import('@features/payments/PaymentsPage').then((module) => ({ default: module.PaymentsPage }))
);
const ReportsPage = lazy(() =>
  import('@features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage }))
);
const UsersPage = lazy(() =>
  import('@features/users/UsersPage').then((module) => ({ default: module.UsersPage }))
);
const ImportExportPage = lazy(() =>
  import('@features/import-export/ImportExportPage').then((module) => ({
    default: module.ImportExportPage,
  }))
);
const CategoriesPage = lazy(() =>
  import('@features/categories/CategoriesPage').then((module) => ({
    default: module.CategoriesPage,
  }))
);
const SuppliersPage = lazy(() => import('@features/suppliers/SuppliersPage'));
const PurchasesPage = lazy(() => import('@features/purchases/PurchasesPage'));
const AboutPage = lazy(() =>
  import('@features/about/AboutPage').then((module) => ({ default: module.AboutPage }))
);
const ProfilePage = lazy(() =>
  import('@features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage }))
);
const ChangePasswordPage = lazy(() =>
  import('@features/profile/ChangePasswordPage').then((module) => ({
    default: module.ChangePasswordPage,
  }))
);
const SubscriptionAccountPage = lazy(() =>
  import('@features/account/SubscriptionAccountPage').then((module) => ({
    default: module.SubscriptionAccountPage,
  }))
);
const RenewalPage = lazy(() =>
  import('@features/account/RenewalPage').then((module) => ({ default: module.RenewalPage }))
);
const RestrictedPage = lazy(() =>
  import('@features/account/RestrictedPage').then((module) => ({ default: module.RestrictedPage }))
);
const AccountExportPage = lazy(() =>
  import('@features/account/AccountExportPage').then((module) => ({
    default: module.AccountExportPage,
  }))
);
const CustomerLedgerPage = lazy(() =>
  import('@features/customers/CustomerLedgerPage').then((module) => ({
    default: module.CustomerLedgerPage,
  }))
);
const ProductDetailPage = lazy(() =>
  import('@features/products/ProductDetailPage').then((module) => ({
    default: module.ProductDetailPage,
  }))
);
const AddProductBarcodePage = lazy(() =>
  import('@features/products/AddProductBarcodePage').then((module) => ({
    default: module.AddProductBarcodePage,
  }))
);
const InvoiceDetailPage = lazy(() => import('@features/invoices/InvoiceDetailPage'));
const SupplierLedgerPage = lazy(() => import('@features/suppliers/SupplierLedgerPage'));
const CreatePurchasePage = lazy(() => import('@features/purchases/CreatePurchasePage'));
const PurchaseDetailPage = lazy(() => import('@features/purchases/PurchaseDetailPage'));
const ShiftsPage = lazy(() => import('@features/shifts/ShiftsPage'));
const GettingStartedPage = lazy(() => import('@features/onboarding/GettingStartedPage'));

const priorityRoutePreloaders: readonly { href: string; load: RouteLoader }[] = [
  { href: ROUTES.BILLING, load: loadBillingPage },
  { href: ROUTES.CUSTOMERS, load: loadCustomersPage },
  { href: ROUTES.PRODUCTS, load: loadProductsPage },
  { href: ROUTES.INVENTORY, load: loadInventoryPage },
];

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
  [ROUTES.SHIFTS]: ShiftsPage,
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
  const location = useLocation();
  const user = useAppSelector(selectCurrentUser);
  const commercialAccess = useAppSelector(selectCommercialAccess);
  useGetCommercialAccessQuery();
  const navigation = useMemo(
    () => getNavigationItems(user?.roles ?? [], commercialAccess),
    [user?.roles, commercialAccess]
  );
  const primaryItems = navigation.filter((item) => item.primary);
  const selectedTab = getPrimaryTabForPath(location.pathname);
  const canAccessBilling = navigation.some((item) => item.href === ROUTES.BILLING);

  useEffect(() => {
    const allowedPaths = new Set(navigation.map((item) => item.href));
    const preloaders = priorityRoutePreloaders
      .filter(({ href }) => allowedPaths.has(href))
      .map(({ load }) => load);

    return scheduleRoutePreload(preloaders);
  }, [navigation]);
  const renderPage = (
    Component: React.ComponentType,
    permission?: TabPermission,
    commercialFeature?: import('@core/commercial').CommercialFeatureCode
  ) => (
    <PrivateRoute permission={permission} commercialFeature={commercialFeature}>
      <RoutePageSuspense loadingLabel={t('common.loading')}>
        <Component />
      </RoutePageSuspense>
    </PrivateRoute>
  );

  return (
    <>
      <BackgroundDataWarmup enabled={canAccessBilling} />
      <SessionLifecycleSync />
      <IonSplitPane
        contentId="main-content"
        when="(min-width: 992px)"
        className="workspace-split-pane"
      >
        <SideMenu />
        <div id="main-content" className="workspace-main">
          <IonTabs className="workspace-tabs">
            <IonRouterOutlet>
              <Route exact path={ROUTES.PROFILE} render={() => renderPage(ProfilePage)} />
              <Route
                exact
                path={ROUTES.ACCOUNT}
                render={() => renderPage(SubscriptionAccountPage)}
              />
              <Route exact path={ROUTES.ACCOUNT_RENEWAL} render={() => renderPage(RenewalPage)} />
              <Route
                exact
                path={ROUTES.ACCOUNT_EXPORT}
                render={() => renderPage(AccountExportPage)}
              />
              <Route exact path={ROUTES.RESTRICTED} render={() => renderPage(RestrictedPage)} />
              <Route
                exact
                path={ROUTES.CHANGE_PASSWORD}
                render={() => renderPage(ChangePasswordPage)}
              />
              {protectedPageRoutes.map(({ id, path, permission, commercialFeature }) => {
                const Component = protectedPageComponents[id];
                return (
                  <Route
                    key={id}
                    exact
                    path={path}
                    render={() => renderPage(Component, permission, commercialFeature)}
                  />
                );
              })}
              {protectedMainLayoutRoutes.map(({ path, permission, commercialFeature }) => {
                const Component = mainPageComponents[path];
                return (
                  <Route
                    key={path}
                    exact
                    path={path}
                    render={() => renderPage(Component, permission, commercialFeature)}
                  />
                );
              })}
              <Route exact path={ROUTES.ABOUT} render={() => renderPage(AboutPage)} />
              <Route exact path={ROUTES.GETTING_STARTED} render={() => renderPage(GettingStartedPage)} />
            </IonRouterOutlet>

            <IonTabBar slot="bottom" className="workspace-bottom-tabs" selectedTab={selectedTab}>
              {primaryItems.map((item) => (
                <IonTabButton
                  key={item.id}
                  tab={item.id}
                  href={item.href}
                  aria-current={selectedTab === item.id ? 'page' : undefined}
                  className={selectedTab === item.id ? 'workspace-tab-context-active' : undefined}
                >
                  <IonIcon icon={item.icon} />
                  <IonLabel>{t(item.labelKey)}</IonLabel>
                </IonTabButton>
              ))}
            </IonTabBar>
          </IonTabs>
        </div>
      </IonSplitPane>
    </>
  );
};
