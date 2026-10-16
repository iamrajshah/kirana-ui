import { describe, expect, it, vi } from 'vitest';
import {
  BILLING_COMPLETION_STORAGE_KEY,
  BILLING_PENDING_CHECKOUT_STORAGE_KEY,
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
      customerId: '12',
      paymentIdempotencyKey: 'retry-key',
    };

    persistPendingBillingCheckout(pending, owner);

    expect(loadPendingBillingCheckout(owner)).toEqual(pending);
    expect(loadPendingBillingCheckout({ userId: '8', tenantId: '1' })).toBeNull();
    clearPendingBillingCheckout();
    expect(localStorage.getItem(BILLING_PENDING_CHECKOUT_STORAGE_KEY)).toBeNull();
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
