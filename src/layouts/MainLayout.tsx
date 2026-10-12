import React from 'react';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import { Route, Redirect } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '../core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { getNavigationItems } from '@core/navigation/navigation';
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
import { AboutPage } from '@features/about/AboutPage';
import '@components/Workspace/workspace.css';

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
