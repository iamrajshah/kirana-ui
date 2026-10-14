export const BARCODE_LABELS_PER_PAGE = 21;

export const paginateBarcodeCopies = (copies: number): number[][] => {
  const safeCopies = Number.isFinite(copies) ? Math.max(1, Math.floor(copies)) : 1;
  const labels = Array.from({ length: safeCopies }, (_, index) => index);

  return Array.from(
    { length: Math.ceil(labels.length / BARCODE_LABELS_PER_PAGE) },
    (_, pageIndex) => labels.slice(
      pageIndex * BARCODE_LABELS_PER_PAGE,
      (pageIndex + 1) * BARCODE_LABELS_PER_PAGE
    )
  );
};
