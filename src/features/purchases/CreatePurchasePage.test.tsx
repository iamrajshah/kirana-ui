import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CreatePurchasePage from './CreatePurchasePage';

const state = vi.hoisted(() => ({
  createPurchase: vi.fn(() => ({ unwrap: () => Promise.resolve({ data: { id: '1' } }) })),
  suppliers: [
    {
      id: '7',
      name: 'Gemini Oils',
      phone: '9876543210',
      email: null,
      address: null,
      gstin: '27ABCDE1234F1Z5',
      state: 'Maharashtra',
      state_code: '27',
      default_purchase_firm_id: '2',
      default_purchase_firm: {
        id: '2', code: 'KJS', legal_name: 'KJS', display_name: 'KJS',
        is_active: true, is_default_sales: true,
      },
    },
  ] as Array<Record<string, unknown>>,
}));

afterEach(() => {
  cleanup();
  state.createPurchase.mockClear();
  vi.useRealTimers();
});

vi.mock('react-router', () => ({ useHistory: () => ({ push: vi.fn() }) }));
vi.mock('@core/hooks', () => ({ useAppSelector: () => ({ roles: ['OWNER'] }) }));
vi.mock('@core/auth/authSlice', () => ({
  selectCurrentUser: vi.fn(),
  selectCommercialAccess: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('../../core/api/supplierApi', () => ({
  useGetSuppliersQuery: () => ({ data: { data: state.suppliers } }),
}));
vi.mock('../../core/api/firmApi', () => ({
  useGetFirmsQuery: () => ({
    data: { data: { firms: [{ id: '2', code: 'KJS', legal_name: 'KJS', display_name: 'KJS', is_active: true, is_default_sales: true }] } },
    isLoading: false,
  }),
}));
vi.mock('../../core/api/purchaseApi', () => ({
  useCreatePurchaseMutation: () => [state.createPurchase, { isLoading: false }],
}));
vi.mock('../../core/api/productApi', () => ({
  useLazySearchVariantsQuery: () => [
    vi.fn(),
    {
      data: {
        data: [
          {
            id: '1',
            product_name: 'Salt',
            sku: 'SALT-1',
            price: 50,
            purchase_price: 40,
            gst_percent: 18,
            hsn_code: '2501',
          },
        ],
      },
      isLoading: false,
    },
  ],
}));
vi.mock('@core/services/notificationService', () => ({
  default: { warning: vi.fn(), success: vi.fn(), handleApiError: vi.fn() },
}));
vi.mock('@components', () => ({
  SearchBar: ({ onChange }: { onChange: (value: string) => void }) => (
    <button onClick={() => onChange('sa')}>search test product</button>
  ),
  Input: ({
    label,
    value,
    onChange,
    type,
  }: {
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
    type?: string;
  }) => (
    <input
      aria-label={label}
      type={type}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
  Button: ({
    children,
    onClick,
    disabled,
  }: PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
  }>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  EmptyState: () => null,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonContent: Container,
    IonButtons: Container,
    IonCard: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonCardContent: Container,
    IonList: Container,
    IonLabel: Container,
    IonText: Container,
    IonSelect: Container,
    IonSelectOption: Container,
    IonModal: Container,
    IonBadge: Container,
    IonIcon: () => null,
    IonButton: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
    IonItem: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
      <div role="button" tabIndex={0} onClick={onClick}>
        {children}
      </div>
    ),
  };
});
vi.mock('ionicons/icons', () => ({
  add: 'add',
  remove: 'remove',
  trash: 'trash',
  checkmarkCircle: 'checkmarkCircle',
}));

describe('CreatePurchasePage pending amount', () => {
  it('defaults the purchase invoice to the Kolkata calendar date before dawn', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T23:59:00.000Z')); // 04 Nov, 05:29 IST

    render(<CreatePurchasePage />);

    expect((screen.getByLabelText('purchases.invoiceDateLabel') as HTMLInputElement).value).toBe(
      '2026-11-04'
    );
  });

  it('uses a readable theme-aware notice instead of danger text on a danger background', () => {
    render(<CreatePurchasePage />);

    fireEvent.click(screen.getByRole('button', { name: 'search test product' }));
    fireEvent.click(screen.getByRole('button', { name: /Salt/ }));

    const notice = screen
      .getAllByRole('status')
      .find((element) => element.classList.contains('purchase-pending-notice')) as HTMLElement;
    expect(notice.classList.contains('purchase-pending-notice')).toBe(true);
    expect(notice.textContent).toContain('purchases.pendingAmount');
    expect(notice.querySelector('ion-text[color="danger"]')).toBeNull();
  });

  it('previews a box-to-stock conversion before the purchase is submitted', () => {
    render(<CreatePurchasePage />);

    fireEvent.click(screen.getByRole('button', { name: 'search test product' }));
    fireEvent.click(screen.getByRole('button', { name: /Salt/ }));
    fireEvent.change(screen.getByRole('combobox', { name: /Salt purchases.enteredAs/ }), {
      target: { value: 'PACK' },
    });

    expect(
      (screen.getByRole('spinbutton', { name: /Salt purchases.pricePerPack/ }) as HTMLInputElement)
        .value
    ).toBe('800');
    expect(screen.getByText(/purchases.packCostPreview/)).toBeTruthy();

    fireEvent.change(screen.getByRole('spinbutton', { name: /Salt purchases.unitsPerPack/ }), {
      target: { value: '12' },
    });

    expect(screen.getByText(/purchases.stockConversionPreview/)).toBeTruthy();
    expect(
      (screen.getByRole('spinbutton', { name: /Salt purchases.unitsPerPack/ }) as HTMLInputElement)
        .value
    ).toBe('12');
    expect(
      (screen.getByRole('spinbutton', { name: /Salt purchases.pricePerPack/ }) as HTMLInputElement)
        .value
    ).toBe('480');
  });

  it('reviews tax-inclusive and tax-exclusive totals using server paise rounding', () => {
    render(<CreatePurchasePage />);
    fireEvent.click(screen.getByRole('button', { name: 'search test product' }));
    fireEvent.click(screen.getByRole('button', { name: /Salt/ }));

    expect(screen.getByText(/purchases.totalAmount/).textContent).toContain('₹40');
    fireEvent.click(screen.getByRole('radio', { name: 'purchases.pricesExcludeTax' }));
    expect(screen.getByText(/purchases.totalAmount/).textContent).toContain('₹47.2');
  });

  it('submits explicit tax, HSN, supplier jurisdiction and price treatment', async () => {
    render(<CreatePurchasePage />);
    fireEvent.click(screen.getByRole('button', { name: 'purchases.selectSupplierButton' }));
    fireEvent.click(screen.getByRole('button', { name: /Gemini Oils/ }));
    fireEvent.change(screen.getByLabelText('purchases.invoiceNumberLabel'), {
      target: { value: 'GEM-101' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'search test product' }));
    fireEvent.click(screen.getByRole('button', { name: /Salt/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'purchases.pricesExcludeTax' }));
    fireEvent.click(screen.getByRole('button', { name: 'purchases.createPurchaseButton' }));

    await vi.waitFor(() => expect(state.createPurchase).toHaveBeenCalledTimes(1));
    expect(state.createPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        supplier_id: 7,
        firm_id: 2,
        invoice_number: 'GEM-101',
        prices_include_tax: false,
        place_of_supply_code: '27',
        items: [expect.objectContaining({ variant_id: 1, gst_rate: 18, hsn_code: '2501' })],
      })
    );
  });

  it('warns visibly when supplier state is incomplete', () => {
    state.suppliers = [{ ...state.suppliers[0], gstin: null, state: null, state_code: null }];
    render(<CreatePurchasePage />);
    fireEvent.click(screen.getByRole('button', { name: 'purchases.selectSupplierButton' }));
    fireEvent.click(screen.getByRole('button', { name: /Gemini Oils/ }));
    expect(screen.getByText('purchases.incompleteSupplierTaxIdentity')).toBeTruthy();
    state.suppliers = [{
      ...state.suppliers[0], gstin: '27ABCDE1234F1Z5', state: 'Maharashtra', state_code: '27',
    }];
  });
});
