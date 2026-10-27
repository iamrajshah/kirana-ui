import React, { Suspense, lazy, useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router';
import { IonApp, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Provider } from 'react-redux';
import { store } from '@core/store';
import { ROUTES } from '@core/constants';
import { mainLayoutPaths } from '@core/navigation/protectedRoutes';
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

const MainLayout = lazy(() =>
  import('@layouts/MainLayout').then((module) => ({ default: module.MainLayout }))
);
const LoginPage = lazy(() =>
  import('@features/login/LoginPage').then((module) => ({ default: module.LoginPage }))
);
const PlatformLoginPage = lazy(() =>
  import('@features/platform/PlatformLoginPage').then((module) => ({
    default: module.PlatformLoginPage,
  }))
);
const PlatformTenantsPage = lazy(() =>
  import('@features/platform/PlatformTenantsPage').then((module) => ({
    default: module.PlatformTenantsPage,
  }))
);
const LegalPage = lazy(() =>
  import('@features/legal/LegalPage').then((module) => ({ default: module.LegalPage }))
);
const PublicHelpPage = lazy(() =>
  import('@features/legal/PublicHelpPage').then((module) => ({ default: module.PublicHelpPage }))
);
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
          <Suspense
            fallback={
              <div className="workspace-state" role="status">
                {i18n.t('common.loading')}
              </div>
            }
          >
            <IonReactRouter>
              <Switch>
                <Route exact path={ROUTES.LOGIN} component={LoginPage} />
                <Route exact path={ROUTES.PLATFORM_LOGIN} component={PlatformLoginPage} />
                <Route exact path={ROUTES.PLATFORM_TENANTS} component={PlatformTenantsPage} />
                <Route
                  exact
                  path={ROUTES.PRIVACY}
                  render={() => <LegalPage document="privacy" />}
                />
                <Route exact path={ROUTES.TERMS} render={() => <LegalPage document="terms" />} />
                <Route
                  exact
                  path={ROUTES.SUPPORT}
                  render={() => <PublicHelpPage page="support" />}
                />
                <Route
                  exact
                  path={ROUTES.ACCOUNT_DELETION}
                  render={() => <PublicHelpPage page="deletion" />}
                />
                <Route exact path="/" render={() => <Redirect to={ROUTES.LOGIN} />} />
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
