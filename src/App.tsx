import React, { Suspense, lazy, useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router';
import { IonApp, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Provider } from 'react-redux';
import { store } from '@core/store';
import { ROUTES } from '@core/constants';
import {
  mainLayoutPaths,
  protectedPageRoutes,
  type ProtectedPageRouteId,
} from '@core/navigation/protectedRoutes';
import { PrivateRoute } from '@layouts/PrivateRoute';
import ToastContainer from '@components/ToastContainer';
import { ThemeProvider } from './contexts/ThemeContext';
import i18n from './core/i18n';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

/* Tailwind CSS */
import './index.css';

/* i18n */
import './core/i18n';

setupIonicReact({
  mode: 'md', // Material Design mode for consistency
});

const MainLayout = lazy(() => import('@layouts/MainLayout').then((module) => ({ default: module.MainLayout })));
const LoginPage = lazy(() => import('@features/login/LoginPage').then((module) => ({ default: module.LoginPage })));
const ProfilePage = lazy(() => import('@features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const ChangePasswordPage = lazy(() => import('@features/profile/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })));
const CustomerLedgerPage = lazy(() => import('@features/customers/CustomerLedgerPage').then((module) => ({ default: module.CustomerLedgerPage })));
const ProductDetailPage = lazy(() => import('@features/products/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })));
const AddProductBarcodePage = lazy(() => import('@features/products/AddProductBarcodePage').then((module) => ({ default: module.AddProductBarcodePage })));
const InvoiceDetailPage = lazy(() => import('@features/invoices/InvoiceDetailPage'));
const SupplierLedgerPage = lazy(() => import('@features/suppliers/SupplierLedgerPage'));
const CreatePurchasePage = lazy(() => import('@features/purchases/CreatePurchasePage'));
const PurchaseDetailPage = lazy(() => import('@features/purchases/PurchaseDetailPage'));

const protectedPageComponents: Record<ProtectedPageRouteId, React.ComponentType> = {
  'customer-ledger': CustomerLedgerPage,
  'product-detail': ProductDetailPage,
  'product-barcode': AddProductBarcodePage,
  'supplier-ledger': SupplierLedgerPage,
  'invoice-detail': InvoiceDetailPage,
  'purchase-detail': PurchaseDetailPage,
  'purchase-create': CreatePurchasePage,
};

const App: React.FC = () => {
  useEffect(() => {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider>
        <IonApp>
        <Suspense fallback={<div className="workspace-state" role="status">{i18n.t('common.loading')}</div>}>
        <IonReactRouter>
          <Switch>
            <Route exact path={ROUTES.LOGIN} component={LoginPage} />
            <Route exact path="/" render={() => <Redirect to={ROUTES.LOGIN} />} />
            <Route exact path={ROUTES.PROFILE} render={() => <PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route exact path={ROUTES.CHANGE_PASSWORD} render={() => <PrivateRoute><ChangePasswordPage /></PrivateRoute>} />
            {protectedPageRoutes.map(({ id, path, permission }) => {
              const Component = protectedPageComponents[id];
              return <Route key={id} exact path={path} render={() => <PrivateRoute permission={permission}><Component /></PrivateRoute>} />;
            })}
            <Route
              exact
              path={mainLayoutPaths}
              render={() => (
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              )}
            />
          </Switch>
        </IonReactRouter>
        </Suspense>
        <ToastContainer />
      </IonApp>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
