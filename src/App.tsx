import React, { Suspense, lazy, useEffect } from 'react';
import { Route, Redirect } from 'react-router';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Provider } from 'react-redux';
import { store } from '@core/store';
import { ROUTES } from '@core/constants';
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
          <IonRouterOutlet>
            <Route exact path={ROUTES.LOGIN} component={LoginPage} />
            <Route exact path="/" render={() => <Redirect to={ROUTES.LOGIN} />} />
            <Route exact path={ROUTES.PROFILE} render={() => <PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route exact path={ROUTES.CHANGE_PASSWORD} render={() => <PrivateRoute><ChangePasswordPage /></PrivateRoute>} />
            <Route exact path={ROUTES.ABOUT} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path="/customers/:id/ledger" render={() => <PrivateRoute permission="customers"><CustomerLedgerPage /></PrivateRoute>} />
            <Route exact path="/products/:id" render={() => <PrivateRoute permission="products"><ProductDetailPage /></PrivateRoute>} />
            <Route exact path={ROUTES.PRODUCT_BARCODE} render={() => <PrivateRoute permission="products"><AddProductBarcodePage /></PrivateRoute>} />
            <Route exact path="/suppliers/:id/ledger" render={() => <PrivateRoute permission="suppliers"><SupplierLedgerPage /></PrivateRoute>} />
            <Route exact path="/invoices/:id" render={() => <PrivateRoute permission="invoices"><InvoiceDetailPage /></PrivateRoute>} />
            <Route exact path="/purchases/:id" render={() => <PrivateRoute permission="purchases"><PurchaseDetailPage /></PrivateRoute>} />
            <Route exact path={ROUTES.PURCHASE_CREATE} render={() => <PrivateRoute permission="purchases"><CreatePurchasePage /></PrivateRoute>} />
            <Route exact path={ROUTES.DASHBOARD} render={() => <PrivateRoute permission="dashboard"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.BILLING} render={() => <PrivateRoute permission="billing"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.CUSTOMERS} render={() => <PrivateRoute permission="customers"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.SUPPLIERS} render={() => <PrivateRoute permission="suppliers"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.PURCHASES} render={() => <PrivateRoute permission="purchases"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.PRODUCTS} render={() => <PrivateRoute permission="products"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.INVENTORY} render={() => <PrivateRoute permission="inventory"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.INVOICES} render={() => <PrivateRoute permission="invoices"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.PAYMENTS} render={() => <PrivateRoute permission="payments"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.REPORTS} render={() => <PrivateRoute permission="reports"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.USERS} render={() => <PrivateRoute permission="users"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.CATEGORIES} render={() => <PrivateRoute permission="products"><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.IMPORT_EXPORT} render={() => <PrivateRoute permission="import-export"><MainLayout /></PrivateRoute>} />
          </IonRouterOutlet>
        </IonReactRouter>
        </Suspense>
        <ToastContainer />
      </IonApp>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
