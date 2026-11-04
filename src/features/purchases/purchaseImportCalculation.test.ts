import { describe, expect, it } from 'vitest';
import { calculatePurchaseImportTotals } from './purchaseImportCalculation';

describe('purchase import preview totals', () => {
  it('matches the server per-line paise rounding for tax-inclusive bills', () => {
    const lines = Array.from({ length: 100 }, (_, index) => ({
      lineId: String(index),
      productName: `Item ${index}`,
      quantity: 1,
      unitPrice: 1,
      gstRate: 18,
    }));

    expect(calculatePurchaseImportTotals(lines, true)).toEqual({
      subtotal: 85,
      tax: 15,
      total: 100,
    });
  });

  it('adds tax to tax-exclusive supplier prices', () => {
    expect(
      calculatePurchaseImportTotals(
        [{ lineId: '1', productName: 'Oil', quantity: 2, unitPrice: 100, gstRate: 5 }],
        false
      )
    ).toEqual({ subtotal: 200, tax: 10, total: 210 });
  });
});
