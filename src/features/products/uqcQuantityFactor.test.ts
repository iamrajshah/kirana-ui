import { describe, expect, it } from 'vitest';
import { MAX_UQC_QUANTITY_FACTOR, parseOptionalUqcQuantityFactor } from './uqcQuantityFactor';

describe('parseOptionalUqcQuantityFactor', () => {
  it('keeps the field optional and accepts positive decimal factors', () => {
    expect(parseOptionalUqcQuantityFactor('')).toEqual({ valid: true, value: null });
    expect(parseOptionalUqcQuantityFactor(' 5 ')).toEqual({ valid: true, value: 5 });
    expect(parseOptionalUqcQuantityFactor('0.5')).toEqual({ valid: true, value: 0.5 });
  });

  it('rejects zero, negative, non-numeric, and oversized values', () => {
    for (const value of [
      '0',
      '-1',
      '1.2345',
      '0.0000000000001',
      'not-a-number',
      String(MAX_UQC_QUANTITY_FACTOR + 1),
    ]) {
      expect(parseOptionalUqcQuantityFactor(value)).toEqual({ valid: false, value: null });
    }
  });
});
