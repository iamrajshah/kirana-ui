import { describe, expect, it } from 'vitest';
import { buildInvoiceItems, calculateBillingTotals } from './billing.logic';

const cart = [
  {
    variant_id: '1',
    product_name: 'Rice',
    sku: 'RICE-1',
    quantity: 2,
    unit_price: 50,
    discount_amount: 10,
    discount_type: 'percent' as const,
  },
];

describe('billing calculations', () => {
  it('converts percentage item discounts into invoice amounts', () => {
    expect(buildInvoiceItems(cart)).toEqual([
      { variant_id: '1', quantity: 2, price: 50, discount_amount: 10 },
    ]);
  });

  it('calculates the payable total after bill discount and GST', () => {
    expect(calculateBillingTotals(cart, 5, 'percent', 3)).toEqual({
      subtotal: 100,
      billDiscountAmount: 5,
      total: 98,
    });
  });

  it('calculates the normal cashier total with an amount discount', () => {
    expect(calculateBillingTotals(cart, 7, 'amount', 5)).toEqual({
      subtotal: 100,
      billDiscountAmount: 7,
      total: 98,
    });
  });
});
