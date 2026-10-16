import { describe, expect, it } from 'vitest';
import { mapReceiptDocument } from './receiptMapper';
import type { FinalizedDocumentDto } from './types';

const documentFixture = (overrides: Partial<FinalizedDocumentDto> = {}): FinalizedDocumentDto => ({
  kind: 'FINALIZED_DOCUMENT',
  invoice_id: '42',
  invoice_number: 'INV-26-000042',
  issued_at: '2026-10-15T10:30:00.000Z',
  document_mode: 'SIMPLE_RECEIPT',
  legacy: false,
  cancellation: { cancelled: false, marker: null },
  supplier: {
    name: 'Rajesh Kirana',
    address: 'Pune, Maharashtra',
    state: 'Maharashtra',
    state_code: '27',
    gstin: null,
    phone: '9999999999',
    signatory: null,
  },
  customer: null,
  place_of_supply: null,
  totals: {
    subtotal_amount: '125.00',
    item_discount_amount: '5.00',
    bill_discount_amount: '0.00',
    discount_amount: '5.00',
    gst_amount: '0.00',
    total_amount: '120.00',
  },
  items: [
    {
      id: '1',
      variant_id: '11',
      product_name: 'Rice',
      sku: 'RICE-1KG',
      hsn_code: null,
      uqc_code: null,
      unit_label: 'kg',
      quantity: 2,
      unit_price: '62.50',
      gross_amount: '125.00',
      item_discount_amount: '5.00',
      allocated_bill_discount_amount: '0.00',
      taxable_amount: '120.00',
      gst_rate: null,
      cgst_amount: null,
      sgst_amount: null,
      igst_amount: null,
      line_total_amount: '120.00',
    },
  ],
  footer: 'Thank you',
  payment: {
    status: 'AMOUNT_DUE',
    paid_amount: '0.00',
    remaining_amount: '120.00',
    modes: [],
    last_allocation_at: null,
    as_of: '2026-10-15T11:00:00.000Z',
    allocations: [],
  },
  ...overrides,
});

describe('mapReceiptDocument', () => {
  it('maps a simple walk-in receipt without inventing a customer', () => {
    const receipt = mapReceiptDocument(documentFixture());

    expect(receipt.title).toBe('Receipt');
    expect(receipt.customer).toEqual({ kind: 'walk-in', label: 'Walk-in customer' });
    expect(receipt.payment.statusLabel).toBe('Amount due');
    expect(receipt.items[0]).toMatchObject({ name: 'Rice', lineTotal: '120.00' });
  });

  it('maps GST particulars and preserves the authoritative amounts', () => {
    const receipt = mapReceiptDocument(
      documentFixture({
        document_mode: 'GST_TAX_INVOICE',
        supplier: {
          ...documentFixture().supplier,
          gstin: '27AAAAA0000A1Z5',
        },
        customer: {
          id: '5',
          name: 'Mehta Stores',
          phone: null,
          address: 'Surat',
          state: 'Gujarat',
          state_code: '24',
          gstin: '24BBBBB1111B1Z4',
        },
        place_of_supply: { name: 'Gujarat', state_code: '24' },
        items: [
          {
            ...documentFixture().items[0],
            hsn_code: '1006',
            uqc_code: 'KGS',
            gst_rate: '5.00',
            cgst_amount: '0.00',
            sgst_amount: '0.00',
            igst_amount: '6.00',
            taxable_amount: '120.00',
            line_total_amount: '126.00',
          },
        ],
        totals: { ...documentFixture().totals, gst_amount: '6.00', total_amount: '126.00' },
      })
    );

    expect(receipt.title).toBe('Tax Invoice');
    expect(receipt.supplier.gstin).toBe('27AAAAA0000A1Z5');
    expect(receipt.placeOfSupply).toEqual({ name: 'Gujarat', stateCode: '24' });
    expect(receipt.items[0]).toMatchObject({ hsnCode: '1006', igstAmount: '6.00' });
    expect(receipt.totals.total).toBe('126.00');
  });

  it('keeps legacy documents simple and propagates the cancellation marker', () => {
    const receipt = mapReceiptDocument(
      documentFixture({
        legacy: true,
        document_mode: 'SIMPLE_RECEIPT',
        cancellation: { cancelled: true, marker: 'CANCELLED — NOT VALID' },
      })
    );

    expect(receipt.isLegacy).toBe(true);
    expect(receipt.title).toBe('Receipt');
    expect(receipt.cancellationMarker).toBe('CANCELLED — NOT VALID');
  });
});

