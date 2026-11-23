import { matchPath, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@hooks/useAppSelector';
import { selectCommercialAccess } from '@core/auth/authSlice';
import { protectedPageRoutes, protectedMainLayoutRoutes } from '@core/navigation/protectedRoutes';
import { deviceFeatureMode } from './deviceAccess';
export const DeviceAccessNotice = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const access = useAppSelector(selectCommercialAccess);
  const route = [...protectedPageRoutes, ...protectedMainLayoutRoutes].find((item) =>
    matchPath(pathname, { path: item.path, exact: true })
  );
  if (
    !route?.commercialFeature ||
    deviceFeatureMode(access, route.commercialFeature) !== 'READ_ONLY'
  )
    return null;
  return (
    <div role="status" className="device-access-notice">
      {t('commercial.deviceViewOnly')}
    </div>
  );
};
