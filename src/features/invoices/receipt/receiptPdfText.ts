/** PDF font subsets need explicit runs for scripts and the Indian rupee glyph. */
export const receiptPdfTextRuns = (value: string) =>
  (value.match(/[ऀ-ॿ₹]+|[઀-૿]+|[^ऀ-ॿ઀-૿₹]+/gu) ?? []).map((text) => ({
    text,
    family: /^[઀-૿]/u.test(text)
      ? 'Receipt Gujarati'
      : /^[ऀ-ॿ₹]/u.test(text)
        ? 'Receipt Devanagari'
        : 'Receipt Latin',
  }));
