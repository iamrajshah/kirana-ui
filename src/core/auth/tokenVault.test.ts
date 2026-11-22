import { beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ native: true, name: 'android' }));
const secureSet = vi.hoisted(() => vi.fn());
const secureGet = vi.hoisted(() => vi.fn());
const secureRemove = vi.hoisted(() => vi.fn());

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => platform.native,
    getPlatform: () => (platform.native ? platform.name : 'web'),
  },
  registerPlugin: () => ({
    setSecureValue: secureSet,
    getSecureValue: secureGet,
    removeSecureValue: secureRemove,
  }),
}));

describe.each(['android', 'ios'])('tokenVault on %s', (name) => {
  beforeEach(() => {
    localStorage.clear();
    secureSet.mockReset();
    secureGet.mockReset();
    secureRemove.mockReset();
    platform.native = true;
    platform.name = name;
    vi.resetModules();
  });

  it('never writes native access or refresh tokens to localStorage', async () => {
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

  it('clears the native session and all secure migration keys on logout', async () => {
    const { persistTokens, clearTokens, peekTokens } = await import('./tokenVault');
    await persistTokens({ accessToken: 'native-access', refreshToken: 'native-refresh' });
    secureRemove.mockClear();
    await clearTokens();
    expect(peekTokens()).toBeNull();
    expect(secureRemove).toHaveBeenCalledTimes(3);
    expect(secureRemove).toHaveBeenCalledWith({ key: 'session_bundle' });
    expect(secureRemove).toHaveBeenCalledWith({ key: 'access_token' });
    expect(secureRemove).toHaveBeenCalledWith({ key: 'refresh_token' });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('still migrates encrypted legacy entries into the atomic bundle', async () => {
    secureGet
      .mockResolvedValueOnce({ value: null })
      .mockResolvedValueOnce({ value: 'legacy-secure-access' })
      .mockResolvedValueOnce({ value: 'legacy-secure-refresh' });
    const { hydrateTokens } = await import('./tokenVault');
    await expect(hydrateTokens()).resolves.toEqual({
      accessToken: 'legacy-secure-access',
      refreshToken: 'legacy-secure-refresh',
    });
    expect(secureSet).toHaveBeenCalledWith({
      key: 'session_bundle',
      value: JSON.stringify({
        accessToken: 'legacy-secure-access',
        refreshToken: 'legacy-secure-refresh',
      }),
    });
  });

  it('does not expose tokens if secure persistence fails', async () => {
    secureSet.mockRejectedValueOnce(new Error('Secure write failed'));
    const { persistTokens, peekTokens } = await import('./tokenVault');
    await expect(
      persistTokens({ accessToken: 'uncommitted', refreshToken: 'uncommitted' })
    ).rejects.toThrow('Secure write failed');
    expect(peekTokens()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('does not repeat a durable write for the same listener notification', async () => {
    const { persistTokens } = await import('./tokenVault');
    const tokens = { accessToken: 'committed', refreshToken: 'committed' };
    await persistTokens(tokens);
    await persistTokens(tokens);
    expect(secureSet).toHaveBeenCalledTimes(1);
  });

  it('orders a pending native write before logout removes the bundle', async () => {
    let finish!: () => void;
    secureSet.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const { persistTokens, clearTokens, peekTokens } = await import('./tokenVault');
    const pending = persistTokens({ accessToken: 'pending', refreshToken: 'pending' });
    await Promise.resolve();
    const cleared = clearTokens();
    finish();
    await pending;
    await cleared;
    expect(peekTokens()).toBeNull();
    expect(secureRemove).toHaveBeenCalledWith({ key: 'session_bundle' });
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
