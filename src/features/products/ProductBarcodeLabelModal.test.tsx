import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProductVariant } from '@core/types';
import { ProductBarcodeLabelModal } from './ProductBarcodeLabelModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number }) =>
      values?.count == null ? key : `${key}:${values.count}`,
  }),
}));

vi.mock('@core/api/productApi', () => ({
  useGenerateStoreBarcodeMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock('./Ean13Barcode', () => ({
  Ean13Barcode: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
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
      value,
      onIonInput,
    }: {
      value: string;
      onIonInput: (event: { detail: { value: string } }) => void;
    }) => (
      <input
        aria-label="products.labelCopies"
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
