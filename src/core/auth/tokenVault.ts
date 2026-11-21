import { STORAGE_KEYS } from '@core/constants';
import { isNativeMobile } from './deviceIdentity';
import { KiranaNativeAuth } from './nativeAuthPlugin';

export type StoredTokens = { accessToken: string; refreshToken: string };
let nativeTokens: StoredTokens | null = null;
let committedBundle: StoredTokens | null = null;

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const BUNDLE_KEY = 'session_bundle';
let nativeWrites: Promise<void> = Promise.resolve();
const serializeNativeWrite = (operation: () => Promise<void>): Promise<void> => {
  const pending = nativeWrites.then(operation);
  nativeWrites = pending.catch(() => undefined);
  return pending;
};

const clearPlaintextTokens = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const peekTokens = (): StoredTokens | null => {
  if (isNativeMobile()) return nativeTokens;
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
};

export const persistTokens = async (tokens: StoredTokens): Promise<void> => {
  if (!isNativeMobile()) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    return;
  }

  return serializeNativeWrite(async () => {
    clearPlaintextTokens();
    if (
      committedBundle?.accessToken === tokens.accessToken &&
      committedBundle.refreshToken === tokens.refreshToken
    )
      return;
    await KiranaNativeAuth.setSecureValue({ key: BUNDLE_KEY, value: JSON.stringify(tokens) });
    nativeTokens = tokens;
    committedBundle = tokens;
    await Promise.all([
      KiranaNativeAuth.removeSecureValue({ key: ACCESS_KEY }),
      KiranaNativeAuth.removeSecureValue({ key: REFRESH_KEY }),
    ]);
  });
};

export const hydrateTokens = async (): Promise<StoredTokens | null> => {
  if (!isNativeMobile()) return peekTokens();
  clearPlaintextTokens();
  committedBundle = null;
  const bundle = await KiranaNativeAuth.getSecureValue({ key: BUNDLE_KEY });
  if (bundle.value) {
    try {
      const parsed = JSON.parse(bundle.value) as Partial<StoredTokens>;
      if (parsed.accessToken && parsed.refreshToken) {
        nativeTokens = { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
        committedBundle = nativeTokens;
        return nativeTokens;
      }
    } catch {
      await KiranaNativeAuth.removeSecureValue({ key: BUNDLE_KEY });
    }
  }

  // One-time migration from the earlier two-entry secure-storage format.
  const [access, refresh] = await Promise.all([
    KiranaNativeAuth.getSecureValue({ key: ACCESS_KEY }),
    KiranaNativeAuth.getSecureValue({ key: REFRESH_KEY }),
  ]);
  nativeTokens =
    access.value && refresh.value
      ? { accessToken: access.value, refreshToken: refresh.value }
      : null;
  if (nativeTokens) await persistTokens(nativeTokens);
  return nativeTokens;
};

export const clearTokens = async (): Promise<void> => {
  nativeTokens = null;
  committedBundle = null;
  clearPlaintextTokens();
  if (isNativeMobile()) {
    await serializeNativeWrite(async () => {
      nativeTokens = null;
      committedBundle = null;
      await Promise.all([
        KiranaNativeAuth.removeSecureValue({ key: BUNDLE_KEY }),
        KiranaNativeAuth.removeSecureValue({ key: ACCESS_KEY }),
        KiranaNativeAuth.removeSecureValue({ key: REFRESH_KEY }),
      ]);
    });
  }
};
