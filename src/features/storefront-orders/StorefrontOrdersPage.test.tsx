import React, { type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import StorefrontOrdersPage from './StorefrontOrdersPage';

const state = vi.hoisted(() => ({
  createOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
  refetchOrders: vi.fn(),
  refetchOffers: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@core/hooks', () => ({
  useAppSelector: () => ({ tenant: { id: '2', name: 'Kirana Demo Store' } }),
}));
vi.mock('@core/auth/authSlice', () => ({ selectCurrentUser: vi.fn() }));
vi.mock('@components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@components', () => ({
  EmptyState: ({ message }: { message: string }) => <p>{message}</p>,
  Loading: () => <p>loading</p>,
}));
vi.mock('@core/api/productApi', () => ({
  useGetProductsQuery: () => ({ data: { data: [{ id: 'product-1', name: 'Tea' }] } }),
}));
vi.mock('@core/api/storefrontOrderApi', () => ({
  useGetIncomingStorefrontOrdersQuery: () => ({
    data: { data: [] },
    isLoading: false,
    refetch: state.refetchOrders,
  }),
  useGetStorefrontOffersQuery: () => ({
    data: {
      data: [{ id: 'offer-1', title: 'Tea-time offer', is_active: true, product: { name: 'Tea' } }],
    },
    isLoading: false,
    refetch: state.refetchOffers,
  }),
  useUpdateStorefrontOrderStatusMutation: () => [vi.fn(), { isLoading: false }],
  useCreateStorefrontOfferMutation: () => [state.createOffer, { isLoading: false }],
  useUpdateStorefrontOfferMutation: () => [state.updateOffer],
  useDeleteStorefrontOfferMutation: () => [state.deleteOffer],
}));
vi.mock('@ionic/react', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    IonPage: Container,
    IonContent: Container,
    IonCard: Container,
    IonCardContent: Container,
    IonChip: Container,
    IonLabel: Container,
    IonSegmentButton: Container,
    IonRefresher: Container,
    IonRefresherContent: Container,
    IonSegment: ({
      children,
      onIonChange,
    }: PropsWithChildren<{ onIonChange: (event: { detail: { value: string } }) => void }>) => (
      <div>
        <button onClick={() => onIonChange({ detail: { value: 'offers' } })}>show-offers</button>
        {children}
      </div>
    ),
    IonInput: ({
      label,
      value,
      onIonInput,
    }: {
      label: string;
      value: string;
      onIonInput: (event: { detail: { value: string } }) => void;
    }) => (
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onIonInput({ detail: { value: event.target.value } })}
      />
    ),
    IonTextarea: ({
      label,
      value,
      onIonInput,
    }: {
      label: string;
      value: string;
      onIonInput: (event: { detail: { value: string } }) => void;
    }) => (
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onIonInput({ detail: { value: event.target.value } })}
      />
    ),
    IonToggle: ({ children }: PropsWithChildren) => (
      <label>
        {children}
        <input type="checkbox" />
      </label>
    ),
    IonButton: ({
      children,
      onClick,
      type,
      disabled,
    }: PropsWithChildren<{ onClick?: () => void; type?: 'submit'; disabled?: boolean }>) => (
      <button type={type} disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
  };
});

beforeEach(() => {
  state.createOffer.mockReset();
  state.createOffer.mockReturnValue({ unwrap: () => Promise.resolve() });
  state.updateOffer.mockReset();
  state.deleteOffer.mockReset();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});
afterEach(cleanup);

it('lets a shop publish and manage customer storefront offers', async () => {
  render(<StorefrontOrdersPage />);
  fireEvent.click(screen.getByRole('button', { name: 'show-offers' }));

  expect(screen.getByText('Tea-time offer')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('storefrontOrders.offerEditor.name'), {
    target: { value: 'Weekend offer' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'storefrontOrders.offerEditor.create' }));

  await waitFor(() =>
    expect(state.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Weekend offer', is_active: true })
    )
  );
  fireEvent.click(screen.getByRole('button', { name: 'storefrontOrders.offerEditor.unpublish' }));
  expect(state.updateOffer).toHaveBeenCalledWith({ id: 'offer-1', data: { is_active: false } });
  fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));
  expect(state.deleteOffer).toHaveBeenCalledWith('offer-1');
});

it('shows the tenant storefront link and lets staff copy it', async () => {
  render(<StorefrontOrdersPage />);

  const link = screen.getByRole('link', { name: 'https://kirana-customer.pages.dev/shop/shop-2' });
  expect(link.getAttribute('href')).toBe('https://kirana-customer.pages.dev/shop/shop-2');

  fireEvent.click(screen.getByRole('button', { name: 'storefrontOrders.share.copy' }));

  await waitFor(() =>
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://kirana-customer.pages.dev/shop/shop-2'
    )
  );
});
