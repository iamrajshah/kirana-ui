import type { Customer } from '@core/types';
import type { BillingCartItem } from './billing.logic';
import { generateIdempotencyKey } from '@utils/helpers';

export type BillWorkspace = {
  id: string;
  items: BillingCartItem[];
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'state_code' | 'credit_balance'> | null;
  discount: number;
  placeOfSupply: string;
  requestKey: string;
};
export type BillWorkspaces = { active: string; bills: BillWorkspace[] };
export const newBillWorkspace = (): BillWorkspace => ({
  id: generateIdempotencyKey(),
  items: [],
  customer: null,
  discount: 0,
  placeOfSupply: '',
  requestKey: generateIdempotencyKey(),
});
export const workspaceKey = (tenant: string, user: string) =>
  `kirana:bill-workspaces:v1:${encodeURIComponent(tenant)}:${encodeURIComponent(user)}`;
export function loadWorkspaces(key: string): BillWorkspaces {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    if (
      parsed?.version === 1 &&
      Date.now() - parsed.savedAt < 7 * 86400000 &&
      Array.isArray(parsed.bills) &&
      parsed.bills.length > 0 &&
      parsed.bills.length <= 3 &&
      new Set(parsed.bills.map((bill: BillWorkspace) => bill.id)).size === parsed.bills.length &&
      parsed.bills.every(
        (bill: BillWorkspace) =>
          typeof bill.id === 'string' &&
          typeof bill.requestKey === 'string' &&
          typeof bill.placeOfSupply === 'string' &&
          Number.isFinite(bill.discount) &&
          bill.discount >= 0 &&
          (bill.customer === null ||
            (typeof bill.customer?.id === 'string' && typeof bill.customer?.name === 'string')) &&
          Array.isArray(bill.items) &&
          bill.items.length <= 1000 &&
          bill.items.every(
            (item) =>
              typeof item.variant_id === 'string' &&
              Number.isFinite(item.quantity) &&
              item.quantity > 0 &&
              Number.isFinite(item.unit_price) &&
              item.unit_price >= 0
          )
      ) &&
      parsed.bills.some((bill: BillWorkspace) => bill.id === parsed.active)
    ) {
      return { active: parsed.active, bills: parsed.bills };
    }
  } catch {
    /* Invalid, unavailable or expired storage starts a fresh workspace. */
  }
  const bill = newBillWorkspace();
  return { active: bill.id, bills: [bill] };
}
export function saveWorkspaces(key: string, state: BillWorkspaces): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ ...state, version: 1, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
