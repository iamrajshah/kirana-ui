import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirmSettingsCard } from './FirmSettingsCard';

const state = vi.hoisted(() => ({
  setDefault: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
  loadFirm: vi.fn(() => ({ unwrap: () => Promise.resolve({ data: {
    id: '2', tenant_id: '1', code: 'JT', legal_name: 'Jitendra Trading Private',
    display_name: 'Jitendra Trading', gstin: '24AAAAA0000A1Z5', pan: 'AAAAA0000A',
    address_line1: 'Market Road', address_line2: null, city: 'Ahmedabad', state: 'Gujarat',
    state_code: '24', postal_code: '380001', phone: '9876543210', invoice_prefix: 'JT',
    is_active: true, is_default_sales: false, bank_accounts: [],
  } }) })),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/api/firmApi', () => ({
  useGetFirmsQuery: () => ({
    data: { data: { firms: [
      { id: '1', code: 'KJS', legal_name: 'Kantilal Jadhavji Shop', display_name: 'Kantilal Jadhavji Shop', is_active: true, is_default_sales: true },
      { id: '2', code: 'JT', legal_name: 'Jitendra Trading', display_name: 'Jitendra Trading', is_active: true, is_default_sales: false },
    ] } },
    isLoading: false, isError: false, refetch: vi.fn(),
  }),
  useCreateFirmMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateFirmMutation: () => [vi.fn(), { isLoading: false }],
  useSetDefaultSalesFirmMutation: () => [state.setDefault, { isLoading: false }],
  useLazyGetFirmQuery: () => [state.loadFirm, { isFetching: false }],
}));
vi.mock('@core/services/notificationService', () => ({
  default: { warning: vi.fn(), success: vi.fn(), handleApiError: vi.fn() },
}));
vi.mock('@components', () => ({ Input: () => <input /> }));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonBadge: Container, IonCard: Container, IonCardContent: Container, IonCardHeader: Container,
    IonCardTitle: Container, IonIcon: Container, IonSpinner: Container,
    IonToggle: ({ children, checked, disabled }: PropsWithChildren<{ checked?: boolean; disabled?: boolean }>) => (
      <label>{children}<input type="checkbox" checked={checked} disabled={disabled} readOnly /></label>
    ),
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <button onClick={onClick}>{children}</button>,
  };
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('FirmSettingsCard', () => {
  it('shows tenant firms and updates the sales default through the explicit owner action', async () => {
    render(<FirmSettingsCard />);
    expect(screen.getByText('Kantilal Jadhavji Shop')).toBeTruthy();
    expect(screen.getByText('Jitendra Trading')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /firms.makeSalesDefault/ }));
    expect(state.setDefault).toHaveBeenCalledWith('2');
  });

  it('opens the complete create-firm form', () => {
    render(<FirmSettingsCard />);
    fireEvent.click(screen.getByRole('button', { name: /firms.addFirm/ }));
    expect(screen.getByText('firms.bankAccounts')).toBeTruthy();
    expect(screen.getByRole('button', { name: /firms.addBankAccount/ })).toBeTruthy();
  });

  it('loads private firm detail only when the owner edits a safe list item', async () => {
    render(<FirmSettingsCard />);
    const editButtons = screen.getAllByRole('button', { name: 'common.edit' });
    fireEvent.click(editButtons[1]);
    expect(state.loadFirm).toHaveBeenCalledWith('2');
    expect(await screen.findByText('firms.bankAccounts')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'firms.active' }).hasAttribute('disabled')).toBe(false);
  });
});
