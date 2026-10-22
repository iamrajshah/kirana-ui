import { useEffect } from 'react';
import { customerApi } from '@core/api/customerApi';
import { productApi } from '@core/api/productApi';
import { useAppDispatch } from '@core/hooks';
import { scheduleBackgroundDataWarmup } from './backgroundDataWarmupScheduler';

export const BackgroundDataWarmup = () => {
  const dispatch = useAppDispatch();

  useEffect(
    () =>
      scheduleBackgroundDataWarmup(() => {
        dispatch(
          productApi.util.prefetch(
            'getBillingCatalog',
            { suppressErrorToast: true },
            { ifOlderThan: 60 }
          )
        );
        dispatch(
          customerApi.util.prefetch(
            'getCustomers',
            { skip: 0, take: 1000, suppressErrorToast: true },
            { ifOlderThan: 60 }
          )
        );
      }),
    [dispatch]
  );

  return null;
};
