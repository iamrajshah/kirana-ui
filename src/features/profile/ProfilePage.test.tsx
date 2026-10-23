// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@core/hooks', () => ({
  useAppSelector: () => ({
    id: '1',
    name: 'Rajesh',
    phone: '9876543210',
    email: 'rajesh@example.com',
    roles: ['OWNER'],
    tenant: { id: '1', name: 'Shah Kirana', status: 'ACTIVE' },
  }),
}));

vi.mock('@core/api/userApi', () => ({ useUpdateProfileMutation: () => [vi.fn(), { isLoading: false }] }));
vi.mock('../../contexts/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('./DocumentSettingsCard', () => ({ DocumentSettingsCard: () => null }));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows login email as read-only profile information', () => {
    render(<ProfilePage />);

    expect(screen.getByText('profile.emailReadOnly')).toBeTruthy();
    const emailInput = document.querySelector('ion-input[type="email"]');
    expect(emailInput?.hasAttribute('disabled')).toBe(true);
  });
});
