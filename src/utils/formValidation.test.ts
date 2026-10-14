import { describe, expect, it } from 'vitest';
import {
  validatePartyForm,
  isSupportedImportFile,
  purchaseMatchesSearch,
  invoiceMatchesSearch,
} from './formValidation';

describe('QA regression validation', () => {
  it('rejects numeric-only names, invalid phones/emails, and negative balances', () => {
    expect(
      validatePartyForm({ name: '12345', phone: 'letters', email: 'bad', openingBalance: '-1' })
    ).toEqual({
      name: 'name',
      phone: 'phone',
      email: 'email',
      openingBalance: 'openingBalance',
    });
  });

  it('accepts realistic shop names and optional email', () => {
    expect(validatePartyForm({ name: 'A1 Kirana & Sons', phone: '9876543210', email: '' })).toEqual(
      {}
    );
  });

  it('only accepts the import formats supported by the API', () => {
    expect(isSupportedImportFile('customers.csv')).toBe(true);
    expect(isSupportedImportFile('customers.xlsx')).toBe(true);
    expect(isSupportedImportFile('customers.xls')).toBe(true);
    expect(isSupportedImportFile('customers.pdf')).toBe(false);
  });

  it('finds purchases by invoice, supplier, date, total, and pending amount', () => {
    const purchase = {
      invoice_number: 'PUR-10',
      invoice_date: '2026-10-12',
      total_amount: 450,
      paid_amount: 100,
      suppliers: { name: 'Patel Traders' },
    };
    expect(purchaseMatchesSearch(purchase, 'patel')).toBe(true);
    expect(purchaseMatchesSearch(purchase, '2026-10-12')).toBe(true);
    expect(purchaseMatchesSearch(purchase, '450')).toBe(true);
    expect(purchaseMatchesSearch(purchase, '350')).toBe(true);
  });

  it('finds invoices by their date as well as customer details', () => {
    const invoice = {
      invoice_number: 'INV-10',
      created_at: '2026-10-12T09:00:00Z',
      customer: { name: 'Asha', phone: '9876543210' },
    };
    expect(invoiceMatchesSearch(invoice, '2026-10-12')).toBe(true);
    expect(invoiceMatchesSearch(invoice, 'asha')).toBe(true);
  });
});
