import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

vi.mock('ionicons/icons', () => ({
  eye: 'eye',
  eyeOff: 'eye-off',
}));

vi.mock('@ionic/react', () => ({
  IonInput: ({ label, type, value }: { label: string; type: string; value: string }) => (
    <input aria-label={label} type={type} value={value} readOnly />
  ),
  IonIcon: ({ icon }: { icon: string }) => <span data-testid="visibility-icon" data-icon={icon} />,
}));

afterEach(cleanup);

describe('Input password visibility', () => {
  it('keeps the visibility icon synchronized with the password state', () => {
    render(<Input label="Password" value="secret" onChange={vi.fn()} type="password" />);

    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(input.getAttribute('type')).toBe('password');
    expect(screen.getByTestId('visibility-icon').getAttribute('data-icon')).toBe('eye-off');

    fireEvent.click(toggle);

    expect(input.getAttribute('type')).toBe('text');
    expect(screen.getByTestId('visibility-icon').getAttribute('data-icon')).toBe('eye');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBe(toggle);
  });

  it('keeps each password field visibility independent', () => {
    render(
      <>
        <Input label="Current password" value="current" onChange={vi.fn()} type="password" />
        <Input label="New password" value="new" onChange={vi.fn()} type="password" />
      </>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Show password' })[0]);

    expect(screen.getByLabelText('Current password').getAttribute('type')).toBe('text');
    expect(screen.getByLabelText('New password').getAttribute('type')).toBe('password');
  });
});
