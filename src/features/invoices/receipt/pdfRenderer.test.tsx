import { describe, expect, it } from 'vitest';
import { defaultReceiptLabels } from './receiptLabels';
import { renderReceiptPdf } from './pdfRenderer';
import type { ReceiptViewModel } from './types';

const receiptFor = (name: string, footer: string): ReceiptViewModel => ({
  labels: defaultReceiptLabels,
  invoiceId: '42',
  invoiceNumber: 'INV-42',
  title: 'Receipt',
  mode: 'SIMPLE_RECEIPT',
  issuedAt: '2026-10-15T10:30:00.000Z',
  isLegacy: false,
  cancellationMarker: null,
  supplier: { name, address: null, state: null, stateCode: null, gstin: null, phone: null, signatory: null },
  customer: { kind: 'walk-in', label: 'Walk-in customer' },
  placeOfSupply: null,
  items: [{
    key: '1', name: footer, sku: null, hsnCode: null, uqcCode: null, unitLabel: null,
    quantity: 1, unitPrice: '10.00', grossAmount: '10.00', discountAmount: '0.00',
    taxableAmount: '10.00', gstRate: null, cgstAmount: null, sgstAmount: null,
    igstAmount: null, lineTotal: '10.00',
  }],
  totals: { subtotal: '10.00', itemDiscount: '0.00', billDiscount: '0.00', discount: '0.00', gst: '0.00', total: '10.00' },
  payment: { status: 'PAID', statusLabel: 'Paid', paid: '10.00', remaining: '0.00', modes: ['CASH'], lastAllocationAt: null, asOf: '2026-10-15T10:31:00.000Z', allocations: [] },
  footer,
});

describe('renderReceiptPdf', () => {
  it.each([
    ['Latin', 'Rajesh Kirana', 'Thank you'],
    ['Devanagari', 'राजेश किराणा', 'धन्यवाद'],
    ['Gujarati', 'રાજેશ કિરાણા', 'આભાર'],
  ])('creates a non-empty A4 PDF for %s receipt text', async (_script, name, footer) => {
    const blob = await renderReceiptPdf(receiptFor(name, footer));
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1_000);
  }, 20_000);
});

