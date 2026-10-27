// @vitest-environment jsdom
import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionAccountPage } from './SubscriptionAccountPage';

const requestDeletion = vi.fn();
const session = {
  selected: { userId: '1', tenantId: '2' },
  memberships: [{ userId: '1', tenantId: '2', tenantName: 'My Shop', active: true }],
  commercialAccess: {
    planCode: 'DEMO',
    state: 'TRIALING',
    demoExpiresAt: '2099-01-01T00:00:00.000Z',
    endsAt: null,
    graceExpiresAt: null,
  },
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      `${key}${values?.plan ? `:${values.plan}` : ''}`,
  }),
}));
vi.mock('@core/hooks', () => ({ useAppSelector: () => session }));
vi.mock('@core/auth/authSlice', () => ({
  selectSessionContext: vi.fn(),
  selectCurrentUser: vi.fn(),
}));
vi.mock('@core/api/lifecycleApi', () => ({
  commercialFromSession: (value: typeof session) => value.commercialAccess,
  useGetPublicProductQuery: () => ({
    data: {
      plans: [
        {
          code: 'STARTER',
          name: 'Starter',
          description: 'Core POS',
          monthlyPricePaise: 29900,
          yearlyPricePaise: 299900,
          staffLimit: 3,
          firmLimit: 1,
        },
      ],
      support: { email: 'support@test.dev' },
    },
  }),
  useGetAccountSummaryQuery: () => ({ data: { consents: [], deletionRequest: null } }),
  useRequestAccountDeletionMutation: () => [requestDeletion, { isLoading: false }],
  useCreateSupportRequestMutation: () => [vi.fn(), { isLoading: false }],
  useSelectAccountMembershipMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('@ionic/react', () => {
  const Box = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return { IonPage: Box, IonContent: Box };
});
vi.mock('@components', () => ({
  Button: ({ children, loading, ...props }: PropsWithChildren<Record<string, unknown>>) => {
    void loading;
    return <button {...props}>{children}</button>;
  },
}));

afterEach(cleanup);

describe('SubscriptionAccountPage', () => {
  it('shows lifecycle guidance and server-priced annual plans by default', () => {
    render(<SubscriptionAccountPage />);
    expect(screen.getByText('account.lifecycle.TRIALING')).toBeTruthy();
    expect(screen.getByText((_, node) => node?.textContent === '₹2,999/account.year')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'account.yearly' }).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('requires explicit deletion confirmation', () => {
    render(<SubscriptionAccountPage />);
    const action = screen.getByRole('button', {
      name: 'account.requestDeletion',
    }) as HTMLButtonElement;
    expect(action.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(
      (screen.getByRole('button', { name: 'account.requestDeletion' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });
});
