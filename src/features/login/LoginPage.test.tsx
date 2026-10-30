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
  productInformation: {
    legal: { privacyVersion: 'privacy-v1', termsVersion: 'terms-v1' },
    support: { email: 'support@kirana.app' },
  } as
    | {
        legal: { privacyVersion: string; termsVersion: string };
        support: { email: string };
      }
    | undefined,
  productInformationLoading: false,
  productInformationFetching: false,
  refetchProductInformation: vi.fn(),
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
    data: mocks.productInformation,
    isLoading: mocks.productInformationLoading,
    isFetching: mocks.productInformationFetching,
    refetch: mocks.refetchProductInformation,
  }),
}));
vi.mock('@core/auth/deviceIdentity', () => ({
  getDeviceDescriptor: () =>
    Promise.resolve({ installationId: 'install-1', platform: 'WEB', name: 'Web · Test' }),
}));
vi.mock('./DeviceLimitDialog', () => ({
  DeviceLimitDialog: ({
    details,
    onReplace,
  }: {
    details: { devices: Array<{ id: string; name: string; platform: 'WEB'; lastSeenAt: string }> } | null;
    onReplace: (device: { id: string; name: string; platform: 'WEB'; lastSeenAt: string }) => void;
  }) =>
    details ? (
      <button onClick={() => onReplace(details.devices[0])}>replace-old-device</button>
    ) : null,
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
      <button type="button" onClick={() => onCredential('google-credential')}>
        google-provider-success
      </button>
      <button type="button" onClick={onCancel}>google-provider-cancel</button>
      <button type="button" onClick={() => onError('provider failed')}>
        google-provider-failure
      </button>
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
    IonToast: ({ isOpen, message }: { isOpen: boolean; message: string }) =>
      isOpen ? <div role="alert">{message}</div> : null,
    IonSelect: Container,
    IonSelectOption: Container,
    IonIcon: () => null,
    IonToggle: () => null,
  };
});
vi.mock('ionicons/icons', () => ({ language: 'language', contrast: 'contrast' }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.productInformation = {
    legal: { privacyVersion: 'privacy-v1', termsVersion: 'terms-v1' },
    support: { email: 'support@kirana.app' },
  };
  mocks.productInformationLoading = false;
  mocks.productInformationFetching = false;
});
afterEach(cleanup);

describe('LoginPage', () => {
  it('does not show a Google cancellation message before the user interacts', () => {
    render(<LoginPage />);

    expect(screen.queryByText('auth.googleCancelled')).toBeNull();
  });

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

  it('lets a user replace an existing device when the plan limit is reached', async () => {
    const oldDevice = {
      id: 'device-old',
      name: 'Old counter',
      platform: 'WEB' as const,
      lastSeenAt: '2026-10-01T00:00:00.000Z',
    };
    const auth = { access_token: 'access', refresh_token: 'refresh', user: { id: '1' } };
    mocks.login
      .mockRejectedValueOnce({
        data: { code: 'DEVICE_LIMIT_REACHED', details: { limit: 2, devices: [oldDevice] } },
      })
      .mockResolvedValueOnce({ success: true, data: auth });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('auth.emailOrPhone'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.loginButton' }));
    fireEvent.click(await screen.findByRole('button', { name: 'replace-old-device' }));

    await waitFor(() =>
      expect(mocks.login).toHaveBeenLastCalledWith({
        email: 'owner@example.com',
        password: 'secret',
        device: { installationId: 'install-1', platform: 'WEB', name: 'Web · Test' },
        replaceDeviceId: 'device-old',
      })
    );
    expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
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
        device: { installationId: 'install-1', platform: 'WEB', name: 'Web · Test' },
        replaceDeviceId: undefined,
        consents: [
          { consentType: 'PRIVACY', documentVersion: 'privacy-v1' },
          { consentType: 'TERMS', documentVersion: 'terms-v1' },
        ],
      })
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/setCredentials', payload: auth });
    expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('requires Terms and Privacy acceptance before exchanging a Google credential', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'google-provider-success' }));

    expect((await screen.findByRole('alert')).textContent).toContain('auth.acceptLegalRequired');
    expect(mocks.googleExchange).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('does not expose Google exchange until legal document versions finish loading', () => {
    mocks.productInformation = undefined;
    mocks.productInformationLoading = true;

    render(<LoginPage />);

    expect(screen.getByRole('status').textContent).toContain('auth.googleLegalLoading');
    expect(screen.getByRole('checkbox').hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'google-provider-success' })).toBeNull();
    expect(mocks.googleExchange).not.toHaveBeenCalled();
  });

  it('shows a retry action when legal document versions are unavailable', () => {
    mocks.productInformation = undefined;

    render(<LoginPage />);

    expect(screen.getByRole('alert').textContent).toContain('auth.googleLegalUnavailable');
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(mocks.refetchProductInformation).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'google-provider-success' })).toBeNull();
  });

  it('surfaces a disabled unknown-entry response without creating or linking an account', async () => {
    mocks.googleExchange.mockRejectedValueOnce({
      status: 503,
      data: { message: 'Google self-service entry is disabled.' },
    });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: 'google-provider-success' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Google self-service entry is disabled.'
    );
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('retries Google exchange with the selected replacement device at the plan limit', async () => {
    const oldDevice = {
      id: 'google-device-old',
      name: 'Old Google counter',
      platform: 'WEB' as const,
      lastSeenAt: '2026-10-01T00:00:00.000Z',
    };
    const auth = { access_token: 'access', refresh_token: 'refresh', user: { id: '1' } };
    mocks.googleExchange
      .mockRejectedValueOnce({
        data: { code: 'DEVICE_LIMIT_REACHED', details: { limit: 2, devices: [oldDevice] } },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { outcome: 'AUTHENTICATED', auth },
      });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'google-provider-success' }));
    fireEvent.click(await screen.findByRole('button', { name: 'replace-old-device' }));

    await waitFor(() =>
      expect(mocks.googleExchange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          credential: 'google-credential',
          source: 'web',
          replaceDeviceId: 'google-device-old',
        })
      )
    );
    expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('shows private provisioning without creating it automatically', async () => {
    mocks.googleExchange.mockResolvedValueOnce({
      success: true,
      data: { outcome: 'PROVISIONING_REQUIRED', provisioningToken: 'provision-later' },
    });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: 'google-provider-success' }));

    expect(await screen.findByText('auth.privateDemoProvisioning')).toBeTruthy();
    expect(screen.getByText('demo-provisioning-panel')).toBeTruthy();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
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
          {
            userId: '9',
            tenantId: '13',
            tenantName: 'Suspended Shop',
            active: false,
            roles: ['OWNER'],
          },
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

    expect(screen.queryByRole('button', { name: 'Suspended Shop' })).toBeNull();

    await waitFor(() =>
      expect(mocks.selectMembership).toHaveBeenCalledWith({
        userId: '8',
        credential: 'google-credential',
        source: 'web',
        device: { installationId: 'install-1', platform: 'WEB', name: 'Web · Test' },
        replaceDeviceId: undefined,
      })
    );
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
        device: { installationId: 'install-1', platform: 'WEB', name: 'Web · Test' },
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
