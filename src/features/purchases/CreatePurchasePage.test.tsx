import React, { type PropsWithChildren } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreatePurchasePage from './CreatePurchasePage';

vi.mock('react-router', () => ({ useHistory: () => ({ push: vi.fn() }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('../../core/api/supplierApi', () => ({
  useGetSuppliersQuery: () => ({ data: { data: [] } }),
}));
vi.mock('../../core/api/firmApi', () => ({
  useGetFirmsQuery: () => ({ data: { data: { firms: [] } }, isLoading: false }),
}));
vi.mock('../../core/api/purchaseApi', () => ({
  useCreatePurchaseMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('../../core/api/productApi', () => ({
  useLazySearchVariantsQuery: () => [
    vi.fn(),
    {
      data: {
        data: [{ id: '1', product_name: 'Salt', sku: 'SALT-1', price: 50 }],
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
  Input: () => null,
  Button: ({ children, onClick, disabled }: PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
  }>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
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
      <div role="button" tabIndex={0} onClick={onClick}>{children}</div>
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
  it('uses a readable theme-aware notice instead of danger text on a danger background', () => {
    render(<CreatePurchasePage />);

    fireEvent.click(screen.getByRole('button', { name: 'search test product' }));
    fireEvent.click(screen.getByRole('button', { name: /Salt/ }));

    const notice = screen.getByRole('status');
    expect(notice.classList.contains('purchase-pending-notice')).toBe(true);
    expect(notice.textContent).toContain('purchases.pendingAmount');
    expect(notice.querySelector('ion-text[color="danger"]')).toBeNull();
  });
});
