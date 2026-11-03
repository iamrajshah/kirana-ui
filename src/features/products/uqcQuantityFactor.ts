export const MAX_UQC_QUANTITY_FACTOR = 1_000_000;

export type ParsedUqcQuantityFactor =
  | { valid: true; value: number | null }
  | { valid: false; value: null };

/**
 * Converts the optional form value to the API's positive numeric contract.
 * Empty means "not supplied" so GST reports can explicitly flag the product
 * for CA review instead of guessing from free-text size labels.
 */
export const parseOptionalUqcQuantityFactor = (rawValue: string): ParsedUqcQuantityFactor => {
  const normalized = rawValue.trim();
  if (!normalized) return { valid: true, value: null };

  const value = Number(normalized);
  const [coefficient, exponentText = '0'] = String(value).toLowerCase().split('e');
  const fractionalDigits = coefficient.split('.')[1]?.length ?? 0;
  const decimalPlaces = Math.max(0, fractionalDigits - Number(exponentText));
  const hasAtMostThreeDecimalPlaces = decimalPlaces <= 3;
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > MAX_UQC_QUANTITY_FACTOR ||
    !hasAtMostThreeDecimalPlaces
  ) {
    return { valid: false, value: null };
  }

  return { valid: true, value };
};
