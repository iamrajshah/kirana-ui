import { registerPlugin } from '@capacitor/core';

export interface KiranaNativeAuthPlugin {
  signInWithGoogle(options: { serverClientId: string }): Promise<{ credential: string }>;
  getDeviceInfo(): Promise<{ model: string; manufacturer?: string }>;
  setSecureValue(options: { key: string; value: string }): Promise<void>;
  getSecureValue(options: { key: string }): Promise<{ value: string | null }>;
  removeSecureValue(options: { key: string }): Promise<void>;
}

export const KiranaNativeAuth = registerPlugin<KiranaNativeAuthPlugin>('KiranaNativeAuth');
