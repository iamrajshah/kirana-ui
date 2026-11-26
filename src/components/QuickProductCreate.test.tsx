import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { QuickProductCreate } from './QuickProductCreate';
const create = vi.hoisted(() => vi.fn());
vi.mock('@core/api/productApi', () => ({
  useCreateProductMutation: () => [create, { isLoading: false }],
}));
vi.mock('./CategoryPicker', () => ({ CategoryPicker: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('creates product, rate, cost and opening quantity in one request and returns the saved variant', async () => {
  create.mockReturnValue({
    unwrap: () => Promise.resolve({ data: { id: '3', name: 'Tea', variants: [{ id: '4' }] } }),
  });
  const created = vi.fn();
  const close = vi.fn();
  render(<QuickProductCreate initialName="Tea" onCreated={created} onClose={close} />);
  fireEvent.change(screen.getByLabelText('billing.unknownBarcode.sellingPrice'), {
    target: { value: '100' },
  });
  fireEvent.change(screen.getByLabelText('products.purchaseCostLabel'), {
    target: { value: '80' },
  });
  fireEvent.change(screen.getByLabelText('billing.unknownBarcode.openingStock'), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByText('common.save'));
  await waitFor(() =>
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ id: '4', price: 100, available_quantity: 5 })
    )
  );
  expect(create).toHaveBeenCalledOnce();
  expect(create.mock.calls[0][0].initial_variant).toMatchObject({
    purchase_price: 80,
    price: 100,
    opening_quantity: 5,
  });
  expect(close).toHaveBeenCalledOnce();
});
it('does not add a product to the bill when saving fails', async () => {
  create.mockReturnValue({ unwrap: () => Promise.reject(new Error('Failed')) });
  const created = vi.fn();
  const close = vi.fn();
  render(<QuickProductCreate initialName="Tea" onCreated={created} onClose={close} />);
  fireEvent.change(screen.getByLabelText('billing.unknownBarcode.sellingPrice'), {
    target: { value: '100' },
  });
  fireEvent.click(screen.getByText('common.save'));
  await screen.findByRole('alert');
  expect(created).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
