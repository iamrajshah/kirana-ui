// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { buildWhatsAppReceiptMessage, normalizeIndianWhatsAppPhone, openWhatsAppReceipt } from './whatsapp';
import type { ReceiptViewModel } from './types';

const receipt = (remaining = '40.00'): ReceiptViewModel => ({
  labels: {} as ReceiptViewModel['labels'],
  invoiceId: '1', invoiceNumber: 'INV-1', title: 'Receipt', mode: 'SIMPLE_RECEIPT',
  branding: { template: 'MODERN', brandColor: '#087F5B', logoUrl: null },
  issuedAt: null, isLegacy: false, cancellationMarker: null,
  supplier: { name: 'Kirana Shop', address: null, state: null, stateCode: null, gstin: null, phone: null, signatory: null },
  customer: { kind: 'named', name: 'Asha', phone: '98765 43210', address: null, state: null, stateCode: null, gstin: null },
  placeOfSupply: null, items: [],
  totals: { subtotal: '100.00', itemDiscount: '0.00', billDiscount: '0.00', discount: '0.00', gst: '0.00', total: '100.00', mrpSavings: '10.00' },
  payment: { status: remaining === '0.00' ? 'PAID' : 'PARTIALLY_PAID', statusLabel: remaining === '0.00' ? 'Paid' : 'Partially paid', paid: remaining === '0.00' ? '100.00' : '60.00', remaining, modes: ['CASH'], lastAllocationAt: null, asOf: '', allocations: [] },
  footer: null,
});

describe('manual WhatsApp receipt', () => {
  it('normalizes Indian mobile numbers without guessing invalid numbers', () => {
    expect(normalizeIndianWhatsAppPhone('98765 43210')).toBe('919876543210');
    expect(normalizeIndianWhatsAppPhone('+91 98765 43210')).toBe('919876543210');
    expect(normalizeIndianWhatsAppPhone('12345')).toBeNull();
  });

  it('includes the balance and MRP saving in a user-initiated reminder', () => {
    expect(buildWhatsAppReceiptMessage(receipt())).toContain('Balance due: ₹40.00');
    expect(buildWhatsAppReceiptMessage(receipt())).toContain('saved ₹10.00');
  });

  it('opens an encoded wa.me message for the named customer', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    expect(openWhatsAppReceipt(receipt())).toBe(true);
    expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/919876543210?text='), '_blank', 'noopener,noreferrer');
  });
});
