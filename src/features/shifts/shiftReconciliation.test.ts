import { describe, expect, it } from 'vitest';
import {
  calculateCashVariance,
  parseNonNegativeAmount,
  requiresVarianceExplanation,
} from './shiftReconciliation';

describe('shift cash reconciliation', () => {
  it('requires an explanation for a shortage or excess', () => {
    expect(requiresVarianceExplanation(calculateCashVariance('990', 1000), '')).toBe(true);
    expect(requiresVarianceExplanation(calculateCashVariance('1010', 1000), 'Extra cash')).toBe(
      false
    );
  });

  it('does not require an explanation for an exact count', () => {
    expect(requiresVarianceExplanation(calculateCashVariance('1000', 1000), '')).toBe(false);
  });

  it('does not report a variance before cash has been counted', () => {
    expect(calculateCashVariance('', 1000)).toBeNull();
  });

  it.each(['NaN', 'Infinity', '-1', '  '])('rejects an invalid cash amount: %s', (value) => {
    expect(parseNonNegativeAmount(value)).toBeNull();
    expect(calculateCashVariance(value, 1000)).toBeNull();
  });

  it('accepts zero and finite positive cash amounts', () => {
    expect(parseNonNegativeAmount('0')).toBe(0);
    expect(parseNonNegativeAmount('125.50')).toBe(125.5);
  });
});
