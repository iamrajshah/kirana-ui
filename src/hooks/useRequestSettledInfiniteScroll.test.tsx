import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useRequestSettledInfiniteScroll } from './useRequestSettledInfiniteScroll';

interface PageData {
  data: string[];
}

const eventWith = (complete: ReturnType<typeof vi.fn>) =>
  ({ target: { complete } }) as unknown as CustomEvent;

it('keeps the indicator pending until the next page succeeds', async () => {
  const complete = vi.fn().mockResolvedValue(undefined);
  const { result, rerender } = renderHook(
    (props: {
      currentData: PageData | undefined;
      isError: boolean;
      isFetching: boolean;
      requestKey: string;
    }) => useRequestSettledInfiniteScroll(props),
    {
      initialProps: {
        currentData: { data: ['first'] },
        isError: false,
        isFetching: false,
        requestKey: ':0',
      },
    }
  );

  expect(result.current(eventWith(complete), true)).toBe(true);
  rerender({ currentData: undefined, isError: false, isFetching: true, requestKey: ':50' });
  expect(complete).not.toHaveBeenCalled();

  rerender({
    currentData: { data: ['second'] },
    isError: false,
    isFetching: false,
    requestKey: ':50',
  });
  await waitFor(() => expect(complete).toHaveBeenCalledOnce());
});

it('completes the indicator when the requested page fails', async () => {
  const complete = vi.fn().mockResolvedValue(undefined);
  const { result, rerender } = renderHook(
    (props: {
      currentData: PageData | undefined;
      isError: boolean;
      isFetching: boolean;
      requestKey: string;
    }) => useRequestSettledInfiniteScroll(props),
    {
      initialProps: {
        currentData: { data: ['first'] },
        isError: false,
        isFetching: false,
        requestKey: ':0',
      },
    }
  );

  expect(result.current(eventWith(complete), true)).toBe(true);
  rerender({ currentData: undefined, isError: false, isFetching: true, requestKey: ':50' });
  expect(complete).not.toHaveBeenCalled();

  rerender({ currentData: undefined, isError: true, isFetching: false, requestKey: ':50' });
  await waitFor(() => expect(complete).toHaveBeenCalledOnce());
});

it('settles immediately when the next page is already cached', async () => {
  const complete = vi.fn().mockResolvedValue(undefined);
  const { result, rerender } = renderHook(
    (props: {
      currentData: PageData | undefined;
      isError: boolean;
      isFetching: boolean;
      requestKey: string;
    }) => useRequestSettledInfiniteScroll(props),
    {
      initialProps: {
        currentData: { data: ['first'] },
        isError: false,
        isFetching: false,
        requestKey: ':0',
      },
    }
  );

  expect(result.current(eventWith(complete), true)).toBe(true);
  rerender({
    currentData: { data: ['cached'] },
    isError: false,
    isFetching: false,
    requestKey: ':50',
  });
  await waitFor(() => expect(complete).toHaveBeenCalledOnce());
});

it('does not start another page while loading or after the final page', async () => {
  const firstComplete = vi.fn().mockResolvedValue(undefined);
  const secondComplete = vi.fn().mockResolvedValue(undefined);
  const blockedComplete = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() =>
    useRequestSettledInfiniteScroll<PageData>({
      currentData: { data: ['first'] },
      isError: false,
      isFetching: false,
      requestKey: ':0',
    })
  );
  const firstEvent = eventWith(firstComplete);

  expect(result.current(firstEvent, true)).toBe(true);
  expect(result.current(firstEvent, true)).toBe(false);
  expect(result.current(eventWith(secondComplete), true)).toBe(false);
  expect(result.current(eventWith(blockedComplete), false)).toBe(false);

  await waitFor(() => {
    expect(secondComplete).toHaveBeenCalledOnce();
    expect(blockedComplete).toHaveBeenCalledOnce();
  });
  expect(firstComplete).not.toHaveBeenCalled();
});

it('releases a pending Ionic indicator when the page unmounts', async () => {
  const complete = vi.fn().mockResolvedValue(undefined);
  const { result, unmount } = renderHook(() =>
    useRequestSettledInfiniteScroll<PageData>({
      currentData: { data: ['first'] },
      isError: false,
      isFetching: false,
      requestKey: ':0',
    })
  );

  expect(result.current(eventWith(complete), true)).toBe(true);
  act(() => unmount());
  await waitFor(() => expect(complete).toHaveBeenCalledOnce());
});

