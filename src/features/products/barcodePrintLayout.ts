export const BARCODE_LABELS_PER_PAGE = 21;

export const EXTENDED_LABELS_PER_PAGE = 15;
export const QR_LABELS_PER_PAGE = 12;

export const paginateBarcodeCopies = (
  copies: number,
  pageSize = BARCODE_LABELS_PER_PAGE
): number[][] => {
  const perPage = Number.isFinite(pageSize)
    ? Math.max(1, Math.floor(pageSize))
    : BARCODE_LABELS_PER_PAGE;
  const safeCopies = Number.isFinite(copies) ? Math.max(1, Math.floor(copies)) : 1;
  const labels = Array.from({ length: safeCopies }, (_, index) => index);

  return Array.from({ length: Math.ceil(labels.length / perPage) }, (_, pageIndex) =>
    labels.slice(pageIndex * perPage, (pageIndex + 1) * perPage)
  );
};
