// @vitest-environment jsdom
import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SupplierLedgerPage from './SupplierLedgerPage';

const state = vi.hoisted(() => ({ ledgerArgs: [] as Array<{ firm_id?: string }> }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({
  useParams: () => ({ id: '8' }),
  useHistory: () => ({ push: vi.fn() }),
}));
vi.mock('../../core/hooks', () => ({ useAppSelector: () => ({ roles: ['OWNER'] }) }));
vi.mock('../../core/auth/authSlice', () => ({ selectCurrentUser: vi.fn() }));
vi.mock('../../core/permissions/permissions', () => ({ hasPermission: () => true }));
vi.mock('@core/services/notificationService', () => ({
  default: { warning: vi.fn(), success: vi.fn(), handleApiError: vi.fn() },
}));
vi.mock('@core/api/firmApi', () => ({
  useGetFirmsQuery: () => ({ data: { data: { firms: [
    { id: '2', code: 'JT', legal_name: 'Jitendra Trading', display_name: 'Jitendra Trading', is_active: true, is_default_sales: false },
  ] } } }),
}));
vi.mock('../../core/api/supplierApi', () => ({
  useGetSupplierByIdQuery: () => ({
    data: { success: true, data: {
      id: '8', name: 'Gemini', phone: '9876543210', email: null, address: null,
      is_active: true, created_at: '2026-10-23', default_purchase_firm_id: '2',
      balances_by_firm: [{
        firm_id: '2', balance: 400,
        firm: { id: '2', code: 'JT', legal_name: 'Jitendra Trading', display_name: 'Jitendra Trading', is_active: true, is_default_sales: false },
      }],
    } },
    isLoading: false,
  }),
  useGetSupplierLedgerQuery: (args: { firm_id?: string }) => {
    state.ledgerArgs.push(args);
    return {
      data: { success: true, data: {
        entries: [],
        summary: {
          totalCredit: args.firm_id === '2' ? 500 : 0,
          totalDebit: args.firm_id === '2' ? 100 : 0,
          balance: args.firm_id === '2' ? 400 : 0,
        },
      } },
      isLoading: false,
      refetch: vi.fn(),
    };
  },
  useMakeSupplierPaymentMutation: () => [vi.fn(), { isLoading: false }],
  useGetBankAccountsQuery: () => ({ data: { data: [] } }),
  useCreateBankAccountMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateBankAccountMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteBankAccountMutation: () => [vi.fn()],
  useSetPrimaryBankAccountMutation: () => [vi.fn()],
}));
vi.mock('../../components', () => ({
  Input: () => <input />,
  Button: ({ children }: PropsWithChildren) => <button>{children}</button>,
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));
vi.mock('./components', () => ({
  PrimaryBankAccountCard: () => null,
  BankAccountModal: () => null,
  BankAccountFormModal: () => null,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container, IonHeader: Container, IonToolbar: Container, IonTitle: Container,
    IonContent: Container, IonButtons: Container, IonBackButton: Container, IonCard: Container,
    IonCardHeader: Container, IonCardTitle: Container, IonCardContent: Container, IonList: Container,
    IonItem: Container, IonLabel: Container, IonSpinner: Container, IonRefresher: Container,
    IonRefresherContent: Container, IonBadge: Container, IonFab: Container, IonFabButton: Container,
    IonIcon: Container, IonModal: Container, IonButton: Container, IonGrid: Container, IonRow: Container,
    IonCol: Container, IonAlert: Container,
    IonSelect: ({ children, value, onIonChange, ...props }: PropsWithChildren<{
      value?: string;
      onIonChange?: (event: { detail: { value: string } }) => void;
      'aria-label'?: string;
    }>) => (
      <select
        aria-label={props['aria-label']}
        value={value}
        onChange={(event) => onIonChange?.({ detail: { value: event.target.value } })}
      >
        {children}
      </select>
    ),
    IonSelectOption: ({ children, value }: PropsWithChildren<{ value?: string }>) => (
      <option value={value}>{children}</option>
    ),
  };
});

afterEach(() => {
  cleanup();
  state.ledgerArgs.length = 0;
});

describe('SupplierLedgerPage ledger serialization', () => {
  it('renders the nonzero summary balance returned for a firm-filtered ledger', () => {
    render(<SupplierLedgerPage />);

    fireEvent.change(screen.getByLabelText('suppliers.ledger.filterByFirm'), {
      target: { value: '2' },
    });

    expect(state.ledgerArgs.some((args) => args.firm_id === '2')).toBe(true);
    expect(document.querySelector('.summary-value.balance')?.textContent).toContain('₹400');
    expect(document.querySelector('.summary-value.balance')?.textContent).toContain(
      'suppliers.ledger.payable'
    );
  });
});
