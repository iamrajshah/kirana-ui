// @vitest-environment jsdom
import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProvisioningRecoveryPage } from './ProvisioningRecoveryPage';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  replace: vi.fn(),
  logoutRequest: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useHistory: () => ({ replace: mocks.replace }) }));
vi.mock('@core/hooks', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { refreshToken: 'refresh-partial-demo' } }),
}));
vi.mock('@core/auth/authSlice', () => ({ logout: () => ({ type: 'auth/logout' }) }));
vi.mock('@core/api/authApi', () => ({
  useLogoutMutation: () => [
    (body: unknown) => ({ unwrap: () => mocks.logoutRequest(body) }),
    { isLoading: false },
  ],
}));
vi.mock('@ionic/react', () => {
  const Box = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Button = ({
    children,
    onClick,
    disabled,
  }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
  return { IonButton: Button, IonContent: Box, IonPage: Box, IonSpinner: Box };
});

describe('ProvisioningRecoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('ends the partial session and returns to login so Google setup can resume', async () => {
    mocks.logoutRequest.mockResolvedValueOnce({ success: true });
    render(<ProvisioningRecoveryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'provisioningRecovery.continue' }));

    await waitFor(() =>
      expect(mocks.logoutRequest).toHaveBeenCalledWith({
        scope: 'current',
        refresh_token: 'refresh-partial-demo',
      })
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });

  it('still clears local credentials when the partial server session cannot be revoked', async () => {
    mocks.logoutRequest.mockRejectedValueOnce(new Error('network unavailable'));
    render(<ProvisioningRecoveryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'provisioningRecovery.continue' }));

    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' }));
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });
});
