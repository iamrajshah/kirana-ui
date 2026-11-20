import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CounterBillTable } from './CounterBillTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      `${key}${values?.product ? ` ${values.product}` : ''}`,
  }),
}));
afterEach(cleanup);
const items = Array.from({ length: 120 }, (_, index) => ({
  variant_id: String(index),
  product_name: `Product ${index}`,
  sku: `SKU${index}`,
  quantity: 1,
  unit_price: 20,
  discount_amount: 0,
  discount_type: 'amount' as const,
  available_quantity: 4,
}));
const setup = () => {
  const onQuantity = vi.fn(),
    onPrice = vi.fn();
  render(
    <CounterBillTable
      items={items}
      stock={new Map([['0', 1]])}
      disabled={false}
      onQuantity={onQuantity}
      onPrice={onPrice}
    />
  );
  return { onQuantity, onPrice };
};
describe('compact bill review', () => {
  it('renders all 120 rows without an expand or pagination action', () => {
    setup();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(121);
    expect(screen.getByText('Product 0')).toBeTruthy();
    expect(screen.getByText('Product 119')).toBeTruthy();
  });
  it('searches the complete bill by SKU while edits retain the original variant identity', () => {
    const { onQuantity, onPrice } = setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SKU119' } });
    expect(screen.queryByText('Product 0')).toBeNull();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'billing.quantityFor Product 119' }), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'billing.priceFor Product 119' }), {
      target: { value: '25' },
    });
    expect(onQuantity).toHaveBeenCalledWith('119', 3);
    expect(onPrice).toHaveBeenCalledWith('119', 25);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getByText('Product 0')).toBeTruthy();
  });
  it('uses current stock rather than stale saved stock to disable increment', () => {
    setup();
    expect(
      (
        screen.getByRole('button', {
          name: 'billing.increaseQuantity Product 0',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: 'billing.increaseQuantity Product 1',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });
});
