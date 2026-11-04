import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddProductBarcodePage } from './AddProductBarcodePage';

const state = vi.hoisted(() => ({
  lookupBarcode: vi.fn(),
  createProduct: vi.fn(),
  goBack: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({
  useHistory: () => ({ push: vi.fn(), goBack: state.goBack }),
}));
vi.mock('@core/api/productApi', () => ({
  useLazyLookupBarcodeQuery: () => [state.lookupBarcode, { isLoading: false }],
  useCreateProductFromBarcodeMutation: () => [state.createProduct, { isLoading: false }],
}));
vi.mock('@core/api/categoryApi', () => ({ useGetCategoriesQuery: () => ({ data: { data: [] } }) }));
vi.mock('@components', () => ({
  Input: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  Select: () => <select />,
  Loading: () => null,
  BarcodeScannerComponent: () => null,
  ProductPreviewCard: () => null,
  AddCategoryModal: () => null,
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonContent: Container,
    IonPage: Container,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonButtons: Container,
    IonBackButton: Container,
    IonIcon: Container,
    IonToast: ({ isOpen, message }: { isOpen?: boolean; message?: string }) =>
      isOpen ? <div role="alert">{message}</div> : null,
    IonCard: Container,
    IonCardContent: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonButton: ({
      children,
      onClick,
      disabled,
    }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    isPlatform: () => false,
  };
});

describe('AddProductBarcodePage GST quantity facts', () => {
  beforeEach(() => {
    state.lookupBarcode.mockReset();
    state.createProduct.mockReset();
    state.goBack.mockReset();
    state.lookupBarcode.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { found: false, source: 'NONE' } }),
    });
    state.createProduct.mockReturnValue({ unwrap: () => Promise.resolve({ data: {} }) });
  });

  afterEach(cleanup);

  it('includes the reviewed UQC quantity factor in the barcode-create contract', async () => {
    render(<AddProductBarcodePage />);
    fireEvent.change(screen.getByLabelText('foundation.barcode.barcode'), {
      target: { value: '890000000001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'foundation.barcode.check' }));

    await screen.findByText('foundation.barcode.createNew');
    fireEvent.change(screen.getByLabelText('foundation.barcode.masterName *'), {
      target: { value: 'Atta' },
    });
    fireEvent.change(screen.getByLabelText('products.productName *'), {
      target: { value: 'Atta 5 kg' },
    });
    fireEvent.change(screen.getByLabelText('foundation.barcode.mrp *'), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText('products.sellingPrice *'), {
      target: { value: '280' },
    });
    fireEvent.change(screen.getByLabelText('taxFields.uqcQuantityFactor'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText('products.gstLabel'), {
      target: { value: '1.5' },
    });
    fireEvent.change(screen.getByLabelText('foundation.barcode.initialQuantity *'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'products.createProductButton' }));

    await waitFor(() => expect(state.createProduct).toHaveBeenCalledOnce());
    expect(state.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: expect.objectContaining({ gstPercent: 1.5, uqcQuantityFactor: 5 }),
      })
    );
  });

  it('blocks an invalid HSN before creating a barcode product', async () => {
    render(<AddProductBarcodePage />);
    fireEvent.change(screen.getByLabelText('foundation.barcode.barcode'), {
      target: { value: '890000000001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'foundation.barcode.check' }));

    await screen.findByText('foundation.barcode.createNew');
    fireEvent.change(screen.getByLabelText('foundation.barcode.masterName *'), {
      target: { value: 'Atta' },
    });
    fireEvent.change(screen.getByLabelText('products.productName *'), {
      target: { value: 'Atta 5 kg' },
    });
    fireEvent.change(screen.getByLabelText('foundation.barcode.mrp *'), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText('products.sellingPrice *'), {
      target: { value: '280' },
    });
    fireEvent.change(screen.getByLabelText('foundation.barcode.initialQuantity *'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('taxFields.hsnCode'), {
      target: { value: '1234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'products.createProductButton' }));

    expect(state.createProduct).not.toHaveBeenCalled();
    expect(screen.getByText('taxFields.hsnCodeInvalid')).toBeTruthy();
  });
});
