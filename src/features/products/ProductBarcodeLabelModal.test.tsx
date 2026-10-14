import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProductVariant } from '@core/types';
import { ProductBarcodeLabelModal } from './ProductBarcodeLabelModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number; value?: string; max?: number }) => {
      if (values?.count != null) return `${key}:${values.count}`;
      if (values?.value != null) return `${key}:${values.value}`;
      if (values?.max != null) return `${key}:${values.max}`;
      return key;
    },
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

vi.mock('@core/api/productApi', () => ({
  useGenerateStoreBarcodeMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock('./Ean13Barcode', () => ({
  Ean13Barcode: ({
    value,
    ariaLabel,
    showText,
  }: {
    value: string;
    ariaLabel: string;
    showText?: boolean;
  }) => (
    <div role="img" aria-label={ariaLabel} data-barcode-number={showText ? value : undefined} />
  ),
}));

vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonButton: ({
      children,
      onClick,
      disabled,
    }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    IonButtons: Container,
    IonContent: Container,
    IonHeader: Container,
    IonIcon: () => null,
    IonInput: ({
      'aria-label': ariaLabel,
      type,
      value,
      onIonInput,
    }: {
      'aria-label'?: string;
      type?: string;
      value: string;
      onIonInput: (event: { detail: { value: string } }) => void;
    }) => (
      <input
        aria-label={ariaLabel || 'products.labelCopies'}
        type={type === 'date' ? 'text' : type}
        data-input-type={type}
        value={value}
        onChange={(event) => onIonInput({ detail: { value: event.target.value } })}
      />
    ),
    IonItem: Container,
    IonLabel: Container,
    IonModal: ({
      children,
      isOpen,
      onWillDismiss,
    }: PropsWithChildren<{ isOpen: boolean; onWillDismiss?: () => void }>) =>
      isOpen ? (
        <div>
          <button aria-label="dismiss modal early" onClick={onWillDismiss} />
          {children}
        </div>
      ) : null,
    IonNote: Container,
    IonTitle: Container,
    IonToggle: ({
      children,
      checked,
      onIonChange,
    }: PropsWithChildren<{
      checked: boolean;
      onIonChange: (event: { detail: { checked: boolean } }) => void;
    }>) => (
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onIonChange({ detail: { checked: event.target.checked } })}
        />
        {children}
      </label>
    ),
    IonToolbar: Container,
  };
});

const variant: ProductVariant = {
  id: 'variant-1',
  product_id: 'product-1',
  brand: 'India Gate',
  size: '5 kg',
  packaging: 'PACKET',
  sku: 'RICE-5KG',
  price: 700,
  selling_price: 650,
  mrp_price: 700,
  is_active: true,
  barcodes: [{ id: 'barcode-1', barcode: '2001173897723', is_active: true }],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProductBarcodeLabelModal', () => {
  it('prints the shop identity, selling price, and differing MRP by default', () => {
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getAllByText('Rajesh Kirana Store').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹650').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/products\.mrpShort.*₹700/).length).toBeGreaterThan(0);
  });

  it('prints MRP whenever it differs from a higher selling price', () => {
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={{ ...variant, selling_price: 700, mrp_price: 650 }}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getAllByText(/products\.mrpShort.*₹650/).length).toBeGreaterThan(0);
  });

  it('does not present the generic variant price as MRP when MRP is unavailable', () => {
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={{ ...variant, mrp_price: undefined }}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.queryByText(/products\.mrpShort/)).toBeNull();
  });

  it('keeps 566 copies and creates all 27 pages only when printing', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('products.labelCopies'), { target: { value: '566' } });

    expect((screen.getByLabelText('products.labelCopies') as HTMLInputElement).value).toBe('566');
    expect(screen.getByText('products.barcodePageEstimate:27')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: /products.printBarcodeLabels:566/ })
        .hasAttribute('disabled')
    ).toBe(false);
    expect(document.querySelectorAll('.barcode-print-page')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /products.printBarcodeLabels:566/ }));

    expect(document.querySelectorAll('.barcode-print-page')).toHaveLength(27);
    expect(document.querySelectorAll('.barcode-print-sheet .product-barcode-label')).toHaveLength(
      566
    );
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    window.dispatchEvent(new Event('afterprint'));
  });

  it('accepts boundary copy counts and preserves invalid entries', () => {
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    const copies = screen.getByLabelText('products.labelCopies') as HTMLInputElement;
    const printButton = () => screen.getByRole('button', { name: /products.printBarcodeLabels/ });

    fireEvent.change(copies, { target: { value: '1000' } });
    expect(copies.value).toBe('1000');
    expect(screen.getByText('products.barcodePageEstimate:48')).toBeTruthy();
    expect(printButton().hasAttribute('disabled')).toBe(false);

    for (const invalidValue of ['0', '1001', '1.5', '']) {
      fireEvent.change(copies, { target: { value: invalidValue } });
      expect(copies.value).toBe(invalidValue);
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(printButton().hasAttribute('disabled')).toBe(true);
    }

    fireEvent.change(copies, { target: { value: '1' } });
    expect(screen.getByText('products.barcodePageEstimate:1')).toBeTruthy();
    expect(printButton().hasAttribute('disabled')).toBe(false);
  });

  it('applies hidden shop and price options to printed labels', () => {
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showShopNameOnLabel' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showPriceOnLabel' }));
    fireEvent.click(screen.getByRole('button', { name: /products.printBarcodeLabels:1/ }));

    const printSheet = document.querySelector('.barcode-print-sheet');
    expect(printSheet?.textContent).not.toContain('Rajesh Kirana Store');
    expect(printSheet?.textContent).not.toContain('₹650');
    expect(printSheet?.textContent).toContain('products.storePackedItem');
    window.dispatchEvent(new Event('afterprint'));
  });

  it('configures SKU, packed date, expiry date, and barcode number in preview and print', () => {
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showSkuOnLabel' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showPackedOnLabel' }));
    fireEvent.change(screen.getByLabelText('products.packedOnDate'), {
      target: { value: '2026-10-14' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showExpiryOnLabel' }));
    fireEvent.change(screen.getByLabelText('products.expiryDate'), {
      target: { value: '2027-04-14' },
    });
    fireEvent.click(screen.getByRole('button', { name: /products.printBarcodeLabels:1/ }));

    const preview = document.querySelector('.barcode-label-preview');
    const printSheet = document.querySelector('.barcode-print-sheet');
    for (const area of [preview, printSheet]) {
      expect(area?.textContent).toContain('products.barcodeSkuDetail:RICE-5KG');
      expect(area?.textContent).toContain('products.barcodePackedOnDetail:14 Oct 2026');
      expect(area?.textContent).toContain('products.barcodeExpiryDetail:14 Apr 2027');
      expect(area?.querySelector('[data-barcode-number="2001173897723"]')).toBeTruthy();
    }
    window.dispatchEvent(new Event('afterprint'));
  });

  it('blocks printing when expiry is earlier than the packed date', () => {
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showPackedOnLabel' }));
    fireEvent.change(screen.getByLabelText('products.packedOnDate'), {
      target: { value: '2026-10-14' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showExpiryOnLabel' }));
    fireEvent.change(screen.getByLabelText('products.expiryDate'), {
      target: { value: '2026-10-13' },
    });

    expect(screen.getByText('products.expiryBeforePackedOn')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /products.printBarcodeLabels:1/ }).hasAttribute('disabled')
    ).toBe(true);
  });

  it('requires enabled packed-on and expiry dates before printing', () => {
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    const printButton = () => screen.getByRole('button', { name: /products.printBarcodeLabels:1/ });

    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showPackedOnLabel' }));
    fireEvent.change(screen.getByLabelText('products.packedOnDate'), { target: { value: '' } });
    expect(screen.getByText('products.packedOnDateRequired')).toBeTruthy();
    expect(printButton().hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText('products.packedOnDate'), {
      target: { value: '2026-10-14' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showExpiryOnLabel' }));
    expect(screen.getByText('products.expiryDateRequired')).toBeTruthy();
    expect(printButton().hasAttribute('disabled')).toBe(true);
  });

  it('handles malformed enabled dates without crashing the preview', () => {
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showExpiryOnLabel' }));
    fireEvent.change(screen.getByLabelText('products.expiryDate'), {
      target: { value: '10000-12-31' },
    });

    expect(screen.getByText('products.expiryDateRequired')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /products.printBarcodeLabels:1/ }).hasAttribute('disabled')
    ).toBe(true);
  });

  it('lets optional label fields be hidden without removing the barcode graphic', () => {
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showMrpOnLabel' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showVariantOnLabel' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'products.showBarcodeNumberOnLabel' }));

    const preview = document.querySelector('.barcode-label-preview');
    expect(preview?.textContent).not.toContain('products.mrpShort');
    expect(preview?.textContent).not.toContain('India Gate · 5 kg · PACKET');
    const previewBarcode = within(preview as HTMLElement).getByRole('img', {
      name: 'products.barcodeAriaLabel:2001173897723',
    });
    expect(previewBarcode).toBeTruthy();
    expect(previewBarcode.hasAttribute('data-barcode-number')).toBe(false);
  });

  it('cancels a pending print when modal dismissal begins', () => {
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 42);
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame');
    render(
      <ProductBarcodeLabelModal
        isOpen
        shopName="Rajesh Kirana Store"
        productName="India Gate Basmati Rice"
        variant={variant}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /products.printBarcodeLabels:1/ }));
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'dismiss modal early' }));
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});
