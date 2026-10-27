import React from 'react';
import { Redirect, useLocation } from 'react-router';
import { useAppSelector } from '@hooks/useAppSelector';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectMustChangePassword,
  selectCommercialAccess,
} from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';
import { hasAccessToTab, type TabPermission } from '@core/permissions/rolePermissions';
import { canUseCommercialFeature, type CommercialFeatureCode } from '@core/commercial';

interface PrivateRouteProps {
  children: React.ReactNode;
  permission?: TabPermission;
  commercialFeature?: CommercialFeatureCode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  permission,
  commercialFeature,
}) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const mustChangePassword = useAppSelector(selectMustChangePassword);
  const commercialAccess = useAppSelector(selectCommercialAccess);
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
  if (
    commercialFeature &&
    !canUseCommercialFeature(user?.roles || [], commercialAccess, commercialFeature)
  ) {
    return <Redirect to={ROUTES.DASHBOARD} />;
  }

  return <>{children}</>;
};
