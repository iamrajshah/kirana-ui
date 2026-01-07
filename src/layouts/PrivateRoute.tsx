import React from 'react';
import { Redirect } from 'react-router';
import { useAppSelector } from '@hooks/useAppSelector';
import { selectIsAuthenticated } from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Redirect to={ROUTES.LOGIN} />;
  }

  return <>{children}</>;
};
