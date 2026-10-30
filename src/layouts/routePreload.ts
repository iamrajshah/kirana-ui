import {
  getBrowserConnection,
  isConstrainedConnection,
  type NetworkConnectionInfo,
} from '@core/network/connectionPolicy';

export type RouteLoader = () => Promise<unknown>;

export interface RoutePreloadScheduler {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
}

const browserScheduler = (): RoutePreloadScheduler => ({
  requestIdleCallback: window.requestIdleCallback?.bind(window),
  cancelIdleCallback: window.cancelIdleCallback?.bind(window),
  setTimeout: window.setTimeout.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
});

export const scheduleRoutePreload = (
  loaders: RouteLoader[],
  scheduler: RoutePreloadScheduler = browserScheduler(),
  connection: NetworkConnectionInfo | undefined = getBrowserConnection()
): (() => void) => {
  if (loaders.length === 0 || isConstrainedConnection(connection)) return () => undefined;

  const warmRoutes = () => {
    void Promise.allSettled(loaders.map((loader) => loader()));
  };

  if (scheduler.requestIdleCallback && scheduler.cancelIdleCallback) {
    const idleId = scheduler.requestIdleCallback(warmRoutes, { timeout: 1800 });
    return () => scheduler.cancelIdleCallback?.(idleId);
  }

  const timeoutId = scheduler.setTimeout(warmRoutes, 900);
  return () => scheduler.clearTimeout(timeoutId);
};
