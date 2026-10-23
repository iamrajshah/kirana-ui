import React, { type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingPage } from './BillingPage';

const mocks = vi.hoisted(() => ({
  historyReplace: vi.fn(),
  historyPush: vi.fn(),
  createInvoice: vi.fn(),
  quoteInvoice: vi.fn(),
  quoteTrigger: vi.fn(),
  cancelInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  finalizeInvoice: vi.fn(),
  renewHeldBill: vi.fn(),
  createPayment: vi.fn(),
  scanBarcode: vi.fn(),
  createProductFromBarcode: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  user: { id: '7', name: 'Rajesh', roles: ['CASHIER'], tenant: { id: '1' } } as {
    id: string;
    name: string;
    roles: string[];
    tenant: { id: string };
  },
  search: '?edit=edit-1',
  invoice: {} as Record<string, unknown>,
  document: null as Record<string, unknown> | null,
  documentError: false,
  refetchDocument: vi.fn(),
  settingsMode: 'SIMPLE_RECEIPT' as 'SIMPLE_RECEIPT' | 'GST_TAX_INVOICE',
  settingsLoading: false,
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
  useHistory: () => ({ replace: mocks.historyReplace, push: mocks.historyPush }),
  useLocation: () => ({ search: mocks.search }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { product?: string }) =>
      options?.product ? `${key} ${options.product}` : key,
  }),
}));

vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/hooks', () => ({
  useAppSelector: () => mocks.user,
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
  useQuoteInvoiceMutation: () => [mocks.quoteTrigger, { isLoading: false }],
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
  useGetFinalizedDocumentQuery: () => ({
    data: mocks.document ? { success: true, data: mocks.document } : undefined,
    isLoading: false,
    isError: mocks.documentError,
    refetch: mocks.refetchDocument,
  }),
}));

vi.mock('@core/api/tenantSettingsApi', () => ({
  useGetTenantSettingsQuery: () => ({
    isLoading: mocks.settingsLoading,
    data: {
      data: {
        document_mode: mocks.settingsMode,
        state_code: '27',
        default_paper_width: 'MM80',
        capabilities: { receipt_documents_enabled: true },
      },
    },
  }),
}));

vi.mock('@core/api/paymentApi', () => ({
  useCreatePaymentMutation: () => [apiTrigger(mocks.createPayment), { isLoading: false }],
}));

vi.mock('@core/api/customerApi', () => ({
  useGetCustomersQuery: () => ({ data: { data: [] }, isLoading: false, isFetching: false }),
}));

vi.mock('@core/api/productApi', () => ({
  useGetBillingCatalogQuery: () => ({ data: { data: [] }, isLoading: false, isFetching: false }),
  useLazyScanBarcodeQuery: () => [apiTrigger(mocks.scanBarcode), { isFetching: false }],
  useCreateProductFromBarcodeMutation: () => [
    apiTrigger(mocks.createProductFromBarcode),
    { isLoading: false },
  ],
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
  barcodeOutline: 'barcodeOutline',
  close: 'close',
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
  mocks.quoteTrigger.mockImplementation((payload: unknown) => ({
    unwrap: () => mocks.quoteInvoice(payload),
  }));
  localStorage.clear();
  mocks.search = '?edit=edit-1';
  mocks.document = null;
  mocks.documentError = false;
  mocks.settingsMode = 'SIMPLE_RECEIPT';
  mocks.settingsLoading = false;
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
  mocks.user = { id: '7', name: 'Rajesh', roles: ['CASHIER'], tenant: { id: '1' } };
  mocks.createProductFromBarcode.mockResolvedValue({
    data: {
      barcode: { id: 'barcode-9', barcode: '8901234567890', is_active: true },
      product: { id: 'product-9', name: 'Tata Salt 1 kg', is_active: true },
      variant: {
        id: 'variant-9',
        product_id: 'product-9',
        sku: null,
        mrp_price: 28,
        selling_price: 28,
        price: 28,
        is_active: true,
      },
      inventory: { variant_id: 'variant-9', quantity: 10, low_stock_threshold: 5 },
    },
  });
  mocks.quoteInvoice.mockResolvedValue({
    data: {
      fingerprint: 'a'.repeat(64),
      document_mode: 'SIMPLE_RECEIPT',
      settings_version: 1,
      subtotal_amount: '100.00',
      item_discount_amount: '0.00',
      bill_discount_amount: '0.00',
      discount_amount: '0.00',
      taxable_amount: '100.00',
      cgst_amount: '0.00',
      sgst_amount: '0.00',
      igst_amount: '0.00',
      gst_amount: '0.00',
      total_amount: '100.00',
      lines: [],
    },
  });
});

afterEach(cleanup);

describe('BillingPage', () => {
  describe('quote refresh', () => {
    it('keeps simple-receipt quantity edits local until checkout', async () => {
      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } });
      await new Promise((resolve) => window.setTimeout(resolve, 350));

      expect(mocks.quoteInvoice).not.toHaveBeenCalled();
    });

    it('refreshes the authoritative quote after a GST quantity edit', async () => {
      mocks.settingsMode = 'GST_TAX_INVOICE';
      render(<BillingPage />);
      await screen.findByText('Rice');
      await waitFor(() => expect(mocks.quoteInvoice).toHaveBeenCalled());
      mocks.quoteInvoice.mockClear();

      fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } });

      await waitFor(() =>
        expect(mocks.quoteInvoice).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [expect.objectContaining({ quantity: 2 })],
          })
        )
      );
    });
  });

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

    it('asks for the counter inside the app before holding a new bill', async () => {
      mocks.search = '';
      let resolveHold: (value: { data: { id: string; version: number } }) => void = () => undefined;
      mocks.createInvoice.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveHold = resolve;
        })
      );
      render(<BillingPage />);
      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));
      await screen.findByText('Tea');

      fireEvent.click(screen.getByRole('button', { name: 'billing.holdBill' }));

      fireEvent.change(screen.getByRole('textbox', { name: 'billing.heldBills.counterPrompt' }), {
        target: { value: ' Counter 4 ' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

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

    it('finalizes a named-customer bill as unpaid without recording a payment', async () => {
      mocks.invoice = {
        ...mocks.invoice,
        customer: { id: '12', name: 'Anita', phone: '9999999999' },
      };
      mocks.updateInvoice.mockResolvedValueOnce({ data: { id: 'edit-1', version: 4 } });

      render(<BillingPage />);
      await screen.findByText('Anita (9999999999)');
      fireEvent.click(screen.getByRole('button', { name: 'billing.payLater' }));

      await waitFor(() =>
        expect(mocks.finalizeInvoice).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'edit-1', expected_version: 4 })
        )
      );
      expect(mocks.createPayment).not.toHaveBeenCalled();
      expect(mocks.notifySuccess).toHaveBeenCalledWith('billing.creditBillCreated');
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
      expect(mocks.finalizeInvoice).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'edit-1', expected_version: 4 })
      );
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
    it('prevents quantity edits from exceeding the scanned product stock', async () => {
      mocks.scanBarcode.mockResolvedValueOnce({
        ...matchedBarcode,
        data: {
          ...matchedBarcode.data,
          inventory: { ...matchedBarcode.data.inventory, quantity: 2 },
        },
      });

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));

      await screen.findByText('Tea');
      const quantity = screen.getByRole('spinbutton', { name: 'billing.quantityFor Tea' });

      fireEvent.change(quantity, { target: { value: '3' } });

      expect((quantity as HTMLInputElement).value).toBe('2');
      expect(screen.getByText('billing.stockLimit')).toBeTruthy();
      expect(
        (
          screen.getByRole('button', {
            name: 'billing.increaseQuantity Tea',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true);
    });

    it('adds a locally matched product after a camera barcode scan', async () => {
      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));

      await waitFor(() => expect(mocks.scanBarcode).toHaveBeenCalledWith('8901234567890'));
      expect(await screen.findByText('Tea')).toBeTruthy();
    });

    it('keeps the cashier bill open and asks for manager help for an unknown barcode', async () => {
      mocks.scanBarcode.mockResolvedValueOnce({ success: true, found: false });

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));

      expect(await screen.findByText('billing.unknownBarcode.managerRequired')).toBeTruthy();
      expect(screen.getByText('8901234567890')).toBeTruthy();
      expect(screen.getByText('Rice')).toBeTruthy();
      expect(mocks.createProductFromBarcode).not.toHaveBeenCalled();
    });

    it('lets an owner save an unknown product and adds it to the current bill', async () => {
      mocks.user = { id: '7', name: 'Rajesh', roles: ['OWNER'], tenant: { id: '1' } };
      mocks.scanBarcode.mockResolvedValueOnce({ success: true, found: false });

      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.scanBarcode' }));
      fireEvent.click(screen.getByRole('button', { name: 'camera scan' }));

      fireEvent.change(await screen.findByLabelText('billing.unknownBarcode.productName'), {
        target: { value: 'Tata Salt 1 kg' },
      });
      fireEvent.change(screen.getByLabelText('billing.unknownBarcode.sellingPrice'), {
        target: { value: '28' },
      });
      fireEvent.change(screen.getByLabelText('billing.unknownBarcode.openingStock'), {
        target: { value: '10' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'billing.unknownBarcode.createAndAdd' }));

      await waitFor(() =>
        expect(mocks.createProductFromBarcode).toHaveBeenCalledWith({
          barcode: '8901234567890',
          productMaster: { name: 'Tata Salt 1 kg' },
          product: { name: 'Tata Salt 1 kg' },
          variant: { mrp: 28, sellingPrice: 28 },
          inventory: { quantity: 10 },
        })
      );
      expect(await screen.findByText('Tata Salt 1 kg')).toBeTruthy();
      expect(mocks.notifySuccess).toHaveBeenCalledWith('billing.unknownBarcode.createdAndAdded');
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
      await screen.findByText('billing.unknownBarcode.managerRequired');

      fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));

      await waitFor(() =>
        expect(screen.queryByRole('textbox', { name: 'foundation.barcode.barcode' })).toBeNull()
      );
    });
  });

  describe('checkout recovery', () => {
    it('blocks checkout until tenant document settings are known', async () => {
      mocks.settingsLoading = true;
      render(<BillingPage />);
      await screen.findByText('Rice');

      expect(
        (screen.getByRole('button', { name: 'billing.payCash' }) as HTMLButtonElement).disabled
      ).toBe(true);
      expect(mocks.finalizeInvoice).not.toHaveBeenCalled();
    });

    it('keeps the finalized invoice as a completion state until New Sale', async () => {
      mocks.createPayment.mockResolvedValueOnce({ data: { id: 'payment-1' } });
      mocks.document = {
        kind: 'FINALIZED_DOCUMENT',
        invoice_id: 'edit-1',
        invoice_number: 'KIR-1',
        issued_at: '2026-10-15T10:00:00.000Z',
        document_mode: 'SIMPLE_RECEIPT',
        legacy: false,
        cancellation: { cancelled: false, marker: null },
        supplier: {
          name: 'Rajesh Kirana',
          phone: null,
          address: null,
          state: null,
          state_code: null,
          gstin: null,
        },
        customer: null,
        place_of_supply: null,
        totals: {
          subtotal_amount: '100.00',
          item_discount_amount: '0.00',
          bill_discount_amount: '0.00',
          discount_amount: '0.00',
          gst_amount: '0.00',
          total_amount: '100.00',
        },
        items: [],
        footer: null,
        payment: {
          status: 'PAID',
          paid_amount: '100.00',
          remaining_amount: '0.00',
          modes: ['CASH'],
          last_allocation_at: null,
          as_of: '2026-10-15T10:01:00.000Z',
          allocations: [],
        },
      };

      render(<BillingPage />);
      await screen.findByText('Rice');
      fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));

      expect(await screen.findByText('billing.completion.title')).toBeTruthy();
      expect(
        JSON.parse(localStorage.getItem('kirana_billing_completion_invoice') || '{}')
      ).toMatchObject({ invoiceId: 'edit-1', userId: '7', tenantId: '1' });
      expect(screen.queryByText('Rice')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'billing.completion.newSale' }));
      expect(localStorage.getItem('kirana_billing_completion_invoice')).toBeNull();
      expect(screen.queryByText('billing.completion.title')).toBeNull();
      expect(mocks.historyReplace).toHaveBeenLastCalledWith('/billing');
    });

    it('restores a saved completion by invoice identity and retries only the document read', () => {
      localStorage.setItem(
        'kirana_billing_completion_invoice',
        JSON.stringify({ version: 1, invoiceId: '42', userId: '7', tenantId: '1' })
      );
      mocks.documentError = true;
      mocks.search = '';

      render(<BillingPage />);

      fireEvent.click(screen.getByRole('button', { name: 'billing.completion.retryBill' }));
      expect(mocks.refetchDocument).toHaveBeenCalledOnce();
      expect(mocks.createInvoice).not.toHaveBeenCalled();
      expect(mocks.createPayment).not.toHaveBeenCalled();
    });

    it('does not replace the active billing route while presenting payment completion', async () => {
      mocks.search = '';
      localStorage.setItem(
        'kirana_billing_pending_checkout',
        JSON.stringify({
          version: 1,
          invoiceId: '42',
          payable: 100,
          customerId: null,
          paymentIdempotencyKey: 'payment-key',
          userId: '7',
          tenantId: '1',
        })
      );
      mocks.createPayment.mockResolvedValueOnce({ data: { id: 'payment-1' } });

      render(<BillingPage />);
      fireEvent.click(screen.getByRole('button', { name: 'retry payment' }));

      expect(await screen.findByText('billing.completion.title')).toBeTruthy();
      expect(mocks.historyReplace).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('payment-recovery')).toBeNull();
    });

    it('uses an authoritative quote before finalization and payment', async () => {
      mocks.createPayment.mockResolvedValueOnce({ data: { id: 'payment-1' } });
      render(<BillingPage />);
      await screen.findByText('Rice');

      fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));

      await waitFor(() => expect(mocks.finalizeInvoice).toHaveBeenCalled());
      expect(mocks.quoteInvoice).toHaveBeenCalledOnce();
      expect(mocks.finalizeInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'edit-1',
          quote_fingerprint: 'a'.repeat(64),
          quoted_payable: '100.00',
        })
      );
      expect(mocks.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100, invoice_id: 'edit-1' })
      );
    });

    it('returns a GST bill to review when the authoritative quote changes', async () => {
      mocks.settingsMode = 'GST_TAX_INVOICE';
      const quote = (fingerprint: string, total: string) => ({
        data: {
          fingerprint,
          document_mode: 'GST_TAX_INVOICE',
          settings_version: 1,
          subtotal_amount: '100.00',
          item_discount_amount: '0.00',
          bill_discount_amount: '0.00',
          discount_amount: '0.00',
          taxable_amount: '100.00',
          cgst_amount: '9.00',
          sgst_amount: '9.00',
          igst_amount: '0.00',
          gst_amount: '18.00',
          total_amount: total,
          lines: [],
        },
      });
      mocks.quoteInvoice.mockResolvedValue(quote('a'.repeat(64), '118.00'));

      render(<BillingPage />);
      await screen.findByText('Rice');
      await waitFor(() =>
        expect(
          (screen.getByRole('button', { name: 'billing.payCash' }) as HTMLButtonElement).disabled
        ).toBe(false)
      );

      mocks.quoteInvoice.mockResolvedValue(quote('b'.repeat(64), '119.00'));
      fireEvent.click(screen.getByRole('button', { name: 'billing.payCash' }));

      await waitFor(() => expect(mocks.quoteInvoice).toHaveBeenCalledTimes(2));
      expect(mocks.finalizeInvoice).not.toHaveBeenCalled();
      expect(mocks.createPayment).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(mocks.notifyError).toHaveBeenCalledWith('billing.quoteChangedReview')
      );
    });

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
      expect(
        JSON.parse(localStorage.getItem('kirana_billing_pending_checkout') || '{}')
      ).toMatchObject({ invoiceId: 'edit-1', payable: 100, userId: '7' });

      fireEvent.click(screen.getByRole('button', { name: 'retry payment' }));

      await waitFor(() => expect(mocks.createPayment).toHaveBeenCalledTimes(2));
      expect(mocks.createPayment).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ invoice_id: 'edit-1', amount: 100, payment_mode: 'CASH' })
      );
      expect(mocks.createPayment.mock.calls[1][0].idempotency_key).toBe(
        mocks.createPayment.mock.calls[0][0].idempotency_key
      );
      await waitFor(() => expect(screen.queryByLabelText('payment-recovery')).toBeNull());
      expect(localStorage.getItem('kirana_billing_pending_checkout')).toBeNull();
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
