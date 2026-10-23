import type { FirmSummary } from '@core/api/firmApi';
import type { Supplier } from '@core/api/supplierApi';

export const resolvePurchaseFirmId = (
  supplier: Supplier,
  firms: FirmSummary[]
): string => {
  const activeFirms = firms.filter((firm) => firm.is_active);
  const supplierDefault = activeFirms.find(
    (firm) => firm.id === supplier.default_purchase_firm_id
  );
  return (
    supplierDefault?.id ||
    activeFirms.find((firm) => firm.is_default_sales)?.id ||
    activeFirms[0]?.id ||
    ''
  );
};

export const reconcilePurchaseFirmId = (
  supplier: Supplier,
  firms: FirmSummary[],
  currentFirmId: string,
  wasOverridden: boolean
): string => wasOverridden ? currentFirmId : resolvePurchaseFirmId(supplier, firms);
