import { describe, expect, it } from 'vitest';
import { BARCODE_LABELS_PER_PAGE, paginateBarcodeCopies } from './barcodePrintLayout';

describe('barcode print layout', () => {
  it('splits fifty labels across complete A4 sheets without losing copies', () => {
    const pages = paginateBarcodeCopies(50);

    expect(BARCODE_LABELS_PER_PAGE).toBe(21);
    expect(pages.map((page) => page.length)).toEqual([21, 21, 8]);
    expect(pages.flat()).toHaveLength(50);
    expect(pages.flat()).toEqual(Array.from({ length: 50 }, (_, index) => index));
  });

  it('keeps a small print run on one sheet', () => {
    expect(paginateBarcodeCopies(3)).toEqual([[0, 1, 2]]);
  });

  it('keeps large print jobs intact instead of silently capping them', () => {
    const pages = paginateBarcodeCopies(566);

    expect(pages).toHaveLength(27);
    expect(pages.slice(0, -1).every((page) => page.length === 21)).toBe(true);
    expect(pages.at(-1)).toHaveLength(20);
    expect(pages.flat()).toHaveLength(566);
  });
});
