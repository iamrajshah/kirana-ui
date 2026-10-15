import React, { type ButtonHTMLAttributes, type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceDetailPage from './InvoiceDetailPage';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  documentResult: {} as Record<string, unknown>,
  invoiceResult: {} as Record<string, unknown>,
  refetchDocument: vi.fn(),
  refetchInvoice: vi.fn(),
  runOutput: vi.fn(),
  outputState: { phase: 'idle', action: null } as Record<string, unknown>,
  createPayment: vi.fn(),
  finalize: vi.fn(),
  cancel: vi.fn(),
}));

const document = {
  kind: 'FINALIZED_DOCUMENT',
  invoice_id: 'invoice-1',
  invoice_number: 'KIR/26/0001',
  issued_at: '2026-10-14T10:00:00.000Z',
  document_mode: 'SIMPLE_RECEIPT',
  legacy: false,
  cancellation: { cancelled: false, marker: null },
  supplier: {
    name: 'Rajesh Kirana',
    phone: '9999999999',
    address: 'Pune',
    state: 'Maharashtra',
    state_code: '27',
    gstin: null,
    signatory: null,
  },
  customer: {
    id: 'customer-1',
    name: 'Asha',
    phone: '9888888888',
    address: null,
    state: null,
    state_code: null,
    gstin: null,
  },
  place_of_supply: null,
  totals: {
    subtotal_amount: '100.00',
    item_discount_amount: '0.00',
    bill_discount_amount: '0.00',
    discount_amount: '0.00',
    gst_amount: '0.00',
    total_amount: '100.00',
  },
  items: [
    {
      id: 'item-1',
      variant_id: 'variant-1',
      product_name: 'Frozen Poha',
      sku: 'POHA-1',
      hsn_code: null,
      uqc_code: null,
      unit_label: 'packet',
      quantity: 1,
      unit_price: '100.00',
      gross_amount: '100.00',
      item_discount_amount: '0.00',
      allocated_bill_discount_amount: '0.00',
      taxable_amount: '100.00',
      gst_rate: null,
      cgst_amount: null,
      sgst_amount: null,
      igst_amount: null,
      line_total_amount: '100.00',
    },
  ],
  footer: 'Thank you',
  payment: {
    status: 'PARTIALLY_PAID',
    paid_amount: '40.00',
    remaining_amount: '60.00',
    modes: ['CASH'],
    last_allocation_at: '2026-10-15T09:30:00.000Z',
    as_of: '2026-10-15T09:31:00.000Z',
    allocations: [
      {
        payment_id: 'pay-1',
        amount: '40.00',
        payment_mode: 'CASH',
        reference_note: 'Counter payment',
        created_at: '2026-10-15T09:30:00.000Z',
      },
    ],
  },
};

const trigger = (operation: ReturnType<typeof vi.fn>) => (payload: unknown) => ({
  unwrap: () => operation(payload),
});

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'invoice-1' }),
  useHistory: () => ({ push: mocks.push }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../core/api/invoiceApi', () => ({
  useGetFinalizedDocumentQuery: () => mocks.documentResult,
  useGetInvoiceByIdQuery: () => mocks.invoiceResult,
  useFinalizeInvoiceMutation: () => [trigger(mocks.finalize), { isLoading: false }],
  useCancelInvoiceMutation: () => [trigger(mocks.cancel), { isLoading: false }],
}));
vi.mock('@core/api/tenantSettingsApi', () => ({
  useGetTenantSettingsQuery: () => ({ data: { data: { default_paper_width: 'MM58' } } }),
}));
vi.mock('@core/api/paymentApi', () => ({
  useCreatePaymentMutation: () => [trigger(mocks.createPayment), { isLoading: false }],
}));
vi.mock('@components/PaymentModal', () => ({ PaymentModal: () => null }));
vi.mock('./receipt', async (importOriginal) => {
  const original = await importOriginal<typeof import('./receipt')>();
  return {
    ...original,
    ReceiptDocument: ({
      receipt,
    }: {
      receipt: {
        invoiceNumber: string;
        cancellationMarker: string | null;
        items: Array<{ name: string }>;
      };
    }) => (
      <div data-testid="receipt-document">
        {receipt.invoiceNumber}
        {receipt.cancellationMarker}
        {receipt.items[0]?.name}
      </div>
    ),
    useReceiptOutput: () => ({
      state: mocks.outputState,
      isBusy: mocks.outputState.phase === 'generating' || mocks.outputState.phase === 'handing-off',
      run: mocks.runOutput,
    }),
  };
});
vi.mock('ionicons/icons', () => ({
  cash: 'cash',
  closeCircle: 'close',
  checkmarkCircle: 'check',
  create: 'create',
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  );
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
    IonBackButton: ({ defaultHref }: { defaultHref: string }) => <a href={defaultHref}>Back</a>,
    IonCard: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonCardContent: Container,
    IonBadge: Container,
    IonButton,
    IonIcon: () => null,
    IonSpinner: () => <span>loading</span>,
    IonAlert: () => null,
    IonToast: () => null,
  };
});

beforeEach(() => {
  mocks.documentResult = {
    data: { data: document },
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: mocks.refetchDocument,
  };
  mocks.invoiceResult = {
    data: undefined,
    isLoading: false,
    error: undefined,
    refetch: mocks.refetchInvoice,
  };
  mocks.runOutput.mockResolvedValue({ phase: 'completed', action: 'print' });
  mocks.outputState = { phase: 'idle', action: null };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('InvoiceDetailPage receipt workspace', () => {
  it('renders frozen sale facts and a separate current allocation projection', () => {
    render(<InvoiceDetailPage />);

    expect(screen.getByTestId('receipt-document').textContent).toContain('KIR/26/0001');
    expect(screen.getByText('invoiceDetail.currentPaymentPosition')).toBeTruthy();
    expect(screen.getByText('invoiceDetail.allocationHistory')).toBeTruthy();
    expect(screen.getByText('Counter payment')).toBeTruthy();
    expect(screen.getByText('invoiceDetail.lastPayment')).toBeTruthy();
    expect(screen.getByText('invoiceDetail.projectionTime')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/invoices');
  });

  it('uses shared retryable Print, PDF, and Share output with the tenant paper width', async () => {
    render(<InvoiceDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'invoiceDetail.print' }));
    fireEvent.click(screen.getByRole('button', { name: 'invoiceDetail.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'invoiceDetail.share' }));

    await waitFor(() => expect(mocks.runOutput).toHaveBeenCalledTimes(3));
    expect(mocks.runOutput.mock.calls.map(([action]) => action)).toEqual(['print', 'pdf', 'share']);
    expect(mocks.runOutput.mock.calls[0][2]).toBe('58mm');
  });

  it('keeps the frozen sale intact when a later allocation changes the live position', () => {
    const { rerender } = render(<InvoiceDetailPage />);
    expect(screen.getByTestId('receipt-document').textContent).toContain('Frozen Poha');
    expect(screen.getByText('Counter payment')).toBeTruthy();

    mocks.documentResult = {
      data: {
        data: {
          ...document,
          payment: {
            ...document.payment,
            status: 'PAID',
            paid_amount: '100.00',
            remaining_amount: '0.00',
            modes: ['CASH', 'UPI'],
            last_allocation_at: '2026-10-15T11:00:00.000Z',
            as_of: '2026-10-15T11:01:00.000Z',
            allocations: [
              ...document.payment.allocations,
              {
                payment_id: 'pay-2',
                amount: '60.00',
                payment_mode: 'UPI',
                reference_note: 'Later collection',
                created_at: '2026-10-15T11:00:00.000Z',
              },
            ],
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: mocks.refetchDocument,
    };
    rerender(<InvoiceDetailPage />);

    expect(screen.getByTestId('receipt-document').textContent).toContain('Frozen Poha');
    expect(screen.getByText('Later collection')).toBeTruthy();
    expect(screen.getByText('UPI')).toBeTruthy();
  });

  it('keeps output actions enabled after a recoverable output failure', () => {
    mocks.outputState = {
      phase: 'recoverable-error',
      action: 'pdf',
      message: 'Printer unavailable',
    };
    render(<InvoiceDetailPage />);

    expect(screen.getByRole('alert').textContent).toContain('invoiceDetail.outputFailed');
    expect(
      screen.getByRole('button', { name: 'invoiceDetail.print' }).hasAttribute('disabled')
    ).toBe(false);
    expect(screen.getByRole('button', { name: 'invoiceDetail.pdf' }).hasAttribute('disabled')).toBe(
      false
    );
    expect(
      screen.getByRole('button', { name: 'invoiceDetail.share' }).hasAttribute('disabled')
    ).toBe(false);
  });

  it('makes a failed document read retryable without falling back to mutable invoice data', () => {
    mocks.documentResult = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { status: 403 },
      refetch: mocks.refetchDocument,
    };
    render(<InvoiceDetailPage />);

    expect(screen.getByRole('alert').textContent).toContain('invoiceDetail.documentUnavailable');
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(mocks.refetchDocument).toHaveBeenCalledOnce();
  });

  it('shows legacy and cancelled evidence from the shared document model', () => {
    mocks.documentResult = {
      data: {
        data: {
          ...document,
          legacy: true,
          cancellation: { cancelled: true, marker: 'CANCELLED — NOT VALID' },
        },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: mocks.refetchDocument,
    };
    render(<InvoiceDetailPage />);

    expect(screen.getByText('invoiceDetail.legacyReceipt')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('CANCELLED — NOT VALID');
    expect(screen.getByTestId('receipt-document').textContent).toContain('CANCELLED — NOT VALID');
  });

  it('keeps held drafts in the existing resume workflow', () => {
    mocks.documentResult = {
      data: {
        data: {
          kind: 'NON_DOCUMENT',
          reason: 'NOT_ISSUED',
          invoice_id: 'invoice-1',
          status: 'DRAFT',
        },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: mocks.refetchDocument,
    };
    mocks.invoiceResult = {
      data: {
        data: {
          id: 'invoice-1',
          invoice_number: 'DRAFT-1',
          status: 'DRAFT',
          held_at: '2026-10-12T10:00:00.000Z',
          total_amount: 100,
          paid_amount: 0,
          created_at: '2026-10-12T10:00:00.000Z',
          items: [],
        },
      },
      isLoading: false,
      error: undefined,
      refetch: mocks.refetchInvoice,
    };
    render(<InvoiceDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'invoiceDetail.openHeldBill' }));
    expect(mocks.push).toHaveBeenCalledWith('/billing?held=invoice-1');
  });
});
