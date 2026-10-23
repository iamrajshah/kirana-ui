import { describe, expect, it } from 'vitest';
import type { FirmSummary } from '@core/api/firmApi';
import type { Supplier } from '@core/api/supplierApi';
import { reconcilePurchaseFirmId, resolvePurchaseFirmId } from './purchaseFirmSelection';

const firms: FirmSummary[] = [
  { id: '1', code: 'KJS', legal_name: 'Kantilal Jadhavji Shop', display_name: 'Kantilal Jadhavji Shop', is_active: true, is_default_sales: true },
  { id: '2', code: 'JT', legal_name: 'Jitendra Trading', display_name: 'Jitendra Trading', is_active: true, is_default_sales: false },
];

const supplier = (defaultFirmId?: string | null): Supplier => ({
  id: '10', name: 'Gemini', phone: null, email: null, address: null, is_active: true,
  created_at: '2026-10-23', default_purchase_firm_id: defaultFirmId,
});

describe('purchase firm selection', () => {
  it('preselects the supplier default firm', () => {
    expect(resolvePurchaseFirmId(supplier('2'), firms)).toBe('2');
  });

  it('falls back to the tenant sales default', () => {
    expect(resolvePurchaseFirmId(supplier(null), firms)).toBe('1');
  });

  it('rejects an inactive or missing supplier default', () => {
    const inactive = firms.map((firm) => firm.id === '2' ? { ...firm, is_active: false } : firm);
    expect(resolvePurchaseFirmId(supplier('2'), inactive)).toBe('1');
    expect(resolvePurchaseFirmId(supplier('99'), firms)).toBe('1');
  });

  it('re-resolves after delayed firms load without clobbering an owner override', () => {
    expect(reconcilePurchaseFirmId(supplier('2'), [], '', false)).toBe('');
    expect(reconcilePurchaseFirmId(supplier('2'), firms, '', false)).toBe('2');
    expect(reconcilePurchaseFirmId(supplier('1'), firms, '2', true)).toBe('2');
  });
});
