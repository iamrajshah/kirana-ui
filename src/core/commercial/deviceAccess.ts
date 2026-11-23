import { Capacitor } from '@capacitor/core';
import type { CommercialAccessSummary, CommercialFeatureCode } from './types';
export type DeviceProfile = 'MOBILE' | 'TABLET' | 'WEB';
export const detectDeviceProfile = (
  agent: string,
  nativePlatform?: string,
  touchPoints = 0
): DeviceProfile => {
  if (
    /iPad|Tablet|PlayBook|Silk/i.test(agent) ||
    (/Android/i.test(agent) && !/Mobile/i.test(agent)) ||
    (/Macintosh/i.test(agent) && (touchPoints > 1 || nativePlatform === 'ios'))
  )
    return 'TABLET';
  if (/iPhone|iPod|Android|Mobile/i.test(agent)) return 'MOBILE';
  return nativePlatform === 'ios' || nativePlatform === 'android' ? 'MOBILE' : 'WEB';
};
export const currentDeviceProfile = (): DeviceProfile =>
  detectDeviceProfile(
    navigator.userAgent,
    Capacitor.isNativePlatform() ? Capacitor.getPlatform() : undefined,
    navigator.maxTouchPoints
  );
export const deviceFeatureMode = (
  access: CommercialAccessSummary | null | undefined,
  feature: CommercialFeatureCode,
  profile = access?.deviceProfile ?? currentDeviceProfile()
): 'HIDDEN' | 'READ_ONLY' | 'FULL' => {
  if (!access?.deviceAccess) return 'FULL';
  const matrix = access.deviceAccess.profiles[profile];
  const mode = matrix?.[feature] ?? 'HIDDEN';
  const core = matrix?.CORE_POS ?? 'FULL';
  if (core === 'HIDDEN' || mode === 'HIDDEN') return 'HIDDEN';
  return core === 'READ_ONLY' ? 'READ_ONLY' : mode;
};
export const deviceCanWrite = (
  access: CommercialAccessSummary | null | undefined,
  feature: CommercialFeatureCode
): boolean => deviceFeatureMode(access, feature) === 'FULL';
