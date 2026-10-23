// @vitest-environment jsdom

import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformTenantsPage } from './PlatformTenantsPage';

const mocks = vi.hoisted(() => ({
  listTenants: vi.fn(),
  getTenantDetails: vi.fn(),
  resetOwnerPassword: vi.fn(),
  history: { replace: vi.fn() },
  translate: vi.fn((key: string, values?: { count?: number }) =>
    values?.count === undefined ? key : `${key}:${values.count}`
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mocks.translate,
  }),
}));
vi.mock('react-router', () => ({ useHistory: () => mocks.history }));
vi.mock('@core/api/platformApi', () => ({
  platformApi: {
    listTenants: (...args: unknown[]) => mocks.listTenants(...args),
    getTenantDetails: (...args: unknown[]) => mocks.getTenantDetails(...args),
    resetOwnerPassword: (...args: unknown[]) => mocks.resetOwnerPassword(...args),
    createTenant: vi.fn(),
    updateTenantStatus: vi.fn(),
  },
}));
vi.mock('@components', () => ({
  Input: ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
    <label>{label}<input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>
  ),
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  );
  return {
    IonPage: Container,
    IonContent: Container,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonButtons: Container,
    IonCard: Container,
    IonCardContent: Container,
    IonBadge: Container,
    IonButton: Button,
    IonIcon: () => null,
    IonProgressBar: () => null,
    IonAlert: () => null,
    IonToast: ({ isOpen, message }: { isOpen: boolean; message: string }) => isOpen ? <div>{message}</div> : null,
    IonModal: ({ isOpen, children }: PropsWithChildren<{ isOpen: boolean }>) => isOpen ? <div>{children}</div> : null,
  };
});
vi.mock('ionicons/icons', () => ({
  add: 'add', calendar: 'calendar', checkmarkCircle: 'check', close: 'close', eye: 'eye', key: 'key',
  logOut: 'logout', pauseCircle: 'pause', search: 'search',
}));

const summary = {
  id: '1',
  name: 'Jayesh Trading',
  status: 'ACTIVE' as const,
  createdAt: '2025-12-30T09:18:42.000Z',
  owner: { id: '1', name: 'jaiuuu', email: 'jaiu007@gmail.com', phone: '8983898281' },
  counts: { users: 6, products: 127, invoices: 45 },
  onboarding: {
    completed: 4,
    total: 4,
    percent: 100,
    steps: {
      ownerPasswordChanged: true,
      productsAdded: true,
      staffAdded: true,
      firstSaleCompleted: true,
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('platform_access_token', 'token');
  mocks.listTenants.mockResolvedValue([summary]);
  mocks.getTenantDetails.mockResolvedValue({
    ...summary,
    contact: {
      ownerName: 'Jaiyesh Shah',
      phone: '8983898281',
      email: null,
      gstNumber: null,
    },
    staff: [
      {
        id: '1',
        name: 'jaiuuu',
        email: 'jaiu007@gmail.com',
        phone: '8983898281',
        active: true,
        mustChangePassword: false,
        createdAt: '2025-12-30T09:18:42.000Z',
        roles: ['OWNER'],
      },
    ],
  });
  mocks.resetOwnerPassword.mockResolvedValue({
    tenant: { id: '1', name: 'Jayesh Trading' },
    owner: { id: '1', name: 'jaiuuu', email: 'jaiu007@gmail.com', phone: '8983898281', mustChangePassword: true },
  });
});
afterEach(cleanup);

describe('PlatformTenantsPage', () => {
  it('opens labelled shop and staff details', async () => {
    render(<PlatformTenantsPage />);

    await screen.findByText('Jayesh Trading');
    fireEvent.click(screen.getByRole('button', { name: 'platform.viewDetails' }));

    await waitFor(() =>
      expect(mocks.getTenantDetails).toHaveBeenCalledWith('1', expect.any(AbortSignal))
    );
    expect(await screen.findByText('Jaiyesh Shah')).toBeTruthy();
    expect(screen.getByText('platform.staffAccounts')).toBeTruthy();
    expect(screen.getAllByText('jaiu007@gmail.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('platform.createdOn').length).toBeGreaterThan(0);
  });

  it('resets the owner to a temporary password that must be changed', async () => {
    render(<PlatformTenantsPage />);

    await screen.findByText('Jayesh Trading');
    fireEvent.click(screen.getByRole('button', { name: 'platform.viewDetails' }));
    await screen.findByText('platform.staffAccounts');
    fireEvent.click(screen.getByRole('button', { name: 'platform.resetOwnerPassword' }));
    fireEvent.change(screen.getByLabelText('platform.newTemporaryPassword'), {
      target: { value: 'Welcome1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'platform.confirmPasswordReset' }));

    await waitFor(() =>
      expect(mocks.resetOwnerPassword).toHaveBeenCalledWith('1', 'Welcome1!')
    );
    expect(await screen.findByText('platform.passwordResetSuccess')).toBeTruthy();
  });

  it('shows a retry action when shop details cannot be loaded', async () => {
    mocks.getTenantDetails.mockRejectedValueOnce(new Error('Details unavailable'));
    render(<PlatformTenantsPage />);

    await screen.findByText('Jayesh Trading');
    fireEvent.click(screen.getByRole('button', { name: 'platform.viewDetails' }));

    expect(await screen.findByText('Details unavailable')).toBeTruthy();
    expect(screen.queryByText('common.loading')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));

    expect(await screen.findByText('platform.staffAccounts')).toBeTruthy();
    expect(mocks.getTenantDetails).toHaveBeenCalledTimes(2);
  });
});
