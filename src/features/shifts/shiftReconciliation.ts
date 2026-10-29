export const calculateCashVariance = (countedCash: string, expectedCash: number): number | null => {
  if (countedCash === '') return null;
  return Number(countedCash) - expectedCash;
};

export const requiresVarianceExplanation = (
  variance: number | null,
  closingNote: string
): boolean => variance !== null && Math.abs(variance) >= 0.005 && closingNote.trim().length < 2;
