import React from 'react';
import { Redirect } from 'react-router';
import { selectIsAuthenticated, selectMustChangePassword } from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';
import { useAppSelector } from '@core/hooks';

/**
 * Sends a restored native/web session to its real landing page.
 *
 * Capacitor recreates the WebView at `/` after process or activity restarts.
 * An unconditional login redirect would therefore hide a successfully hydrated
 * secure session until the user signed in again.
 */
export const RootRouteRedirect: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const mustChangePassword = useAppSelector(selectMustChangePassword);

  if (!isAuthenticated) return <Redirect to={ROUTES.LOGIN} />;
  return <Redirect to={mustChangePassword ? ROUTES.CHANGE_PASSWORD : ROUTES.DASHBOARD} />;
};
