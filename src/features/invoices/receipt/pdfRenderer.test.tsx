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
  branding: { template: 'CLASSIC', brandColor: '#087F5B', logoUrl: null },
  issuedAt: '2026-10-15T10:30:00.000Z',
  isLegacy: false,
  cancellationMarker: null,
  supplier: {
    name,
    address: null,
    state: null,
    stateCode: null,
    gstin: null,
    phone: null,
    signatory: null,
  },
  customer: { kind: 'walk-in', label: 'Walk-in customer' },
  placeOfSupply: null,
  items: [
    {
      key: '1',
      name: footer,
      sku: null,
      hsnCode: null,
      uqcCode: null,
      unitLabel: null,
      quantity: 1,
      unitPrice: '10.00',
      mrpUnitPrice: null,
      mrpSavings: null,
      grossAmount: '10.00',
      discountAmount: '0.00',
      taxableAmount: '10.00',
      gstRate: null,
      cgstAmount: null,
      sgstAmount: null,
      igstAmount: null,
      lineTotal: '10.00',
    },
  ],
  totals: {
    subtotal: '10.00',
    itemDiscount: '0.00',
    billDiscount: '0.00',
    discount: '0.00',
    gst: '0.00',
    total: '10.00',
    mrpSavings: null,
  },
  payment: {
    status: 'PAID',
    statusLabel: 'Paid',
    paid: '10.00',
    remaining: '0.00',
    modes: ['CASH'],
    lastAllocationAt: null,
    asOf: '2026-10-15T10:31:00.000Z',
    allocations: [],
  },
  footer,
});

describe('renderReceiptPdf', () => {
  it.each([
    ['58mm', 164.41],
    ['80mm', 226.77],
    [undefined, 595.28],
  ] as const)(
    'renders the actual %s PDF page width',
    async (paperWidth, expectedWidth) => {
      const blob = await renderReceiptPdf(receiptFor('Rajesh Kirana', 'Thank you'), paperWidth);
      const bytes =
        typeof blob.arrayBuffer === 'function'
          ? await blob.arrayBuffer()
          : await new Promise<ArrayBuffer>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                reader.result instanceof ArrayBuffer
                  ? resolve(reader.result)
                  : reject(new Error('PDF bytes could not be read'));
              reader.onerror = () => reject(new Error('PDF bytes could not be read'));
              reader.readAsArrayBuffer(blob);
            });
      const source = Array.from(new Uint8Array(bytes), (value) => String.fromCharCode(value)).join(
        ''
      );
      const page = source.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)/);

      expect(page).not.toBeNull();
      expect(Number(page?.[1])).toBeCloseTo(expectedWidth, 1);
    },
    20_000
  );

  it.each([
    ['Latin', 'Rajesh Kirana', 'Thank you'],
    ['Devanagari', 'राजेश किराणा', 'धन्यवाद'],
    ['Gujarati', 'રાજેશ કિરાણા', 'આભાર'],
  ])(
    'creates a non-empty A4 PDF for %s receipt text',
    async (_script, name, footer) => {
      const blob = await renderReceiptPdf(receiptFor(name, footer));
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(1_000);
    },
    20_000
  );
});
