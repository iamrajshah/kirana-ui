import { beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ native: false, name: 'web' }));
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => platform.native,
    getPlatform: () => platform.name,
  },
  registerPlugin: () => ({ getDeviceInfo: vi.fn() }),
}));

describe('device identity', () => {
  beforeEach(() => {
    localStorage.clear();
    platform.native = false;
    platform.name = 'web';
    vi.resetModules();
  });

  it('keeps a stable per-install identifier and labels web sessions', async () => {
    const { getDeviceDescriptor } = await import('./deviceIdentity');
    const first = await getDeviceDescriptor();
    const second = await getDeviceDescriptor();

    expect(first.installationId).toBe(second.installationId);
    expect(first.platform).toBe('WEB');
    expect(first.name).toContain('Web');
  });

  it('labels a native Android installation separately', async () => {
    platform.native = true;
    platform.name = 'android';
    const { getDeviceDescriptor } = await import('./deviceIdentity');

    expect((await getDeviceDescriptor()).platform).toBe('ANDROID');
  });
});
