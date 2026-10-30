import { useEffect } from 'react';
import { productApi } from '@core/api/productApi';
import { useAppDispatch } from '@core/hooks';
import { scheduleBackgroundDataWarmup } from './backgroundDataWarmupScheduler';

export const BackgroundDataWarmup = ({ enabled = true }: { enabled?: boolean }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return undefined;
    return scheduleBackgroundDataWarmup(() => {
      dispatch(
        productApi.util.prefetch(
          'getBillingCatalog',
          { suppressErrorToast: true },
          { ifOlderThan: 60 }
        )
      );
    });
  }, [dispatch, enabled]);

  return null;
};
