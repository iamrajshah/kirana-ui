type WarmupWindow = Pick<Window, 'setTimeout' | 'clearTimeout'> &
  Partial<Pick<Window, 'requestIdleCallback' | 'cancelIdleCallback'>>;

export const scheduleBackgroundDataWarmup = (
  task: () => void,
  browserWindow: WarmupWindow = window
) => {
  if (browserWindow.requestIdleCallback) {
    const idleId = browserWindow.requestIdleCallback(task, { timeout: 1500 });
    return () => browserWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = browserWindow.setTimeout(task, 500);
  return () => browserWindow.clearTimeout(timeoutId);
};
