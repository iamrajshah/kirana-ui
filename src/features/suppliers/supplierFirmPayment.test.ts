import { describe, expect, it } from 'vitest';
import type { Supplier } from '@core/api/supplierApi';
import {
  balanceForFirm,
  buildSupplierPaymentPayload,
  hasPayableFirmBalance,
  payableFirmBalances,
  paymentFitsFirmBalance,
  preferredPayableFirmId,
} from './supplierFirmPayment';

const firm = (id: string, name: string) => ({
  id, code: name, legal_name: name, display_name: name, is_active: true, is_default_sales: false,
});
const supplier: Supplier = {
  id: '4', name: 'Gemini', phone: null, email: null, address: null, is_active: true,
  created_at: '2026-10-23', default_purchase_firm_id: '2',
  balances_by_firm: [
    { firm_id: '1', firm: firm('1', 'Jayesh'), balance: 1000 },
    { firm_id: '2', firm: firm('2', 'Jitendra'), balance: 600 },
  ],
};

describe('firm-scoped supplier payments', () => {
  it('prefers the supplier default payable firm in both payment entry points', () => {
    expect(preferredPayableFirmId(supplier)).toBe('2');
  });

  it('uses only the selected firm balance and rejects cross-firm overpayment', () => {
    expect(balanceForFirm(supplier.balances_by_firm, '2')).toBe(600);
    expect(paymentFitsFirmBalance(supplier.balances_by_firm, '2', 600)).toBe(true);
    expect(paymentFitsFirmBalance(supplier.balances_by_firm, '2', 700)).toBe(false);
  });

  it('builds the firm-scoped API payload used by both payment entry points', () => {
    expect(buildSupplierPaymentPayload('4', '2', 600, 'UPI', '  paid  ')).toEqual({
      id: '4', firm_id: 2, amount: 600, payment_mode: 'UPI', description: 'paid',
    });
  });

  it('keeps payable actions visible when aggregate advances offset another firm payable', () => {
    const balances = [
      { firm_id: '1', firm: firm('1', 'Jayesh'), balance: 1000 },
      { firm_id: '2', firm: firm('2', 'Jitendra'), balance: -1000 },
    ];
    expect(hasPayableFirmBalance(balances)).toBe(true);
    expect(payableFirmBalances(balances).map((item) => item.firm_id)).toEqual(['1']);
  });

  it('excludes inactive firms from payment while preserving their balance for history', () => {
    const inactiveFirm = { ...firm('1', 'Jayesh'), is_active: false };
    const balances = [{ firm_id: '1', firm: inactiveFirm, balance: 1000 }];
    expect(balanceForFirm(balances, '1')).toBe(1000);
    expect(payableFirmBalances(balances)).toEqual([]);
    expect(paymentFitsFirmBalance(balances, '1', 100)).toBe(false);
  });
});
