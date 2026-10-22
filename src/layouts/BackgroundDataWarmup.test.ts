import { describe, expect, it, vi } from 'vitest';
import { scheduleBackgroundDataWarmup } from './backgroundDataWarmupScheduler';

describe('scheduleBackgroundDataWarmup', () => {
  it('waits for browser idle time before starting non-blocking catalog work', () => {
    const task = vi.fn();
    let idleTask: (() => void) | undefined;
    const cancelIdleCallback = vi.fn();
    const browserWindow = {
      requestIdleCallback: vi.fn((callback: () => void) => {
        idleTask = callback;
        return 42;
      }),
      cancelIdleCallback,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    } as unknown as Window;

    const cancel = scheduleBackgroundDataWarmup(task, browserWindow);

    expect(task).not.toHaveBeenCalled();
    idleTask?.();
    expect(task).toHaveBeenCalledTimes(1);
    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(42);
  });
});
