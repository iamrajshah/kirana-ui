import type { DeviceLimitDetails } from '@core/api/authApi';

export const readDeviceLimit = (error: unknown): DeviceLimitDetails | null => {
  if (!error || typeof error !== 'object') return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const payload = data as { code?: unknown; details?: unknown };
  if (payload.code !== 'DEVICE_LIMIT_REACHED' || !payload.details || typeof payload.details !== 'object')
    return null;
  const details = payload.details as DeviceLimitDetails;
  if (!Number.isInteger(details.limit) || !Array.isArray(details.devices)) return null;
  return details;
};
