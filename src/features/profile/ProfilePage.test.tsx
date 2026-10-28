// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';

const profileState = vi.hoisted(() => ({ roles: ['OWNER'] as string[] }));

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
    roles: profileState.roles,
    tenant: { id: '1', name: 'Shah Kirana', status: 'ACTIVE' },
  }),
}));

vi.mock('@core/api/userApi', () => ({ useUpdateProfileMutation: () => [vi.fn(), { isLoading: false }] }));
vi.mock('../../contexts/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('./DocumentSettingsCard', () => ({ DocumentSettingsCard: () => null }));
vi.mock('./FirmSettingsCard', () => ({ FirmSettingsCard: () => <div>firm-settings</div> }));
vi.mock('./DeviceSecurityCard', () => ({ DeviceSecurityCard: () => <div>device-security</div> }));

describe('ProfilePage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    profileState.roles = ['OWNER'];
  });

  it('shows login email as read-only profile information', () => {
    render(<ProfilePage />);

    expect(screen.getByText('profile.emailReadOnly')).toBeTruthy();
    const emailInput = document.querySelector('ion-input[type="email"]');
    expect(emailInput?.hasAttribute('disabled')).toBe(true);
  });

  it('keeps firm management owner-only', () => {
    profileState.roles = ['MANAGER'];
    render(<ProfilePage />);
    expect(screen.queryByText('firm-settings')).toBeNull();
  });

  it('shows firm management to an owner', () => {
    render(<ProfilePage />);
    expect(screen.getByText('firm-settings')).toBeTruthy();
  });
});
