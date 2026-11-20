import type { TaxValues } from '@core/api/productTaxApi';
import { isSupportedHsnCode, isValidGstRate } from '@core/constants/gstMasterData';
import { parseOptionalUqcQuantityFactor } from './uqcQuantityFactor';
export type TaxDraft = { [K in keyof TaxValues]: string };
export const taxDraft = (values: TaxValues): TaxDraft =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value == null ? '' : String(value)])
  ) as TaxDraft;
export const parseTaxDraft = (draft: TaxDraft): TaxValues | null => {
  const hsnCode = draft.hsnCode.trim() || null;
  const gstPercent = draft.gstPercent.trim() === '' ? null : Number(draft.gstPercent);
  const factor = parseOptionalUqcQuantityFactor(draft.uqcQuantityFactor);
  if (
    (hsnCode && !isSupportedHsnCode(hsnCode)) ||
    (gstPercent != null && !isValidGstRate(gstPercent)) ||
    !factor.valid ||
    draft.unitLabel.trim().length > 30 ||
    (draft.uqcCode !== '' &&
      ![
        'BAG',
        'BAL',
        'BDL',
        'BOX',
        'BTL',
        'CTN',
        'DOZ',
        'GMS',
        'KGS',
        'LTR',
        'MLT',
        'MTR',
        'NOS',
        'PAC',
        'PCS',
        'SET',
      ].includes(draft.uqcCode))
  )
    return null;
  return {
    hsnCode,
    gstPercent,
    uqcCode: (draft.uqcCode || null) as TaxValues['uqcCode'],
    unitLabel: draft.unitLabel.trim() || null,
    uqcQuantityFactor: factor.value ?? null,
  };
};
