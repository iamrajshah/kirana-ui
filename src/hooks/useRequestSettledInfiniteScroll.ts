import { useCallback, useEffect, useRef } from 'react';

type InfiniteScrollTarget = Pick<HTMLIonInfiniteScrollElement, 'complete'>;

interface PendingScroll {
  requestKey: string;
  target: InfiniteScrollTarget;
}

interface RequestSettledInfiniteScrollOptions<T> {
  currentData: T | undefined;
  isError: boolean;
  isFetching: boolean;
  requestKey: string;
}

const completeSafely = (target: InfiniteScrollTarget) => {
  try {
    void Promise.resolve(target.complete()).catch(() => undefined);
  } catch {
    // Ionic owns this UI-only completion signal. A detached element must not
    // turn successful data loading into an application error.
  }
};

/**
 * Keeps Ionic's infinite-scroll indicator active until the requested query
 * argument has actually settled. The caller still owns advancing the page.
 */
export const useRequestSettledInfiniteScroll = <T>({
  currentData,
  isError,
  isFetching,
  requestKey,
}: RequestSettledInfiniteScrollOptions<T>) => {
  const pendingRef = useRef<PendingScroll | null>(null);

  const begin = useCallback(
    (event: CustomEvent, canLoad: boolean) => {
      const target = event.target as unknown as InfiniteScrollTarget | null;
      if (!target || typeof target.complete !== 'function') return false;

      if (pendingRef.current) {
        if (pendingRef.current.target !== target) completeSafely(target);
        return false;
      }

      if (!canLoad) {
        completeSafely(target);
        return false;
      }

      pendingRef.current = { requestKey, target };
      return true;
    },
    [requestKey]
  );

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || pending.requestKey === requestKey || isFetching) return;
    if (!isError && currentData === undefined) return;

    pendingRef.current = null;
    completeSafely(pending.target);
  }, [currentData, isError, isFetching, requestKey]);

  useEffect(
    () => () => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) completeSafely(pending.target);
    },
    []
  );

  return begin;
};

