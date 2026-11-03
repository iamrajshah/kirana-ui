import type { PurchaseImportLine } from '@core/api/purchaseImportApi';

export interface PurchaseImportCalculatedTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export interface PurchaseTaxCalculationLine {
  quantity: number;
  unitPrice: number;
  gstRate?: number | null;
}

export const calculatePurchaseTaxTotals = (
  items: PurchaseTaxCalculationLine[],
  pricesIncludeTax: boolean
): PurchaseImportCalculatedTotals => {
  const totals = items.reduce(
    (result, item) => {
      const grossPaise = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100);
      const rateBasisPoints = Math.round(Math.max(0, Number(item.gstRate) || 0) * 100);
      const taxablePaise =
        pricesIncludeTax && rateBasisPoints > 0
          ? Math.round((grossPaise * 10_000) / (10_000 + rateBasisPoints))
          : grossPaise;
      const taxPaise = pricesIncludeTax
        ? grossPaise - taxablePaise
        : Math.round((taxablePaise * rateBasisPoints) / 10_000);
      result.taxablePaise += taxablePaise;
      result.taxPaise += taxPaise;
      result.totalPaise += taxablePaise + taxPaise;
      return result;
    },
    { taxablePaise: 0, taxPaise: 0, totalPaise: 0 }
  );
  return {
    subtotal: totals.taxablePaise / 100,
    tax: totals.taxPaise / 100,
    total: totals.totalPaise / 100,
  };
};

export const calculatePurchaseImportTotals = (
  items: PurchaseImportLine[],
  pricesIncludeTax: boolean
): PurchaseImportCalculatedTotals =>
  calculatePurchaseTaxTotals(
    items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      gstRate: item.gstRate,
    })),
    pricesIncludeTax
  );
