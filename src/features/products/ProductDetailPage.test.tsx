import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDetailPage } from './ProductDetailPage';

const state = vi.hoisted(() => ({ updateVariant: vi.fn() }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useParams: () => ({ id: 'product-1' }) }));
vi.mock('@core/auth/authSlice', () => ({
  selectCurrentUser: 'current-user',
  selectCommercialAccess: 'commercial-access',
}));
vi.mock('@core/hooks', () => ({
  useAppSelector: (selector: string) =>
    selector === 'current-user'
      ? { roles: ['OWNER'], tenant: { name: 'Test Shop' } }
      : { planCode: 'BUSINESS' },
}));
vi.mock('@core/commercial/commercialAccess', () => ({ canUseCommercialFeature: () => false }));
vi.mock('@core/permissions/permissions', () => ({ hasPermission: () => false }));
vi.mock('@core/api/categoryApi', () => ({ useGetCategoriesQuery: () => ({ data: { data: [] } }) }));
vi.mock('@core/api/expiryApi', () => ({ useGetExpiryAlertsQuery: () => ({ data: undefined }) }));
vi.mock('@core/api/productApi', () => ({
  useGetProductByIdQuery: () => ({
    data: {
      data: {
        id: 'product-1',
        name: 'Atta',
        category_id: '1',
        is_active: true,
        variants: [
          {
            id: 'variant-1',
            product_id: 'product-1',
            sku: 'ATTA-5KG',
            price: 280,
            selling_price: 280,
            mrp_price: 300,
            uqc_code: 'KGS',
            uqc_quantity_factor: 5,
            is_active: true,
          },
        ],
      },
    },
    isLoading: false,
    error: null,
  }),
  useGetProductPurchaseCostsQuery: () => ({ data: { data: [] } }),
  useUpdateProductMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateVariantMutation: () => [state.updateVariant, { isLoading: false }],
  useUpdateVariantPurchaseCostMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('./ProductBarcodeLabelModal', () => ({ ProductBarcodeLabelModal: () => null }));
vi.mock('@components', () => ({
  Loading: () => null,
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
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
  Button: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonCard: Container,
    IonCardHeader: Container,
    IonCardTitle: Container,
    IonCardContent: Container,
    IonBackButton: Container,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonButtons: Container,
    IonList: Container,
    IonItem: Container,
    IonLabel: Container,
    IonBadge: Container,
    IonIcon: Container,
    IonToast: Container,
    IonModal: ({ children, isOpen }: PropsWithChildren<{ isOpen?: boolean }>) =>
      isOpen ? <div>{children}</div> : null,
    IonButton: ({
      children,
      onClick,
      ...props
    }: PropsWithChildren<{
      onClick?: (event: React.MouseEvent) => void;
      'aria-label'?: string;
    }>) => (
      <button type="button" onClick={onClick} aria-label={props['aria-label']}>
        {children}
      </button>
    ),
  };
});

describe('ProductDetailPage UQC quantity factor', () => {
  beforeEach(() => {
    state.updateVariant.mockReset();
    state.updateVariant.mockReturnValue({ unwrap: () => Promise.resolve({ data: {} }) });
  });

  afterEach(cleanup);

  it('prefills and updates the explicit factor instead of deriving it from size', async () => {
    render(<ProductDetailPage />);
    expect(screen.getByText('5')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'products.editVariant' }));
    const factor = screen.getByLabelText('taxFields.uqcQuantityFactor');
    expect((factor as HTMLInputElement).value).toBe('5');
    fireEvent.change(factor, { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'products.updatePrice' }));

    await waitFor(() => expect(state.updateVariant).toHaveBeenCalledOnce());
    expect(state.updateVariant).toHaveBeenCalledWith({
      id: 'variant-1',
      data: expect.objectContaining({ uqc_quantity_factor: 0.5 }),
    });
  });
});
