import { afterEach, expect, it, vi } from 'vitest';
const environment = vi.hoisted(() => ({ native: false }));
vi.mock('@core/auth/deviceIdentity', () => ({ isNativeMobile: () => environment.native }));
afterEach(() => {
  vi.resetModules();
  environment.native = false;
});
it('does not create a browser lease or block requests in native apps', async () => {
  environment.native = true;
  const { browserWorkspace, runInActiveWorkspace } = await import('./browserWorkspace');
  expect(browserWorkspace).toBeNull();
  expect(await runInActiveWorkspace(async () => 'native result')).toBe('native result');
});
it('blocks direct-fetch requests when an initialized browser cannot own the lock', async () => {
  const { browserWorkspace, runInActiveWorkspace } = await import('./browserWorkspace');
  browserWorkspace!.start();
  const request = vi.fn(async () => 'must not send');
  await expect(runInActiveWorkspace(request)).rejects.toThrow('inactive');
  expect(request).not.toHaveBeenCalled();
  browserWorkspace!.stop();
});
