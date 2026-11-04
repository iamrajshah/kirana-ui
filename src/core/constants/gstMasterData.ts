/** Current statutory master offered as suggestions; future notified rates remain valid inputs. */
export const GST_RATE_QUICK_PICKS = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40] as const;

export const isValidGstRate = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100 &&
  Math.abs(value - Math.round(value * 100) / 100) <= 1e-9;

export const optionalGstRateIsValid = (value: unknown): boolean =>
  value == null || isValidGstRate(value);

/** GST HSN codes are valid only at the 4, 6 or 8 digit classification levels. */
export const isSupportedHsnCode = (value: string): boolean => /^(?:\d{4}|\d{6}|\d{8})$/.test(value);

export const optionalHsnCodeIsSupported = (value: string | null | undefined): boolean => {
  const normalized = value?.trim() ?? '';
  return !normalized || isSupportedHsnCode(normalized);
};
