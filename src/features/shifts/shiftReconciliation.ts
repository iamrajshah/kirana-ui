export const parseNonNegativeAmount = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const calculateCashVariance = (countedCash: string, expectedCash: number): number | null => {
  const counted = parseNonNegativeAmount(countedCash);
  if (counted === null || !Number.isFinite(expectedCash) || expectedCash < 0) return null;
  return counted - expectedCash;
};

export const requiresVarianceExplanation = (
  variance: number | null,
  closingNote: string
): boolean => variance !== null && Math.abs(variance) >= 0.005 && closingNote.trim().length < 2;
