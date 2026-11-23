import { useAppSelector } from '@core/hooks';
import { deviceCanWrite } from './deviceAccess';
import type { CommercialAccessSummary, CommercialFeatureCode } from './types';
export const useDeviceWriteAccess = (feature: CommercialFeatureCode): boolean => {
  const access = useAppSelector((state) => state.auth.sessionContext?.commercialAccess) as
    | CommercialAccessSummary
    | undefined;
  return deviceCanWrite(access, feature);
};
