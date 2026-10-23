// @vitest-environment jsdom

import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
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
}));
vi.mock('@hooks/useAppDispatch', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@core/auth/authSlice', () => ({
  setCredentials: (payload: unknown) => ({ type: 'auth/setCredentials', payload }),
}));
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('@components', () => ({
  Input: ({ label, value, onChange, type }: { label: string; value: string; onChange: (value: string) => void; type: string }) => (
    <label>{label}<input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>
  ),
  Button: ({ children, loading, fullWidth, size, ...props }: PropsWithChildren<{ loading?: boolean; fullWidth?: boolean; size?: string; type?: 'submit' }>) => {
    void fullWidth;
    void size;
    return <button {...props} disabled={loading}>{loading ? 'loading' : children}</button>;
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
});
