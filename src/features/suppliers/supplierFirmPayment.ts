import type {
  Supplier,
  SupplierFirmBalance,
  SupplierPaymentMode,
} from '@core/api/supplierApi';

export const payableFirmBalances = (
  balances: SupplierFirmBalance[] | undefined
): SupplierFirmBalance[] =>
  (balances || []).filter((item) => item.firm.is_active && item.balance > 0);

export const hasPayableFirmBalance = (
  balances: SupplierFirmBalance[] | undefined
): boolean => payableFirmBalances(balances).length > 0;

export const preferredPayableFirmId = (supplier: Supplier): string => {
  const balances = payableFirmBalances(supplier.balances_by_firm);
  return (
    balances.find(
      (item) => item.firm_id === supplier.default_purchase_firm_id
    )?.firm_id ||
    balances[0]?.firm_id ||
    ''
  );
};

export const balanceForFirm = (
  balances: SupplierFirmBalance[] | undefined,
  firmId: string
): number => balances?.find((item) => item.firm_id === firmId)?.balance || 0;

export const paymentFitsFirmBalance = (
  balances: SupplierFirmBalance[] | undefined,
  firmId: string,
  amount: number
): boolean => {
  const payableFirm = payableFirmBalances(balances).find((item) => item.firm_id === firmId);
  return !!payableFirm && amount > 0 && amount <= payableFirm.balance;
};

export const buildSupplierPaymentPayload = (
  id: string,
  firmId: string,
  amount: number,
  paymentMode: SupplierPaymentMode,
  description: string
) => ({
  id,
  firm_id: Number(firmId),
  amount,
  payment_mode: paymentMode,
  description: description.trim() || undefined,
});
