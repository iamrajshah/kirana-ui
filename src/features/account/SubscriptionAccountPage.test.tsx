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
          code: 'DEMO', name: 'Demo', description: 'Seven-day preview',
          quarterlyPricePaise: 0, halfYearlyPricePaise: 0, yearlyPricePaise: 0,
          staffLimit: 3, firmLimit: 1, entitlements: ['CORE_POS'],
        },
        {
          code: 'STARTER',
          name: 'Basic',
          description: 'Core POS',
          quarterlyPricePaise: 150000,
          halfYearlyPricePaise: 280000,
          yearlyPricePaise: 500000,
          staffLimit: 2,
          firmLimit: 1,
          entitlements: ['CORE_POS', 'ESSENTIAL_REPORTS'],
        },
        { code: 'PRO', name: 'Pro', description: 'Busy counter', quarterlyPricePaise: 240000, halfYearlyPricePaise: 450000, yearlyPricePaise: 800000, staffLimit: 3, firmLimit: 1, entitlements: ['CORE_POS', 'ADVANCED_REPORTS', 'CUSTOM_BARCODE'] },
        { code: 'BUSINESS', name: 'Business', description: 'Family business', quarterlyPricePaise: 420000, halfYearlyPricePaise: 790000, yearlyPricePaise: 1400000, staffLimit: 5, firmLimit: 3, entitlements: ['CORE_POS', 'ADVANCED_REPORTS', 'CUSTOM_BARCODE', 'MULTI_FIRM'] },
      ],
      addOns: [
        { code: 'EXTRA_STAFF', name: 'Additional staff', description: 'Add staff', availableOn: ['PRO', 'BUSINESS'], quarterlyPricePaise: 25000, halfYearlyPricePaise: 45000, yearlyPricePaise: 80000 },
        { code: 'EXTRA_FIRM', name: 'Additional firm', description: 'Add firm', availableOn: ['BUSINESS'], quarterlyPricePaise: 60000, halfYearlyPricePaise: 110000, yearlyPricePaise: 200000 },
      ],
      billing: { periods: ['QUARTERLY', 'HALF_YEARLY', 'YEARLY'], yearlyRecommended: true, taxes: 'Prices exclude GST' },
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
    expect(screen.getByText((_, node) => node?.textContent === '₹5,000/account.term.yearly')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'account.yearly' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(screen.getByText('account.demoTitle')).toBeTruthy();
    expect(screen.getByText('account.mostPopular')).toBeTruthy();
    expect(screen.getAllByText('account.allDevices')).toHaveLength(3);
    expect(screen.getAllByText('account.gstExclusive')).toHaveLength(3);
    expect(screen.getByText('Additional staff')).toBeTruthy();
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
