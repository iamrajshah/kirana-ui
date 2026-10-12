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
  createPayment: vi.fn(),
  scanBarcode: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
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
  useLocation: () => ({ search: '?edit=edit-1' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@components/Navbar', () => ({ Navbar: () => null }));

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
  useGetInvoiceByIdQuery: () => ({
    data: {
      data: {
        id: 'edit-1',
        customer: null,
        gst_amount: 0,
        discount_amount: 0,
        items: [
          {
            variant_id: 'variant-1',
            quantity: 1,
            unit_price: 100,
            discount_amount: 0,
            variant: { sku: 'RICE-1', product: { name: 'Rice' } },
          },
        ],
      },
    },
    isLoading: false,
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
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
  mocks.finalizeInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
  mocks.cancelInvoice.mockResolvedValue({ data: { id: 'edit-1' } });
  mocks.scanBarcode.mockResolvedValue(matchedBarcode);
});

afterEach(cleanup);

describe('BillingPage', () => {
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
