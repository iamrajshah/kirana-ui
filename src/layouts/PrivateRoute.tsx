import React from 'react';
import { Redirect, useLocation } from 'react-router';
import { useAppSelector } from '@hooks/useAppSelector';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectMustChangePassword,
} from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';
import { hasAccessToTab, type TabPermission } from '@core/permissions/rolePermissions';

interface PrivateRouteProps {
  children: React.ReactNode;
  permission?: TabPermission;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, permission }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const mustChangePassword = useAppSelector(selectMustChangePassword);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Redirect to={ROUTES.LOGIN} />;
  }

  if (mustChangePassword && location.pathname !== ROUTES.CHANGE_PASSWORD) {
    return <Redirect to={ROUTES.CHANGE_PASSWORD} />;
  }

  if (permission && !hasAccessToTab(user?.roles || [], permission)) {
    return <Redirect to={ROUTES.DASHBOARD} />;
  }

  return <>{children}</>;
};
