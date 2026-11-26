import { expect, it } from 'vitest';
import { applyCategoryTaxDefaults } from './categoryDefaults';
it('updates inherited defaults when category changes, while preserving an explicit override', () => {
  expect(
    applyCategoryTaxDefaults(
      { hsn: '1006', gst: '0' },
      { hsn: '1006', gst: '0' },
      { hsn: '0902', gst: '5' }
    )
  ).toEqual({ hsn: '0902', gst: '5' });
  expect(
    applyCategoryTaxDefaults(
      { hsn: '1234', gst: '12' },
      { hsn: '1006', gst: '0' },
      { hsn: '0902', gst: '5' }
    )
  ).toEqual({ hsn: '1234', gst: '12' });
});
it('clears inherited defaults for a category with no tax defaults without treating zero as blank', () => {
  expect(
    applyCategoryTaxDefaults(
      { hsn: '1006', gst: '0' },
      { hsn: '1006', gst: '0' },
      { hsn: '', gst: '' }
    )
  ).toEqual({ hsn: '', gst: '' });
  expect(
    applyCategoryTaxDefaults({ hsn: '', gst: '0' }, { hsn: '', gst: '' }, { hsn: '1006', gst: '5' })
  ).toEqual({ hsn: '1006', gst: '0' });
});
