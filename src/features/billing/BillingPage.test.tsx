import React, { type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingPage } from './BillingPage';

const mocks = vi.hoisted(() => ({
  historyReplace: vi.fn(),
  createInvoice: vi.fn(),
  cancelInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  finalizeInvoice: vi.fn(),
  renewHeldBill: vi.fn(),
  createPayment: vi.fn(),
  scanBarcode: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  search: '?edit=edit-1',
  invoice: {} as Record<string, unknown>,
}));

const apiTrigger = (operation: ReturnType<typeof vi.fn>) => (payload: unknown) => ({
  unwrap: () => operation(payload),
});

const matchedBarcode = {
  success: true,
  found: true,
  data: {
    product: { id: 'product-2', name: 'Tea', is_active: true },
    variant: {
      id: 'variant-2',
      product_id: 'product-2',
      sku: 'TEA-1',
      selling_price: 75,
      price: 75,
      is_active: true,
    },
    inventory: { variant_id: 'variant-2', quantity: 12, low_stock_threshold: 2 },
  },
};

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ replace: mocks.historyReplace }),
  useLocation: () => ({ search: mocks.search }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/hooks', () => ({
  useAppSelector: () => ({ id: '7', name: 'Rajesh', roles: ['CASHIER'] }),
}));
vi.mock('@core/auth/authSlice', () => ({ selectCurrentUser: vi.fn() }));
vi.mock('./HeldBillsPanel', () => ({
  HeldBillsPanel: ({
    focusBillId,
    onReleased,
  }: {
    focusBillId?: string | null;
    onReleased: (bill: { id: string }) => void;
  }) => (
    <div>
      held bills panel {focusBillId}
      <button onClick={() => onReleased({ id: 'edit-1' })}>release current mock</button>
    </div>
  ),
}));

vi.mock('@components', () => ({
  Loading: () => null,
  SearchBar: () => null,
  BarcodeScannerComponent: ({ onScan }: { onScan: (barcode: string) => void }) => (
    <button onClick={() => onScan('8901234567890')}>camera scan</button>
  ),
}));

vi.mock('@components/PaymentModal', () => ({
  PaymentModal: ({
    isOpen,
    onClose,
    onPayment,
  }: {
    isOpen: boolean;
    onClose: () => void | Promise<void>;
    onPayment: (amount: number, mode: 'CASH') => Promise<void>;
  }) =>
    isOpen ? (
      <div aria-label="payment-recovery">
        <button onClick={() => void onPayment(100, 'CASH')}>retry payment</button>
        <button onClick={() => void onClose()}>cancel checkout</button>
      </div>
    ) : null,
}));

vi.mock('@core/api/invoiceApi', () => ({
  useCreateInvoiceMutation: () => [apiTrigger(mocks.createInvoice), { isLoading: false }],
  useCancelInvoiceMutation: () => [apiTrigger(mocks.cancelInvoice), { isLoading: false }],
  useUpdateInvoiceMutation: () => [apiTrigger(mocks.updateInvoice), { isLoading: false }],
  useFinalizeInvoiceMutation: () => [apiTrigger(mocks.finalizeInvoice), { isLoading: false }],
  useRenewHeldBillMutation: () => [apiTrigger(mocks.renewHeldBill), { isLoading: false }],
  useGetHeldBillsQuery: () => ({ data: { success: true, data: [] } }),
  useGetInvoiceByIdQuery: () => ({
    data: { data: mocks.invoice },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@core/api/paymentApi', () => ({
  useCreatePaymentMutation: () => [apiTrigger(mocks.createPayment), { isLoading: false }],
}));

vi.mock('@core/api/customerApi', () => ({
  useLazySearchCustomersQuery: () => [vi.fn(), { data: undefined, isLoading: false }],
}));

vi.mock('@core/api/productApi', () => ({
  useLazySearchVariantsQuery: () => [vi.fn(), { data: undefined, isLoading: false }],
  useLazyScanBarcodeQuery: () => [apiTrigger(mocks.scanBarcode), { isFetching: false }],
}));

vi.mock('@core/services/notificationService', () => ({
  default: { error: mocks.notifyError, success: mocks.notifySuccess },
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

vi.mock('ionicons/icons', () => ({
  add: 'add',
  bookmark: 'bookmark',
  card: 'card',
  cash: 'cash',
  personAdd: 'personAdd',
  remove: 'remove',
  scan: 'scan',
  trash: 'trash',
}));

vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const IonButton = ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  );
  const IonItem = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  );
  return {
    IonButton,
    IonItem,
    IonIcon: () => null,
    IonPage: Container,
    IonContent: Container,
    IonCard: Container,
    IonCardContent: Container,
    IonLabel: Container,
    IonList: Container,
    IonModal: ({ children, isOpen }: PropsWithChildren<{ isOpen: boolean }>) =>
      isOpen ? <div>{children}</div> : null,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.search = '?edit=edit-1';
  mocks.invoice = {
    id: 'edit-1',
    customer: null,
    gst_amount: 0,
    discount_amount: 0,
    version: 3,
    held_at: '2026-10-12T10:00:00.000Z',
    held_by: '7',
    items: [
      {
        variant_id: 'variant-1',
        quantity: 1,
        unit_price: 100,
        discount_amount: 0,
        variant: { sku: 'RICE-1', product: { name: 'Rice' } },
      },
    ],
  };
  mocks.updateInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
  mocks.finalizeInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
  mocks.renewHeldBill.mockResolvedValue({ data: { id: 'edit-1', version: 3 } });
  mocks.cancelInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
  mocks.scanBarcode.mockResolvedValue(matchedBarcode);
});

afterEach(cleanup);

describe('BillingPage', () => {
  describe('held bill continuity', () => {
    it('opens the held-bill panel focused on a dashboard-linked bill', () => {
      mocks.search = '?held=held-9';

      render(<BillingPage />);

      expect(screen.getByText('held bills panel held-9')).toBeTruthy();
    });

    it('clears the editor after releasing the currently open held bill', async () => {
      mocks.search = '?edit=edit-1&held=edit-1';
      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'release current mock' }));

      expect(mocks.historyReplace).toHaveBeenCalledWith('/billing');
      expect(screen.queryByText('Rice')).toBeNull();
    });

    it('clears a previous customer when the next opened bill is walk-in', async () => {
      mocks.invoice = {
        ...mocks.invoice,
        customer: { id: '12', name: 'Anita', phone: '9999999999' },
      };
      const { rerender } = render(<BillingPage />);
      expect(await screen.findByText('Anita (9999999999)')).toBeTruthy();

      mocks.search = '?edit=edit-2';
      mocks.invoice = { ...mocks.invoice, id: 'edit-2', customer: null };
      rerender(<BillingPage />);

      expect(await screen.findByText('billing.walkInCustomer')).toBeTruthy();
      expect(screen.queryByText('Anita (9999999999)')).toBeNull();
    });

    it('holds a new bill with the saved counter and resets only after the server accepts it', async () => {
      mocks.search = '';
      let resolveHold: (value: { data: { id: string; version: number } }) => void = () => undefined;
      mocks.createInvoice.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveHold = resolve;
        })
      );
      vi.spyOn(window, 'prompt').mockReturnValue(' Counter 4 ');

      render(<BillingPage />);
      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));
      await screen.findByText('Tea');

      fireEvent.click(screen.getByRole('button', { name: 'billing.holdBill' }));

      await waitFor(() =>
        expect(mocks.createInvoice).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'DRAFT', counter_label: 'Counter 4' })
        )
      );
      expect(screen.getByText('Tea')).toBeTruthy();

      resolveHold({ data: { id: 'held-1', version: 0 } });
      await waitFor(() => expect(screen.queryByText('Tea')).toBeNull());
      expect(localStorage.getItem('kirana_counter_label')).toBe('Counter 4');
    });

    it('updates and finalizes a claimed bill using consecutive server versions', async () => {
      mocks.updateInvoice.mockResolvedValueOnce({ data: { id: 'edit-1', version: 4 } });
      mocks.createPayment.mockResolvedValueOnce({ data: { id: 'payment-1' } });

      render(<BillingPage />);
      await screen.findByText('Rice');
      fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));

      await waitFor(() =>
        expect(mocks.updateInvoice).toHaveBeenCalledWith({
          id: 'edit-1',
          data: expect.objectContaining({ expected_version: 3 }),
        })
      );
      expect(mocks.finalizeInvoice).toHaveBeenCalledWith({
        id: 'edit-1',
        expected_version: 4,
      });
    });

    it('preserves the cart and offers a reload when a held bill update conflicts', async () => {
      mocks.updateInvoice.mockRejectedValueOnce({ status: 409 });

      render(<BillingPage />);
      await screen.findByText('Rice');
      fireEvent.click(screen.getByRole('button', { name: 'billing.update' }));

      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(screen.getByText('Rice')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'billing.heldBills.reload' })).toBeTruthy();
    });

    it('keeps an updated held bill open so its active lease is not abandoned', async () => {
      mocks.updateInvoice.mockResolvedValueOnce({ data: { id: 'edit-1', version: 4 } });

      render(<BillingPage />);
      await screen.findByText('Rice');
      fireEvent.click(screen.getByRole('button', { name: 'billing.update' }));

      await waitFor(() =>
        expect(mocks.updateInvoice).toHaveBeenCalledWith({
          id: 'edit-1',
          data: expect.objectContaining({ expected_version: 3 }),
        })
      );
      expect(screen.getByText('Rice')).toBeTruthy();
      expect(mocks.historyReplace).not.toHaveBeenCalled();
      expect(mocks.notifySuccess).toHaveBeenCalledWith('billing.draftSaved');
    });

    it('ignores a stale heartbeat conflict after the local save advances the bill version', async () => {
      let rejectRenewal: (reason: unknown) => void = () => undefined;
      mocks.renewHeldBill.mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectRenewal = reject;
        })
      );
      mocks.updateInvoice.mockResolvedValueOnce({ data: { id: 'edit-1', version: 4 } });
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

      render(<BillingPage />);
      await screen.findByText('Rice');
      document.dispatchEvent(new Event('visibilitychange'));
      await waitFor(() => expect(mocks.renewHeldBill).toHaveBeenCalled());

      fireEvent.click(screen.getByRole('button', { name: 'billing.update' }));
      await waitFor(() => expect(mocks.updateInvoice).toHaveBeenCalled());
      rejectRenewal({ status: 409 });

      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    });
  });

  describe('barcode entry', () => {
    it('adds a locally matched product after a camera barcode scan', async () => {
      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));

      await waitFor(() => expect(mocks.scanBarcode).toHaveBeenCalledWith('8901234567890'));
      expect(await screen.findByText('Tea')).toBeTruthy();
    });

    it('keeps the bill open and explains an unknown barcode', async () => {
      mocks.scanBarcode.mockResolvedValueOnce({ success: true, found: false });

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));

      await waitFor(() =>
        expect(mocks.notifyError).toHaveBeenCalledWith('billing.barcodeNotFound')
      );
      expect(screen.getByText('Rice')).toBeTruthy();
    });

    it('accepts barcode input from a desktop counter scanner', async () => {
      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'foundation.barcode.barcode' }), {
        target: { value: '8901234567890' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

      await waitFor(() => expect(mocks.scanBarcode).toHaveBeenCalledWith('8901234567890'));
      expect(await screen.findByText('Tea')).toBeTruthy();
    });

    it('queues rapid scans and prevents checkout until all lookups finish', async () => {
      let resolveFirstLookup: (value: typeof matchedBarcode) => void = () => undefined;
      const firstLookup = new Promise<typeof matchedBarcode>((resolve) => {
        resolveFirstLookup = resolve;
      });
      mocks.scanBarcode.mockReturnValueOnce(firstLookup);

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      const cameraScan = screen.getByRole('button', { name: 'camera scan' });
      fireEvent.click(cameraScan);
      fireEvent.click(cameraScan);

      expect(
        (screen.getByRole('button', { name: 'billing.payCash' }) as HTMLButtonElement).disabled
      ).toBe(true);
      expect(mocks.scanBarcode).toHaveBeenCalledTimes(1);

      resolveFirstLookup(matchedBarcode);

      await waitFor(() => expect(mocks.scanBarcode).toHaveBeenCalledTimes(2));
      expect(await screen.findByDisplayValue(2)).toBeTruthy();
      await waitFor(() =>
        expect(
          (screen.getByRole('button', { name: 'billing.payCash' }) as HTMLButtonElement).disabled
        ).toBe(false)
      );
    });

    it('keeps the bill open when barcode lookup fails', async () => {
      mocks.scanBarcode.mockRejectedValueOnce(new Error('network unavailable'));

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));

      await waitFor(() =>
        expect(mocks.notifyError).toHaveBeenCalledWith('billing.barcodeLookupFailed')
      );
      expect(screen.getByText('Rice')).toBeTruthy();
    });

    it('continues with the next queued scan when the first lookup fails', async () => {
      let rejectFirstLookup: (reason?: unknown) => void = () => undefined;
      const firstLookup = new Promise<never>((_resolve, reject) => {
        rejectFirstLookup = reject;
      });
      mocks.scanBarcode.mockReturnValueOnce(firstLookup);

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      const cameraScan = screen.getByRole('button', { name: 'camera scan' });
      fireEvent.click(cameraScan);
      fireEvent.click(cameraScan);
      rejectFirstLookup(new Error('network unavailable'));

      await waitFor(() => expect(mocks.scanBarcode).toHaveBeenCalledTimes(2));
      expect(await screen.findByText('Tea')).toBeTruthy();
      expect(mocks.notifyError).toHaveBeenCalledWith('billing.barcodeLookupFailed');
    });

    it('rejects a barcode linked to an inactive product', async () => {
      mocks.scanBarcode.mockResolvedValueOnce({
        ...matchedBarcode,
        data: {
          ...matchedBarcode.data,
          product: { ...matchedBarcode.data.product, is_active: false },
        },
      });

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));

      await waitFor(() =>
        expect(mocks.notifyError).toHaveBeenCalledWith('billing.barcodeUnavailable')
      );
      expect(screen.queryByText('Tea')).toBeNull();
    });

    it('closes barcode tools when a completed bill resets', async () => {
      mocks.scanBarcode.mockResolvedValueOnce({ success: true, found: false });
      mocks.createPayment.mockResolvedValueOnce({ data: { id: 'payment-1' } });

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));
      await waitFor(() =>
        expect(mocks.notifyError).toHaveBeenCalledWith('billing.barcodeNotFound')
      );

      fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));

      await waitFor(() =>
        expect(screen.queryByRole('textbox', { name: 'foundation.barcode.barcode' })).toBeNull()
      );
    });
  });

  describe('checkout recovery', () => {
    it('opens recovery after quick payment fails and completes the same invoice on retry', async () => {
      mocks.createPayment
        .mockRejectedValueOnce(new Error('payment unavailable'))
        .mockResolvedValueOnce({ data: { id: 'payment-1' } });

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));

      await screen.findByLabelText('payment-recovery');
      expect(mocks.createPayment).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ invoice_id: 'edit-1', amount: 100, payment_mode: 'CASH' })
      );

      fireEvent.click(screen.getByRole('button', { name: 'retry payment' }));

      await waitFor(() => expect(mocks.createPayment).toHaveBeenCalledTimes(2));
      expect(mocks.createPayment).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ invoice_id: 'edit-1', amount: 100, payment_mode: 'CASH' })
      );
      await waitFor(() => expect(screen.queryByLabelText('payment-recovery')).toBeNull());
      expect(mocks.historyReplace).toHaveBeenCalledWith('/billing');
    });

    it('keeps recovery available after cancellation fails and clears the edit route after retry', async () => {
      mocks.createPayment.mockRejectedValueOnce(new Error('payment unavailable'));
      mocks.cancelInvoice
        .mockRejectedValueOnce(new Error('cancel unavailable'))
        .mockResolvedValueOnce({ data: { id: 'edit-1' } });

      render(<BillingPage />);
      await screen.findByText('Rice');
      fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));
      await screen.findByLabelText('payment-recovery');

      fireEvent.click(screen.getByRole('button', { name: 'cancel checkout' }));
      await waitFor(() => expect(mocks.cancelInvoice).toHaveBeenCalledTimes(1));
      expect(screen.getByLabelText('payment-recovery')).toBeTruthy();
      expect(mocks.historyReplace).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'cancel checkout' }));

      await waitFor(() => expect(mocks.cancelInvoice).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByLabelText('payment-recovery')).toBeNull());
      expect(mocks.historyReplace).toHaveBeenCalledWith('/billing');
    });
  });
});
