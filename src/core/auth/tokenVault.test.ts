import { beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ native: true }));
const secureSet = vi.hoisted(() => vi.fn());
const secureGet = vi.hoisted(() => vi.fn());
const secureRemove = vi.hoisted(() => vi.fn());

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => platform.native,
    getPlatform: () => (platform.native ? 'android' : 'web'),
  },
  registerPlugin: () => ({
    setSecureValue: secureSet,
    getSecureValue: secureGet,
    removeSecureValue: secureRemove,
  }),
}));

describe('tokenVault', () => {
  beforeEach(() => {
    localStorage.clear();
    secureSet.mockReset();
    secureGet.mockReset();
    secureRemove.mockReset();
    platform.native = true;
    vi.resetModules();
  });

  it('never writes Android access or refresh tokens to localStorage', async () => {
    const { persistTokens } = await import('./tokenVault');
    await persistTokens({ accessToken: 'native-access', refreshToken: 'native-refresh' });

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(secureSet).toHaveBeenCalledOnce();
    expect(secureSet).toHaveBeenCalledWith({
      key: 'session_bundle',
      value: JSON.stringify({ accessToken: 'native-access', refreshToken: 'native-refresh' }),
    });
  });

  it('hydrates native tokens from secure storage and removes plaintext migration leftovers', async () => {
    localStorage.setItem('access_token', 'legacy-access');
    localStorage.setItem('refresh_token', 'legacy-refresh');
    secureGet.mockResolvedValueOnce({
      value: JSON.stringify({ accessToken: 'secure-access', refreshToken: 'secure-refresh' }),
    });
    const { hydrateTokens } = await import('./tokenVault');

    await expect(hydrateTokens()).resolves.toEqual({
      accessToken: 'secure-access',
      refreshToken: 'secure-refresh',
    });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('retains browser token persistence for web sessions', async () => {
    platform.native = false;
    const { persistTokens } = await import('./tokenVault');
    await persistTokens({ accessToken: 'web-access', refreshToken: 'web-refresh' });

    expect(localStorage.getItem('access_token')).toBe('web-access');
    expect(localStorage.getItem('refresh_token')).toBe('web-refresh');
    expect(secureSet).not.toHaveBeenCalled();
  });
});
