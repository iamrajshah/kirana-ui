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
            <Route exact path="/profile" render={() => <PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route exact path="/change-password" render={() => <PrivateRoute><ChangePasswordPage /></PrivateRoute>} />
            <Route path="/dashboard" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route path="/billing" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route path="/customers" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route path="/products" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route path="/inventory" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route path="/payments" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route path="/reports" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route path="/users" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
            <Route path="/import-export" render={() => <PrivateRoute><MainLayout /></PrivateRoute>} />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    </Provider>
  );
};

export default App;
