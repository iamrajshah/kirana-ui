import React from 'react';
import { Route, Redirect } from 'react-router';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Provider } from 'react-redux';
import { store } from '@core/store';
import { ROUTES } from '@core/constants';
import { PrivateRoute } from '@layouts/PrivateRoute';
import { MainLayout } from '@layouts/MainLayout';
import { LoginPage } from '@features/login/LoginPage';
import { ProfilePage } from '@features/profile/ProfilePage';
import { ChangePasswordPage } from '@features/profile/ChangePasswordPage';
import { CustomerLedgerPage } from '@features/customers/CustomerLedgerPage';
import { ProductDetailPage } from '@features/products/ProductDetailPage';
import InvoiceDetailPage from '@features/invoices/InvoiceDetailPage';
import SuppliersPage from '@features/suppliers/SuppliersPage';
import SupplierLedgerPage from '@features/suppliers/SupplierLedgerPage';
import PurchasesPage from '@features/purchases/PurchasesPage';
import CreatePurchasePage from '@features/purchases/CreatePurchasePage';
import PurchaseDetailPage from '@features/purchases/PurchaseDetailPage';
import ToastContainer from '@components/ToastContainer';

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

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path={ROUTES.LOGIN} component={LoginPage} />
            <Route exact path="/" render={() => <Redirect to={ROUTES.LOGIN} />} />
            <Route exact path={ROUTES.PROFILE} render={() => <PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route exact path={ROUTES.CHANGE_PASSWORD} render={() => <PrivateRoute><ChangePasswordPage /></PrivateRoute>} />
            <Route exact path="/customers/:id/ledger" render={() => <PrivateRoute><CustomerLedgerPage /></PrivateRoute>} />
            <Route exact path="/products/:id" render={() => <PrivateRoute><ProductDetailPage /></PrivateRoute>} />
            <Route exact path="/suppliers/:id/ledger" render={() => <PrivateRoute><SupplierLedgerPage /></PrivateRoute>} />
            <Route exact path="/invoices/:id" render={() => <PrivateRoute><InvoiceDetailPage /></PrivateRoute>} />
            <Route exact path="/purchases/:id" render={() => <PrivateRoute><PurchaseDetailPage /></PrivateRoute>} />
            <Route exact path={ROUTES.PURCHASE_CREATE} render={() => <PrivateRoute><CreatePurchasePage /></PrivateRoute>} />
            <Route exact path={ROUTES.DASHBOARD} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.BILLING} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.CUSTOMERS} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.SUPPLIERS} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.PURCHASES} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.PRODUCTS} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.INVENTORY} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.INVOICES} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.PAYMENTS} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.REPORTS} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.USERS} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route exact path={ROUTES.IMPORT_EXPORT} render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
          </IonRouterOutlet>
        </IonReactRouter>
        <ToastContainer />
      </IonApp>
    </Provider>
  );
};

export default App;
