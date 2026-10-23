import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

vi.mock('ionicons/icons', () => ({
  eye: 'eye',
  eyeOff: 'eye-off',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'common.showPassword': 'Show password',
      'common.hidePassword': 'Hide password',
    })[key] ?? key,
  }),
}));

vi.mock('@ionic/react', () => ({
  IonInput: ({ label, type, value }: { label: string; type: string; value: string }) => (
    <input aria-label={label} type={type} value={value} readOnly />
  ),
  IonIcon: ({ icon }: { icon: string }) => <img src={icon} alt="" />,
}));

afterEach(cleanup);

describe('Input password visibility', () => {
  it('keeps the visibility icon synchronized with the password state', () => {
    render(<Input label="Password" value="secret" onChange={vi.fn()} type="password" />);

    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    const visibilityIcon = toggle.querySelector('img');

    expect(input.getAttribute('type')).toBe('password');
    expect(visibilityIcon?.getAttribute('src')).toBe('eye-off');

    fireEvent.click(toggle);

    expect(input.getAttribute('type')).toBe('text');
    const updatedToggle = screen.getByRole('button', { name: 'Hide password' });
    expect(updatedToggle.querySelector('img')?.getAttribute('src')).toBe('eye');
    expect(updatedToggle).toBe(toggle);
  });

  it('keeps each password field visibility independent', () => {
    render(
      <>
        <Input label="Current password" value="current" onChange={vi.fn()} type="password" />
        <Input label="New password" value="new" onChange={vi.fn()} type="password" />
        <Input label="Confirm password" value="confirm" onChange={vi.fn()} type="password" />
      </>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Show password' })[0]);

    expect(screen.getByLabelText('Current password').getAttribute('type')).toBe('text');
    expect(screen.getByLabelText('New password').getAttribute('type')).toBe('password');
    expect(screen.getByLabelText('Confirm password').getAttribute('type')).toBe('password');
  });
});
