import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  state: 'waiting',
  listeners: new Set<() => void>(),
  dispatch: vi.fn(),
  user: null as null | { id: string; tenant: { id: string } },
  start: vi.fn(),
  stop: vi.fn(),
  takeOver: vi.fn(),
}));
vi.mock('react-i18next', async (actual) => ({
  ...(await actual<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('./browserWorkspace', () => ({
  browserWorkspace: {
    start: fixture.start,
    stop: fixture.stop,
    takeOver: fixture.takeOver,
    snapshot: () => fixture.state,
    subscribe: (listener: () => void) => {
      fixture.listeners.add(listener);
      return () => fixture.listeners.delete(listener);
    },
  },
}));
vi.mock('@core/store', () => ({
  store: { getState: () => ({ auth: { user: fixture.user } }), dispatch: fixture.dispatch },
}));
vi.mock('@core/api/apiSlice', () => ({
  apiSlice: { util: { invalidateTags: () => ({ type: 'invalidate' }) } },
}));
vi.mock('@core/auth/authSlice', () => ({
  setCredentials: (payload: unknown) => ({ type: 'credentials', payload }),
  logout: () => ({ type: 'logout' }),
}));
import { WorkspaceGate } from './WorkspaceGate';
import { STORAGE_KEYS } from '@core/constants';
const transition = (state: string) =>
  act(() => {
    fixture.state = state;
    fixture.listeners.forEach((listener) => listener());
  });
beforeEach(() => {
  localStorage.clear();
  fixture.state = 'waiting';
  fixture.user = null;
  fixture.dispatch.mockClear();
  fixture.start.mockClear();
  fixture.stop.mockClear();
});
afterEach(cleanup);
it('does not mount the POS until it owns the browser lock', () => {
  render(
    <WorkspaceGate>
      <p>POS content</p>
    </WorkspaceGate>
  );
  expect(screen.queryByText('POS content')).toBeNull();
  fireEvent.click(screen.getByText('workspaceLease.takeOver'));
  expect(fixture.takeOver).toHaveBeenCalled();
  transition('active');
  expect(screen.getByText('POS content')).toBeTruthy();
});
it('preserves unsaved input when yielding and reclaiming the same session', () => {
  render(
    <WorkspaceGate>
      <input aria-label="Draft bill" defaultValue="" />
    </WorkspaceGate>
  );
  transition('active');
  fireEvent.change(screen.getByLabelText('Draft bill'), { target: { value: 'Unfinished bill' } });
  transition('handing-over');
  expect(screen.getByLabelText('Draft bill').closest('[hidden]')).not.toBeNull();
  transition('waiting');
  transition('active');
  expect((screen.getByLabelText('Draft bill') as HTMLInputElement).value).toBe('Unfinished bill');
  expect(screen.getByLabelText('Draft bill').closest('[hidden]')).toBeNull();
});
it('does not reopen a preserved draft under another shop or user', () => {
  render(
    <WorkspaceGate>
      <p>Private draft</p>
    </WorkspaceGate>
  );
  transition('active');
  transition('waiting');
  localStorage.setItem(
    STORAGE_KEYS.USER,
    JSON.stringify({ id: 'different', tenant: { id: 'another' } })
  );
  transition('active');
  expect(screen.getByText('workspaceLease.sessionChanged')).toBeTruthy();
  expect(screen.getByText('Private draft').closest('[hidden]')).not.toBeNull();
});
it('offers no unsafe bypass when browser coordination is unavailable', () => {
  render(
    <WorkspaceGate>
      <p>POS content</p>
    </WorkspaceGate>
  );
  transition('unsupported');
  expect(screen.queryByText('POS content')).toBeNull();
  expect(screen.getByText('workspaceLease.unsupported')).toBeTruthy();
  expect(screen.queryByText('workspaceLease.takeOver')).toBeNull();
});

it('hydrates the shared session only once when first acquiring its lock', () => {
  const user = { id: 'owner', tenant: { id: 'shop' } };
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'test-access');
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'test-refresh');
  render(
    <WorkspaceGate>
      <p>POS content</p>
    </WorkspaceGate>
  );
  transition('active');
  expect(
    fixture.dispatch.mock.calls.filter(([action]) => action.type === 'credentials')
  ).toHaveLength(1);
});

it('releases ownership on pagehide and rejoins after a cached-page restore', () => {
  render(
    <WorkspaceGate>
      <p>POS content</p>
    </WorkspaceGate>
  );
  act(() => window.dispatchEvent(new Event('pagehide')));
  expect(fixture.stop).toHaveBeenCalledOnce();
  act(() => window.dispatchEvent(new Event('pageshow')));
  expect(fixture.start).toHaveBeenCalledTimes(2);
});
