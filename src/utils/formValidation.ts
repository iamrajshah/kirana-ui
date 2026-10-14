import { isValidEmail, isValidPhone } from './helpers';

export type PartyFieldError = 'name' | 'phone' | 'email' | 'openingBalance';

export const validatePartyForm = ({
  name,
  phone,
  email = '',
  openingBalance,
}: {
  name: string;
  phone: string;
  email?: string;
  openingBalance?: string;
}): Partial<Record<PartyFieldError, PartyFieldError>> => {
  const errors: Partial<Record<PartyFieldError, PartyFieldError>> = {};
  const cleanName = name.trim();
  const cleanPhone = phone.trim();
  const cleanEmail = email.trim();

  if (!cleanName || cleanName.length > 150 || !/\p{L}/u.test(cleanName)) errors.name = 'name';
  if (!isValidPhone(cleanPhone)) errors.phone = 'phone';
  if (cleanEmail && !isValidEmail(cleanEmail)) errors.email = 'email';
  if (openingBalance !== undefined) {
    const balance = Number(openingBalance);
    if (!Number.isFinite(balance) || balance < 0) errors.openingBalance = 'openingBalance';
  }
  return errors;
};

export const isSupportedImportFile = (fileName: string): boolean =>
  /\.(csv|xlsx|xls)$/i.test(fileName);

type PurchaseSearchRecord = {
  invoice_number?: string | null;
  invoice_date?: string | Date | null;
  total_amount?: number;
  paid_amount?: number;
  suppliers?: { name?: string | null } | null;
};

export const purchaseMatchesSearch = (purchase: PurchaseSearchRecord, search: string): boolean => {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const pending = Number(purchase.total_amount || 0) - Number(purchase.paid_amount || 0);
  return [
    purchase.invoice_number,
    purchase.suppliers?.name,
    purchase.invoice_date ? String(purchase.invoice_date).slice(0, 10) : '',
    purchase.total_amount,
    pending,
  ].some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(term)
  );
};

type InvoiceSearchRecord = {
  invoice_number?: string | null;
  created_at?: string | Date | null;
  customer?: { name?: string | null; phone?: string | null } | null;
};

export const invoiceMatchesSearch = (invoice: InvoiceSearchRecord, search: string): boolean => {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [
    invoice.invoice_number,
    invoice.customer?.name,
    invoice.customer?.phone,
    invoice.created_at ? String(invoice.created_at).slice(0, 10) : '',
  ].some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(term)
  );
};
