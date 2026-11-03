import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PurchaseBillImportPage from './PurchaseBillImportPage';

const state = vi.hoisted(() => ({
  extract: vi.fn(),
  confirm: vi.fn(),
  getDraft: vi.fn(),
  replace: vi.fn(),
  expiryAccess: true,
  recoveryData: null as Record<string, unknown> | null,
  recoveryError: false,
}));

vi.mock('react-router-dom', () => ({
  useHistory: () => ({ replace: state.replace }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@core/auth/authSlice', () => ({
  selectCurrentUser: 'current-user-selector',
  selectCommercialAccess: 'commercial-selector',
}));
vi.mock('@core/hooks', () => ({
  useAppSelector: (selector: string) =>
    selector === 'current-user-selector'
      ? { id: 'user-1', roles: ['OWNER'], tenant: { id: 'tenant-1' } }
      : { status: 'ACTIVE' },
}));
vi.mock('@core/commercial/commercialAccess', () => ({
  canUseCommercialFeature: () => state.expiryAccess,
}));
vi.mock('@core/api/purchaseImportApi', () => ({
  useExtractPurchaseBillMutation: () => [state.extract, { isLoading: false }],
  useConfirmPurchaseImportMutation: () => [state.confirm, { isLoading: false }],
  useGetPurchaseImportDraftQuery: (draftId: string, options: { skip: boolean }) => {
    state.getDraft(draftId, options);
    return {
      data: state.recoveryData ? { data: state.recoveryData } : undefined,
      isFetching: false,
      isError: state.recoveryError,
    };
  },
}));
vi.mock('@core/api/supplierApi', () => ({
  useGetSuppliersQuery: () => ({
    data: {
      data: [
        {
          id: '7',
          name: 'Gemini Oils',
          is_active: true,
          default_purchase_firm_id: '3',
        },
      ],
    },
  }),
}));
vi.mock('@core/api/firmApi', () => ({
  useGetFirmsQuery: () => ({
    data: {
      data: {
        firms: [
          {
            id: '3',
            display_name: 'Jitendra Trading',
            is_default_sales: true,
            is_active: true,
          },
        ],
      },
    },
  }),
}));
vi.mock('@core/api/productApi', () => ({
  useLazySearchVariantsQuery: () => [
    vi.fn(),
    {
      data: {
        data: [
          {
            id: '42',
            product_name: 'Sugar 1 kg',
            sku: 'SUGAR-1KG',
            gst_percent: 5,
            hsn_code: '1701',
          },
        ],
      },
      isFetching: false,
    },
  ],
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonBadge: Container,
    IonIcon: Container,
    IonProgressBar: Container,
    IonSpinner: Container,
    IonSelect: ({
      children,
      value,
      onIonChange,
    }: PropsWithChildren<{
      value?: string;
      onIonChange?: (event: { detail: { value: string } }) => void;
    }>) => (
      <select
        value={value}
        onChange={(event) => onIonChange?.({ detail: { value: event.target.value } })}
      >
        {children}
      </select>
    ),
    IonSelectOption: ({ children, value }: PropsWithChildren<{ value?: string }>) => (
      <option value={value}>{children}</option>
    ),
    IonButton: ({
      children,
      onClick,
      disabled,
    }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
  };
});

afterEach(() => {
  cleanup();
  state.extract.mockReset();
  state.confirm.mockReset();
  state.getDraft.mockReset();
  state.replace.mockReset();
  state.expiryAccess = true;
  state.recoveryData = null;
  state.recoveryError = false;
  sessionStorage.clear();
  window.history.replaceState({}, '', '/purchases/import-bill');
});

it('keeps an extracted bill read-only until the user explicitly confirms the review', async () => {
  state.extract.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: {
          draftId: 'draft-1',
          status: 'READY',
          supplier: { id: '7', name: 'Gemini Oils' },
          invoiceNumber: 'GEM-44',
          invoiceDate: '2026-11-04',
          subtotal: 2666.67,
          taxAmount: 133.33,
          totalAmount: 2800,
          warnings: [],
          items: [
            {
              lineId: 'line-1',
              variantId: '19',
              productName: 'Gemini Oil 1 L',
              sku: 'GEM-OIL-1L',
              quantity: 2,
              unitPrice: 1400,
              gstRate: 5,
              confidence: 0.93,
            },
          ],
        },
      }),
  });
  state.confirm.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: { draftId: 'draft-1', status: 'CONFIRMED', purchase: { id: '88' } },
      }),
  });

  const { container } = render(<PurchaseBillImportPage />);
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
  const invoice = new File(['supplier invoice'], 'invoice.pdf', {
    type: 'application/pdf',
  });
  fireEvent.change(inputs[1], { target: { files: [invoice] } });

  expect(await screen.findByText('Gemini Oil 1 L')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('purchaseImport.purchaseMode'), {
    target: { value: 'PACK' },
  });
  expect(screen.getByText('purchaseImport.stockUnits')).toBeTruthy();
  const confirmButton = screen.getByRole('button', {
    name: 'purchaseImport.confirmPurchase',
  });
  expect(confirmButton.hasAttribute('disabled')).toBe(true);
  expect(state.confirm).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('checkbox'));
  expect(confirmButton.hasAttribute('disabled')).toBe(false);
  fireEvent.click(confirmButton);

  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
  expect(state.confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      draftId: 'draft-1',
      supplier_id: 7,
      firm_id: 3,
      invoice_number: 'GEM-44',
      items: [
        expect.objectContaining({
          variant_id: 19,
          quantity: 2,
          unit_price: 1400,
          gst_rate: 5,
          units_per_purchase_unit: 20,
          purchase_unit_label: 'Box',
        }),
      ],
      prices_include_tax: true,
      acknowledge_total_mismatch: false,
    })
  );
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/purchases/88'));
});

it('rejects documents larger than the server five-megabyte limit before upload', async () => {
  const { container } = render(<PurchaseBillImportPage />);
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
  const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf', {
    type: 'application/pdf',
  });

  fireEvent.change(inputs[1], { target: { files: [oversized] } });

  expect((await screen.findByRole('alert')).textContent).toContain('purchaseImport.fileTooLarge');
  expect(state.extract).not.toHaveBeenCalled();
});

it('blocks confirmation until a material supplier-total mismatch is acknowledged', async () => {
  state.extract.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: {
          draftId: 'draft-mismatch',
          status: 'NEEDS_REVIEW',
          supplier: { id: '7', name: 'Gemini Oils' },
          invoiceNumber: 'GEM-45',
          invoiceDate: '2026-11-04',
          subtotal: 80,
          taxAmount: 0,
          totalAmount: 80,
          warnings: [],
          items: [
            {
              lineId: 'line-1',
              variantId: '19',
              productName: 'Gemini Oil 1 L',
              quantity: 1,
              unitPrice: 100,
              gstRate: 0,
            },
          ],
        },
      }),
  });
  state.confirm.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: { draftId: 'draft-mismatch', status: 'CONFIRMED', purchase: { id: '90' } },
      }),
  });

  const { container } = render(<PurchaseBillImportPage />);
  const invoice = new File(['supplier invoice'], 'invoice.pdf', { type: 'application/pdf' });
  fireEvent.change(container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1], {
    target: { files: [invoice] },
  });

  expect(await screen.findByText('purchaseImport.materialMismatch')).toBeTruthy();
  const confirmButton = screen.getByRole('button', { name: 'purchaseImport.confirmPurchase' });
  const confirmations = screen.getAllByRole('checkbox');
  fireEvent.click(confirmations[1]);
  expect(confirmButton.hasAttribute('disabled')).toBe(true);
  fireEvent.click(confirmations[0]);
  expect(confirmButton.hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'purchaseImport.addItem' }));
  expect((confirmations[0] as HTMLInputElement).checked).toBe(false);
  const removeButtons = screen.getAllByRole('button', { name: 'purchaseImport.removeItem' });
  fireEvent.click(removeButtons[removeButtons.length - 1]);
  fireEvent.click(screen.getByLabelText('purchaseImport.confirmMismatch'));
  fireEvent.click(screen.getByLabelText('purchaseImport.confirmReview'));
  fireEvent.click(confirmButton);
  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
  expect(state.confirm).toHaveBeenCalledWith(
    expect.objectContaining({ acknowledge_total_mismatch: true })
  );
});

it('does not expose or submit expiry data without separate expiry entitlement', async () => {
  state.expiryAccess = false;
  state.extract.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: {
          draftId: 'draft-no-expiry',
          status: 'READY',
          supplier: { id: '7', name: 'Gemini Oils' },
          invoiceNumber: 'GEM-46',
          invoiceDate: '2026-11-04',
          subtotal: 100,
          taxAmount: 0,
          totalAmount: 100,
          warnings: [],
          items: [
            {
              lineId: 'line-1',
              variantId: '19',
              productName: 'Gemini Oil 1 L',
              quantity: 1,
              unitPrice: 100,
              batchNumber: 'LOT-1',
              expiryDate: '2027-11-04',
            },
          ],
        },
      }),
  });
  state.confirm.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: { draftId: 'draft-no-expiry', status: 'CONFIRMED', purchase: { id: '89' } },
      }),
  });

  const { container } = render(<PurchaseBillImportPage />);
  const invoice = new File(['supplier invoice'], 'invoice.pdf', { type: 'application/pdf' });
  fireEvent.change(container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1], {
    target: { files: [invoice] },
  });

  expect(await screen.findByText('Gemini Oil 1 L')).toBeTruthy();
  expect(screen.queryByLabelText('expiry.batch')).toBeNull();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'purchaseImport.confirmPurchase' }));
  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
  const payload = state.confirm.mock.calls[0][0];
  expect(payload.items[0]).not.toHaveProperty('batch_number');
  expect(payload.items[0]).not.toHaveProperty('expiry_date');
});

it('recovers from zero, spurious and missed OCR lines with explicit add and remove controls', async () => {
  state.extract.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: {
          draftId: 'draft-manual-lines',
          status: 'NEEDS_REVIEW',
          supplier: { id: '7', name: 'Gemini Oils' },
          invoiceNumber: 'GEM-47',
          invoiceDate: '2026-11-04',
          subtotal: 100,
          taxAmount: 0,
          totalAmount: 100,
          warnings: ['One line could not be recognised'],
          items: [
            {
              lineId: 'spurious-line',
              productName: 'OCR noise',
              quantity: 1,
              unitPrice: 100,
            },
          ],
        },
      }),
  });
  state.confirm.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: { draftId: 'draft-manual-lines', status: 'CONFIRMED', purchase: { id: '91' } },
      }),
  });

  const { container } = render(<PurchaseBillImportPage />);
  const invoice = new File(['supplier invoice'], 'invoice.pdf', { type: 'application/pdf' });
  fireEvent.change(container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1], {
    target: { files: [invoice] },
  });

  expect(await screen.findByText('OCR noise')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'purchaseImport.removeItem' }));
  expect(screen.getByText('purchaseImport.noItems')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'purchaseImport.addItem' }));
  fireEvent.click(screen.getByRole('button', { name: /Sugar 1 kg/ }));
  fireEvent.change(screen.getByLabelText('purchases.unitPrice'), { target: { value: '100' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'purchaseImport.confirmPurchase' }));

  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
  expect(state.confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      items: [
        expect.objectContaining({
          variant_id: 42,
          quantity: 1,
          unit_price: 100,
          gst_rate: 5,
          hsn_code: '1701',
        }),
      ],
    })
  );
});

it('restores tenant-scoped reviewed edits after refresh and safely retries a lost confirmation', async () => {
  const recoveryKey = 'kirana.purchase-import-draft:tenant-1:user-1';
  const storedDraft = {
    draftId: 'draft-retry',
    status: 'READY',
    supplier: { id: '7', name: 'Gemini Oils' },
    invoiceNumber: 'GEM-48',
    invoiceDate: '2026-11-04',
    subtotal: 125,
    taxAmount: 0,
    totalAmount: 125,
    warnings: [],
    items: [
      {
        lineId: 'line-1',
        variantId: '19',
        productName: 'Gemini Oil 1 L',
        quantity: 1,
        unitPrice: 125,
        gstRate: 0,
        purchaseMode: 'UNIT',
        purchaseUnitLabel: 'Box',
        unitsPerPurchaseUnit: 20,
      },
    ],
  };
  sessionStorage.setItem(
    recoveryKey,
    JSON.stringify({
      version: 1,
      draft: storedDraft,
      selectedSupplierId: '7',
      selectedFirmId: '3',
      firmWasOverridden: false,
      pricesIncludeTax: true,
      paymentAmount: '0',
      paymentMode: 'CASH',
    })
  );
  window.history.replaceState({}, '', '/purchases/import-bill?draftId=draft-retry');
  state.recoveryData = {
    ...storedDraft,
    status: 'CONFIRMED',
    subtotal: 100,
    totalAmount: 100,
    items: [{ ...storedDraft.items[0], unitPrice: 100 }],
  };
  state.confirm.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: { draftId: 'draft-retry', status: 'CONFIRMED', purchase: { id: '92' } },
      }),
  });

  render(<PurchaseBillImportPage />);

  expect(await screen.findByText('purchaseImport.confirmRetryHeading')).toBeTruthy();
  expect(state.getDraft).toHaveBeenCalledWith('draft-retry', { skip: false });
  expect((screen.getByLabelText('purchases.unitPrice') as HTMLInputElement).value).toBe('125');
  const review = screen.getByLabelText('purchaseImport.confirmReview') as HTMLInputElement;
  expect(review.checked).toBe(false);

  fireEvent.click(review);
  fireEvent.click(screen.getByRole('button', { name: 'purchaseImport.confirmPurchase' }));

  await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
  expect(state.confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      draftId: 'draft-retry',
      items: [expect.objectContaining({ variant_id: 19, unit_price: 125 })],
    })
  );
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/purchases/92'));
  expect(sessionStorage.getItem(recoveryKey)).toBeNull();
});

it('keeps the recovery draft after an uncertain confirmation failure', async () => {
  state.extract.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: {
          draftId: 'draft-uncertain',
          status: 'READY',
          supplier: { id: '7', name: 'Gemini Oils' },
          invoiceNumber: 'GEM-49',
          invoiceDate: '2026-11-04',
          subtotal: 100,
          taxAmount: 0,
          totalAmount: 100,
          warnings: [],
          items: [
            {
              lineId: 'line-1',
              variantId: '19',
              productName: 'Gemini Oil 1 L',
              quantity: 1,
              unitPrice: 100,
              gstRate: 0,
            },
          ],
        },
      }),
  });
  state.confirm.mockReturnValue({ unwrap: () => Promise.reject(new Error('connection lost')) });

  const { container } = render(<PurchaseBillImportPage />);
  const invoice = new File(['supplier invoice'], 'invoice.pdf', { type: 'application/pdf' });
  fireEvent.change(container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1], {
    target: { files: [invoice] },
  });
  expect(await screen.findByText('Gemini Oil 1 L')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('purchaseImport.confirmReview'));
  fireEvent.click(screen.getByRole('button', { name: 'purchaseImport.confirmPurchase' }));

  expect(await screen.findByText('purchaseImport.confirmRetryHeading')).toBeTruthy();
  await waitFor(() => {
    const saved = sessionStorage.getItem('kirana.purchase-import-draft:tenant-1:user-1');
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved ?? '{}').draft.draftId).toBe('draft-uncertain');
  });
});
