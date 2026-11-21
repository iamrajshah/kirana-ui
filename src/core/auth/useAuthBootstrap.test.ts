import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ hydrate: vi.fn(), dispatch: vi.fn() }));
vi.mock('./tokenVault', () => ({ hydrateTokens: mocks.hydrate }));
vi.mock('@core/store', () => ({ store: { dispatch: mocks.dispatch } }));
vi.mock('./authSlice', () => ({
  hydrateSessionTokens: (tokens: unknown) => ({ type: 'hydrate', payload: tokens }),
}));
import { useAuthBootstrap } from './useAuthBootstrap';

describe('secure auth bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('allows the login screen after a successful empty-vault read', async () => {
    mocks.hydrate.mockResolvedValue(null);
    const { result } = renderHook(() => useAuthBootstrap());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.failed).toBe(false);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('fails closed and handles a rejected secure-store promise', async () => {
    mocks.hydrate.mockRejectedValue(new Error('Keychain unavailable'));
    const { result } = renderHook(() => useAuthBootstrap());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.ready).toBe(false);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('retries secure storage and restores the session only after success', async () => {
    const tokens = { accessToken: 'secure-access', refreshToken: 'secure-refresh' };
    mocks.hydrate.mockRejectedValueOnce(new Error('Locked')).mockResolvedValueOnce(tokens);
    const { result } = renderHook(() => useAuthBootstrap());
    await waitFor(() => expect(result.current.failed).toBe(true));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.failed).toBe(false);
    expect(mocks.dispatch).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'hydrate', payload: tokens });
  });
  it('does not restore a late session after unmount', async () => {
    let finish!: (value: { accessToken: string; refreshToken: string }) => void;
    mocks.hydrate.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const { unmount } = renderHook(() => useAuthBootstrap());
    unmount();
    await act(async () => {
      finish({ accessToken: 'late', refreshToken: 'late' });
    });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
