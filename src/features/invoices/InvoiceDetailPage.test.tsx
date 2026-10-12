import React, { type ButtonHTMLAttributes, type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InvoiceDetailPage from './InvoiceDetailPage';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  finalize: vi.fn(),
  cancel: vi.fn(),
}));

const trigger = (operation: ReturnType<typeof vi.fn>) => (payload: unknown) => ({
  unwrap: () => operation(payload),
});

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'held-1' }),
  useHistory: () => ({ push: mocks.push }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../core/api/invoiceApi', () => ({
  useGetInvoiceByIdQuery: () => ({
    data: {
      data: {
        id: 'held-1',
        invoice_number: 'DRAFT-1',
        status: 'DRAFT',
        held_at: '2026-10-12T10:00:00.000Z',
        total_amount: 100,
        subtotal_amount: 100,
        paid_amount: 0,
        discount_amount: 0,
        gst_amount: 0,
        created_at: '2026-10-12T10:00:00.000Z',
        customer: null,
        items: [],
      },
    },
    isLoading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
  useFinalizeInvoiceMutation: () => [trigger(mocks.finalize), { isLoading: false }],
  useCancelInvoiceMutation: () => [trigger(mocks.cancel), { isLoading: false }],
}));
vi.mock('@core/api/paymentApi', () => ({
  useCreatePaymentMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('@components/PaymentModal', () => ({ PaymentModal: () => null }));
vi.mock('ionicons/icons', () => ({
  cash: 'cash',
  closeCircle: 'close',
  checkmarkCircle: 'check',
  create: 'create',
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const IonButton = ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  );
  return {
    IonContent: Container,
    IonPage: Container,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonButtons: Container,
    IonBackButton: () => null,
    IonCard: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonCardContent: Container,
    IonBadge: Container,
    IonButton,
    IonIcon: () => null,
    IonSpinner: () => null,
    IonAlert: () => null,
    IonToast: () => null,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('InvoiceDetailPage held drafts', () => {
  it('routes held drafts through claim/resume instead of direct mutations', () => {
    render(<InvoiceDetailPage />);

    expect(screen.queryByRole('button', { name: 'invoiceDetail.editDraft' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'invoiceDetail.finalizeAndCollectPayment' })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'invoiceDetail.cancelInvoice' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'invoiceDetail.openHeldBill' }));
    expect(mocks.push).toHaveBeenCalledWith('/billing?held=held-1');
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
