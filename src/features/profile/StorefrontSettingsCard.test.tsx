// @vitest-environment jsdom
import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorefrontSettingsCard } from './StorefrontSettingsCard';

const state = vi.hoisted(() => ({
  roles: ['OWNER'] as string[],
  settingsResponse: {
    data: {
      storefront_show_stock_quantity: false as boolean | undefined,
    },
  },
  update: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/hooks', () => ({
  useAppSelector: (selector: (value: unknown) => unknown) =>
    selector({ auth: { user: { id: '1', roles: state.roles } } }),
}));
vi.mock('@core/api/tenantSettingsApi', () => ({
  useGetTenantSettingsQuery: (arg: unknown, options: unknown) => {
    state.getSettings(arg, options);
    return {
      data: state.settingsResponse,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useUpdateTenantSettingsMutation: () => [
    (body: unknown) => ({ unwrap: () => state.update(body) }),
    { isLoading: false },
  ],
}));
vi.mock('@core/services/notificationService', () => ({
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonCard: Container,
    IonCardContent: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonIcon: Container,
    IonSpinner: Container,
    IonButton: ({
      children,
      disabled,
      onClick,
    }: PropsWithChildren<{ disabled?: boolean; onClick?: () => void }>) => (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
    IonToggle: ({
      checked,
      disabled,
      onIonChange,
      'aria-label': ariaLabel,
    }: {
      checked?: boolean;
      disabled?: boolean;
      onIonChange?: (event: { detail: { checked: boolean } }) => void;
      'aria-label'?: string;
    }) => (
      <input
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onIonChange?.({ detail: { checked: event.target.checked } })}
      />
    ),
  };
});

describe('StorefrontSettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.roles = ['OWNER'];
    state.settingsResponse.data.storefront_show_stock_quantity = false;
    state.update.mockResolvedValue({ success: true });
  });

  afterEach(cleanup);

  it('defaults missing stock visibility to off and explains the customer impact', () => {
    state.settingsResponse.data.storefront_show_stock_quantity = undefined;
    render(<StorefrontSettingsCard />);

    expect(
      (
        screen.getByRole('checkbox', {
          name: 'storefrontSettings.showExactStock',
        }) as HTMLInputElement
      ).checked
    ).toBe(false);
    expect(screen.getByText('storefrontSettings.impactHidden')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /storefrontSettings.save/ }).hasAttribute('disabled')
    ).toBe(true);
  });

  it('lets an owner persist the exact boolean server contract', async () => {
    render(<StorefrontSettingsCard />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'storefrontSettings.showExactStock' }));
    expect(screen.getByText('storefrontSettings.impactVisible')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /storefrontSettings.save/ }));

    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith({ storefront_show_stock_quantity: true })
    );
    expect(await screen.findByText('storefrontSettings.saved')).toBeTruthy();
  });

  it.each(['MANAGER', 'CASHIER'])('does not expose the editor to the %s role', (role) => {
    state.roles = [role];
    render(<StorefrontSettingsCard />);

    expect(screen.queryByText('storefrontSettings.title')).toBeNull();
    expect(state.getSettings).toHaveBeenCalledWith(undefined, { skip: true });
  });
});
