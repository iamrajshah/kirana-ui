// @vitest-environment jsdom

import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformLoginPage } from './PlatformLoginPage';

const mocks = vi.hoisted(() => ({
  toggleTheme: vi.fn(),
  history: { replace: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('react-router', () => ({ useHistory: () => mocks.history }));
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: mocks.toggleTheme }),
}));
vi.mock('@core/api/platformApi', () => ({
  platformApi: { login: vi.fn() },
}));
vi.mock('@components', () => ({
  Input: ({ label }: { label: string }) => <input aria-label={label} />,
  Button: ({ children }: PropsWithChildren) => <button>{children}</button>,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonButton: ({ children, onClick, ...props }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
    IonIcon: () => null,
    IonToast: () => null,
  };
});
vi.mock('ionicons/icons', () => ({ moon: 'moon', sunny: 'sunny' }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('offers a visible theme switch before platform sign-in', () => {
  render(<PlatformLoginPage />);

  fireEvent.click(screen.getByRole('button', { name: 'profile.lightMode' }));

  expect(mocks.toggleTheme).toHaveBeenCalledTimes(1);
});
