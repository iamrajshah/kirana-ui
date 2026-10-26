import { describe, expect, it, vi } from 'vitest';
import {
  BILLING_COMPLETION_STORAGE_KEY,
  BILLING_PENDING_CHECKOUT_STORAGE_KEY,
  addBillingCartItem,
  buildInvoiceItems,
  calculateBillingTotals,
  clearBillingCompletion,
  clearPendingBillingCheckout,
  loadBillingCompletion,
  loadPendingBillingCheckout,
  persistBillingCompletion,
  persistPendingBillingCheckout,
} from './billing.logic';

const owner = { userId: '7', tenantId: '1' };

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
  it('stops repeated additions at the latest available stock', () => {
    const item = {
      variant_id: '1',
      product_name: 'Salt',
      sku: 'SALT-1',
      available_quantity: 2,
      unit_price: 25,
      discount_amount: 0,
      discount_type: 'amount' as const,
    };

    const first = addBillingCartItem([], item);
    const second = addBillingCartItem(first.cart, item);
    const third = addBillingCartItem(second.cart, item);

    expect(first.outcome).toBe('added');
    expect(second.outcome).toBe('incremented');
    expect(third.outcome).toBe('at-stock-limit');
    expect(third.cart[0]).toMatchObject({ quantity: 2, available_quantity: 2 });
  });

  it('keeps the latest lower stock limit without increasing the bill quantity', () => {
    const result = addBillingCartItem([{ ...cart[0], available_quantity: 5 }], {
      ...cart[0],
      available_quantity: 1,
    });

    expect(result.outcome).toBe('at-stock-limit');
    expect(result.cart[0]).toMatchObject({ quantity: 2, available_quantity: 1 });
  });

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

describe('billing completion recovery', () => {
  it('persists finalized invoice identity for the active tenant and user', () => {
    localStorage.clear();

    persistBillingCompletion('42', owner);

    expect(JSON.parse(localStorage.getItem(BILLING_COMPLETION_STORAGE_KEY) || '{}')).toMatchObject({
      version: 1,
      invoiceId: '42',
      ...owner,
    });
    expect(loadBillingCompletion(owner)).toBe('42');
    expect(loadBillingCompletion({ userId: '8', tenantId: '1' })).toBeNull();
  });

  it('ignores malformed or unavailable storage and clears explicitly', () => {
    localStorage.setItem(BILLING_COMPLETION_STORAGE_KEY, '   ');
    expect(loadBillingCompletion(owner)).toBeNull();

    persistBillingCompletion('84', owner);
    clearBillingCompletion();
    expect(loadBillingCompletion(owner)).toBeNull();
  });

  it('restores a finalized invoice awaiting payment with the same retry key', () => {
    const pending = {
      invoiceId: '84',
      payable: 118,
      previousBalance: 2500,
      customerId: '12',
      paymentIdempotencyKey: 'retry-key',
    };

    persistPendingBillingCheckout(pending, owner);

    expect(loadPendingBillingCheckout(owner)).toEqual(pending);
    expect(loadPendingBillingCheckout({ userId: '8', tenantId: '1' })).toBeNull();
    clearPendingBillingCheckout();
    expect(localStorage.getItem(BILLING_PENDING_CHECKOUT_STORAGE_KEY)).toBeNull();
  });

  it('preserves a customer advance while restoring payment recovery', () => {
    const pending = {
      invoiceId: '85',
      payable: 400,
      previousBalance: -500,
      customerId: '12',
      paymentIdempotencyKey: 'advance-retry-key',
    };

    persistPendingBillingCheckout(pending, owner);

    expect(loadPendingBillingCheckout(owner)).toEqual(pending);
  });

  it('treats blocked browser storage as unavailable instead of throwing', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(loadBillingCompletion(owner)).toBeNull();
    getItem.mockRestore();

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(persistBillingCompletion('99', owner)).toBe(false);
    setItem.mockRestore();
  });
});
