import React, { type PropsWithChildren } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordPage } from './ChangePasswordPage';

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  unwrap: vi.fn(),
  dispatch: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@core/api/userApi', () => ({
  useChangePasswordMutation: () => [mocks.changePassword],
}));
vi.mock('@hooks/useAppDispatch', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@core/auth/authSlice', () => ({ logout: () => ({ type: 'auth/logout' }) }));
vi.mock('react-router', () => ({
  useHistory: () => ({ replace: mocks.replace, push: vi.fn() }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/services/notificationService', () => ({ apiErrorMessage: () => 'error' }));
vi.mock('@components/Input', () => ({
  Input: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <label>
      {label}
      <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  ),
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled }: PropsWithChildren & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  );
  return {
    IonPage: Container, IonContent: Container, IonCard: Container,
    IonCardHeader: Container, IonCardTitle: Container, IonCardContent: Container,
    IonHeader: Container, IonToolbar: Container, IonTitle: Container,
    IonButtons: Container, IonList: Container, IonItem: Container,
    IonLabel: Container, IonIcon: Container, IonToast: Container,
    IonButton: Button, IonBackButton: Container,
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.unwrap.mockResolvedValue({ success: true });
  mocks.changePassword.mockReturnValue({ unwrap: mocks.unwrap });
});

describe('ChangePasswordPage', () => {
  it('clears the invalidated local session and returns to login after success', async () => {
    vi.useFakeTimers();
    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText('profile.currentPasswordLabel'), {
      target: { value: 'Oldpass1' },
    });
    fireEvent.change(screen.getByLabelText('profile.newPasswordLabel'), {
      target: { value: 'Newpass2' },
    });
    fireEvent.change(screen.getByLabelText('profile.confirmPasswordLabel'), {
      target: { value: 'Newpass2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'profile.changePassword' }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.changePassword).toHaveBeenCalledWith({
      currentPassword: 'Oldpass1', newPassword: 'Newpass2',
    });
    await act(async () => vi.advanceTimersByTime(1500));

    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });
});
