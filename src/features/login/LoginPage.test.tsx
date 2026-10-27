// @vitest-environment jsdom

import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  googleExchange: vi.fn(),
  selectMembership: vi.fn(),
  linkGoogle: vi.fn(),
  dispatch: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));
vi.mock('react-router-dom', () => ({ useHistory: () => ({ replace: mocks.replace }) }));
vi.mock('@core/api/authApi', () => ({
  useLoginMutation: () => [
    (payload: unknown) => ({ unwrap: () => mocks.login(payload) }),
    { isLoading: false },
  ],
  useGoogleExchangeMutation: () => [
    (payload: unknown) => ({ unwrap: () => mocks.googleExchange(payload) }),
    { isLoading: false },
  ],
  useSelectMembershipMutation: () => [
    (payload: unknown) => ({ unwrap: () => mocks.selectMembership(payload) }),
    { isLoading: false },
  ],
  useLinkGoogleMutation: () => [
    (payload: unknown) => ({ unwrap: () => mocks.linkGoogle(payload) }),
    { isLoading: false },
  ],
}));
vi.mock('@core/api/lifecycleApi', () => ({
  useGetPublicProductQuery: () => ({
    data: {
      legal: { privacyVersion: 'privacy-v1', termsVersion: 'terms-v1' },
      support: { email: 'support@kirana.app' },
    },
  }),
}));
vi.mock('./DemoProvisioningPanel', () => ({
  DemoProvisioningPanel: () => <div>demo-provisioning-panel</div>,
}));
vi.mock('./GoogleSignInButton', () => ({
  GoogleSignInButton: ({
    onCredential,
    onCancel,
    onError,
  }: {
    onCredential: (credential: string) => void;
    onCancel: () => void;
    onError: (message: string) => void;
  }) => (
    <div>
      <button onClick={() => onCredential('google-credential')}>google-provider-success</button>
      <button onClick={onCancel}>google-provider-cancel</button>
      <button onClick={() => onError('provider failed')}>google-provider-failure</button>
    </div>
  ),
}));
vi.mock('@hooks/useAppDispatch', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@core/auth/authSlice', () => ({
  setCredentials: (payload: unknown) => ({ type: 'auth/setCredentials', payload }),
}));
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('@components', () => ({
  Input: ({
    label,
    value,
    onChange,
    type,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type: string;
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  ),
  Button: ({
    children,
    loading,
    fullWidth,
    size,
    ...props
  }: PropsWithChildren<{
    loading?: boolean;
    fullWidth?: boolean;
    size?: string;
    type?: 'submit';
  }>) => {
    void fullWidth;
    void size;
    return (
      <button {...props} disabled={loading}>
        {loading ? 'loading' : children}
      </button>
    );
  },
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonToast: () => null,
    IonSelect: Container,
    IonSelectOption: Container,
    IonIcon: () => null,
    IonToggle: () => null,
  };
});
vi.mock('ionicons/icons', () => ({ language: 'language', contrast: 'contrast' }));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('LoginPage', () => {
  it('explains what happens when a shop owner uses a temporary password', () => {
    render(<LoginPage />);

    expect(screen.getByText('auth.temporaryPasswordHelp')).toBeTruthy();
  });

  it('navigates immediately after credentials are stored without a timer or full reload', async () => {
    const auth = { access_token: 'access', refresh_token: 'refresh', user: { id: '1' } };
    mocks.login.mockResolvedValueOnce({ success: true, data: auth });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('auth.emailOrPhone'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.loginButton' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard'));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/setCredentials', payload: auth });
  });

  it('routes a temporary-password login to password change before the dashboard', async () => {
    const auth = {
      access_token: 'access',
      refresh_token: 'refresh',
      user: { id: '1' },
      isFirstLogin: true,
    };
    mocks.login.mockResolvedValueOnce({ success: true, data: auth });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('auth.emailOrPhone'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('auth.password'), {
      target: { value: 'Welcome1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.loginButton' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/change-password'));
  });

  it('stores a normalized Google session and navigates safely after provider success', async () => {
    const auth = {
      tokens: { accessToken: 'access', refreshToken: 'refresh' },
      user: { id: '1' },
      tenant: { id: '2' },
    };
    mocks.googleExchange.mockResolvedValueOnce({
      success: true,
      data: { outcome: 'AUTHENTICATED', auth },
    });
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: 'google-provider-success' }));

    await waitFor(() =>
      expect(mocks.googleExchange).toHaveBeenCalledWith({
        credential: 'google-credential',
        source: 'web',
        consents: [
          { consentType: 'PRIVACY', documentVersion: 'privacy-v1' },
          { consentType: 'TERMS', documentVersion: 'terms-v1' },
        ],
      })
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/setCredentials', payload: auth });
    expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('keeps the user on login when Google is cancelled or fails', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'google-provider-cancel' }));
    expect(mocks.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'google-provider-failure' }));
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('shows provisioning and membership-selection outcomes without crossing tenants', async () => {
    mocks.googleExchange.mockResolvedValueOnce({
      success: true,
      data: {
        outcome: 'MEMBERSHIP_SELECTION_REQUIRED',
        memberships: [
          { userId: '7', tenantId: '11', tenantName: 'Shop A', active: true, roles: ['OWNER'] },
          { userId: '8', tenantId: '12', tenantName: 'Shop B', active: true, roles: ['OWNER'] },
        ],
      },
    });
    const auth = {
      tokens: { accessToken: 'a', refreshToken: 'r' },
      user: { id: '8' },
      tenant: { id: '12' },
    };
    mocks.selectMembership.mockResolvedValueOnce({
      success: true,
      data: { outcome: 'AUTHENTICATED', auth },
    });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'google-provider-success' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Shop B' }));

    expect(mocks.selectMembership).toHaveBeenCalledWith({
      userId: '8',
      credential: 'google-credential',
      source: 'web',
    });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('links an email collision only after the password session proves the existing account', async () => {
    mocks.googleExchange.mockResolvedValueOnce({
      success: true,
      data: { outcome: 'LINK_REQUIRED' },
    });
    const passwordAuth = {
      access_token: 'password-access',
      refresh_token: 'password-refresh',
      user: { id: '7' },
    };
    const linkedAuth = {
      tokens: { accessToken: 'linked-access', refreshToken: 'linked-refresh' },
      user: { id: '7' },
      tenant: { id: '11' },
    };
    mocks.login.mockResolvedValueOnce({ success: true, data: passwordAuth });
    mocks.linkGoogle.mockResolvedValueOnce({ success: true, data: { auth: linkedAuth } });
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'google-provider-success' }));
    await screen.findByText('auth.googleLinkRequired');
    fireEvent.change(screen.getByLabelText('auth.emailOrPhone'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.loginButton' }));

    await waitFor(() =>
      expect(mocks.linkGoogle).toHaveBeenCalledWith({
        credential: 'google-credential',
        source: 'web',
      })
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'auth/setCredentials',
      payload: passwordAuth,
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'auth/setCredentials',
      payload: linkedAuth,
    });
    expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
  });
});
