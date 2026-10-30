import { describe, expect, it, vi } from 'vitest';
import { scheduleRoutePreload } from './routePreload';

describe('scheduleRoutePreload', () => {
  it('waits for idle time before warming the supplied lazy routes', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);
    let idleCallback: (() => void) | undefined;
    const cancelIdleCallback = vi.fn();

    const dispose = scheduleRoutePreload([loader], {
      requestIdleCallback: (callback) => {
        idleCallback = callback;
        return 11;
      },
      cancelIdleCallback,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    });

    expect(loader).not.toHaveBeenCalled();
    idleCallback?.();
    await Promise.resolve();
    expect(loader).toHaveBeenCalledOnce();

    dispose();
    expect(cancelIdleCallback).toHaveBeenCalledWith(11);
  });

  it.each([{ saveData: true }, { effectiveType: '2g' }])(
    'skips route imports on constrained connection %j',
    (connection) => {
      const loader = vi.fn().mockResolvedValue(undefined);
      const scheduler = {
        requestIdleCallback: vi.fn(),
        cancelIdleCallback: vi.fn(),
        setTimeout: vi.fn(),
        clearTimeout: vi.fn(),
      };

      const dispose = scheduleRoutePreload([loader], scheduler, connection);

      expect(scheduler.requestIdleCallback).not.toHaveBeenCalled();
      expect(scheduler.setTimeout).not.toHaveBeenCalled();
      expect(loader).not.toHaveBeenCalled();
      expect(dispose()).toBeUndefined();
    }
  );
});
