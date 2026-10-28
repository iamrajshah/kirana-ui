// @vitest-environment jsdom
import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceSecurityCard } from './DeviceSecurityCard';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  replace: vi.fn(),
  logout: vi.fn(),
  revoke: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useHistory: () => ({ replace: mocks.replace }) }));
vi.mock('@core/hooks', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: { id: 'owner-1', roles: ['OWNER'] },
        refreshToken: 'refresh-1',
      },
    }),
}));
vi.mock('@core/api/userApi', () => ({
  useGetUsersQuery: () => ({
    data: {
      data: [
        {
          id: 'owner-1',
          name: 'Owner',
          phone: '1',
          roles: ['OWNER'],
          is_active: true,
        },
      ],
    },
  }),
}));
vi.mock('@core/api/authApi', () => ({
  useGetDevicesQuery: () => ({
    data: {
      data: [
        {
          id: 'device-1',
          name: 'Front counter',
          platform: 'WEB',
          lastSeenAt: '2026-10-28T00:00:00.000Z',
          current: true,
        },
      ],
    },
    isLoading: false,
    refetch: mocks.refetch,
  }),
  useLogoutMutation: () => [
    (body: unknown) => ({ unwrap: () => mocks.logout(body) }),
    { isLoading: false },
  ],
  useRevokeDeviceMutation: () => [
    (id: string) => ({ unwrap: () => mocks.revoke(id) }),
    { isLoading: false },
  ],
}));
vi.mock('@core/auth/authSlice', () => ({
  selectCurrentUser: (state: { auth: { user: unknown } }) => state.auth.user,
  logout: () => ({ type: 'auth/logout' }),
}));
vi.mock('@ionic/react', () => {
  const Box = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Button = ({
    children,
    onClick,
  }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>;
  return {
    IonButton: Button,
    IonCard: Box,
    IonCardContent: Box,
    IonCardHeader: Box,
    IonCardTitle: Box,
    IonItem: Box,
    IonLabel: Box,
    IonSelect: Box,
    IonSelectOption: Box,
    IonSpinner: Box,
  };
});

describe('DeviceSecurityCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('logs out only the current refresh session when requested', async () => {
    mocks.logout.mockResolvedValueOnce({ success: true });
    render(<DeviceSecurityCard />);
    fireEvent.click(screen.getByRole('button', { name: 'security.logoutCurrent' }));

    await waitFor(() =>
      expect(mocks.logout).toHaveBeenCalledWith({
        scope: 'current',
        refresh_token: 'refresh-1',
      })
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });

  it('can revoke the current named device and ends the local session', async () => {
    mocks.revoke.mockResolvedValueOnce({ success: true });
    render(<DeviceSecurityCard />);
    fireEvent.click(screen.getByRole('button', { name: 'security.revokeDevice' }));

    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledWith('device-1'));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
  });
});
