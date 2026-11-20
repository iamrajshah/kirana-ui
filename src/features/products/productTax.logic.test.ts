import { describe, it, expect } from 'vitest';
import { parseTaxDraft, taxDraft } from './productTax.logic';
const draft = {
  hsnCode: '1006',
  gstPercent: '',
  uqcCode: 'KGS',
  unitLabel: 'kg',
  uqcQuantityFactor: '0.5',
};
describe('tax master edits', () => {
  it('preserves unknown versus explicit 0% and decimal base quantity', () => {
    expect(parseTaxDraft(draft)).toMatchObject({ gstPercent: null, uqcQuantityFactor: 0.5 });
    expect(parseTaxDraft({ ...draft, gstPercent: '0' })).toMatchObject({ gstPercent: 0 });
    expect(
      taxDraft({
        hsnCode: null,
        gstPercent: 0,
        uqcCode: null,
        unitLabel: null,
        uqcQuantityFactor: null,
      })
    ).toMatchObject({ gstPercent: '0', hsnCode: '' });
  });
  it.each([
    { hsnCode: '12345' },
    { gstPercent: '-1' },
    { gstPercent: '1.234' },
    { gstPercent: 'Infinity' },
    { uqcQuantityFactor: '0' },
    { uqcQuantityFactor: '1.2345' },
  ])('rejects invalid new tax data %j', (fields) => {
    expect(parseTaxDraft({ ...draft, ...fields })).toBeNull();
  });
});
