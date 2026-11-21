import { Capacitor } from '@capacitor/core';
import { KiranaNativeAuth } from './nativeAuthPlugin';

const INSTALLATION_ID_KEY = 'kirana_installation_id';
const DEVICE_NAME_KEY = 'kirana_device_name';

export type DeviceDescriptor = {
  installationId: string;
  platform: 'WEB' | 'ANDROID' | 'IOS';
  name: string;
};

const newInstallationId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `kirana-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const installationId = () => {
  const existing = localStorage.getItem(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const created = newInstallationId();
  localStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
};

const webDeviceName = () => {
  const agent = navigator.userAgent;
  const browser = agent.includes('Edg/')
    ? 'Edge'
    : agent.includes('Chrome/')
      ? 'Chrome'
      : agent.includes('Firefox/')
        ? 'Firefox'
        : agent.includes('Safari/')
          ? 'Safari'
          : 'Browser';
  return `Web · ${browser}`;
};

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const isNativeIOS = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export const isNativeMobile = () => isNativeAndroid() || isNativeIOS();

export const getDeviceDescriptor = async (): Promise<DeviceDescriptor> => {
  if (!isNativeMobile()) {
    return { installationId: installationId(), platform: 'WEB', name: webDeviceName() };
  }

  const platform = isNativeIOS() ? 'IOS' : 'ANDROID';
  const fallbackName = isNativeIOS() ? 'iPhone / iPad' : 'Android device';
  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (!name) {
    try {
      const info = await KiranaNativeAuth.getDeviceInfo();
      name = [info.manufacturer, info.model].filter(Boolean).join(' ') || fallbackName;
    } catch {
      name = fallbackName;
    }
    localStorage.setItem(DEVICE_NAME_KEY, name);
  }
  return { installationId: installationId(), platform, name };
};
