import { describe, expect, it } from 'vitest';
import {
  GST_RATE_QUICK_PICKS,
  isSupportedHsnCode,
  isValidGstRate,
  optionalGstRateIsValid,
  optionalHsnCodeIsSupported,
} from './gstMasterData';

describe('GST statutory master data', () => {
  it('offers the complete current statutory master as non-blocking quick picks', () => {
    expect(GST_RATE_QUICK_PICKS).toEqual([0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40]);
  });

  it('allows notified custom rates while enforcing range and precision', () => {
    for (const rate of [0, 0.1, 0.25, 1.5, 2.75, 7.5, 40, 100]) {
      expect(isValidGstRate(rate)).toBe(true);
    }
    expect(isValidGstRate(0.1 + 0.2)).toBe(true);
    for (const rate of [-0.1, 0.001, 1.234, 100.01, 101, Number.NaN]) {
      expect(isValidGstRate(rate)).toBe(false);
    }
    expect(optionalGstRateIsValid(null)).toBe(true);
    expect(optionalGstRateIsValid(undefined)).toBe(true);
  });

  it('accepts every hundredth from 0% through 100%', () => {
    for (let hundredths = 0; hundredths <= 10_000; hundredths += 1) {
      expect(isValidGstRate(hundredths / 100)).toBe(true);
    }
  });

  it('accepts only 4, 6 or 8 digit HSN classifications', () => {
    for (const hsn of ['1001', '100630', '10063020']) {
      expect(isSupportedHsnCode(hsn)).toBe(true);
    }
    for (const hsn of ['100', '10012', '1001234', '100123456', '10A1']) {
      expect(isSupportedHsnCode(hsn)).toBe(false);
    }
    expect(optionalHsnCodeIsSupported('')).toBe(true);
    expect(optionalHsnCodeIsSupported(null)).toBe(true);
  });
});
