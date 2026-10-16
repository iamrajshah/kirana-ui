// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReceiptDocument } from './ReceiptDocument';
import type { ReceiptViewModel } from './types';
import { defaultReceiptLabels } from './receiptLabels';

const receipt = (mode: ReceiptViewModel['mode'] = 'SIMPLE_RECEIPT'): ReceiptViewModel => ({
  labels: defaultReceiptLabels,
  invoiceId: '42',
  invoiceNumber: 'INV-42',
  title: mode === 'GST_TAX_INVOICE' ? 'Tax Invoice' : 'Receipt',
  mode,
  issuedAt: '2026-10-15T10:30:00.000Z',
  isLegacy: false,
  cancellationMarker: null,
  supplier: {
    name: 'Rajesh Kirana',
    address: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    gstin: mode === 'GST_TAX_INVOICE' ? '27AAAAA0000A1Z5' : null,
    phone: '9999999999',
    signatory: null,
  },
  customer: { kind: 'walk-in', label: 'Walk-in customer' },
  placeOfSupply: mode === 'GST_TAX_INVOICE' ? { name: 'Maharashtra', stateCode: '27' } : null,
  items: [{
    key: '1', name: 'Rice', sku: 'RICE', hsnCode: mode === 'GST_TAX_INVOICE' ? '1006' : null,
    uqcCode: 'KGS', unitLabel: 'kg', quantity: 2, unitPrice: '60.00', grossAmount: '120.00',
    discountAmount: '0.00', taxableAmount: '120.00', gstRate: mode === 'GST_TAX_INVOICE' ? '5.00' : null,
    cgstAmount: '3.00', sgstAmount: '3.00', igstAmount: '0.00', lineTotal: '126.00',
  }],
  totals: { subtotal: '120.00', itemDiscount: '0.00', billDiscount: '0.00', discount: '0.00', gst: '6.00', total: '126.00' },
  payment: { status: 'PARTIALLY_PAID', statusLabel: 'Partially paid', paid: '50.00', remaining: '76.00', modes: ['CASH'], lastAllocationAt: null, asOf: '2026-10-15T11:00:00.000Z', allocations: [] },
  footer: 'Thank you',
});

afterEach(cleanup);

describe('ReceiptDocument', () => {
  it('renders authoritative item, total, and current payment values', () => {
    render(<ReceiptDocument receipt={receipt()} />);

    expect(screen.getByRole('article', { name: 'Receipt INV-42' })).toBeTruthy();
    expect(screen.getByText('Rice')).toBeTruthy();
    expect(screen.getAllByText('₹126.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Partially paid')).toBeTruthy();
    expect(screen.getByText('Remaining: ₹76.00')).toBeTruthy();
  });

  it('adds GST particulars only for a GST tax invoice', () => {
    const { rerender } = render(<ReceiptDocument receipt={receipt()} />);
    expect(screen.queryByText('HSN')).toBeNull();

    rerender(<ReceiptDocument receipt={receipt('GST_TAX_INVOICE')} />);
    expect(screen.getByText('HSN')).toBeTruthy();
    expect(screen.getByText('1006')).toBeTruthy();
    expect(screen.getByText('GSTIN: 27AAAAA0000A1Z5')).toBeTruthy();
  });

  it('keeps simple quantities printable and falls back to UQC for the unit', () => {
    const simple = receipt();
    simple.items[0] = { ...simple.items[0], unitLabel: null, uqcCode: 'KGS' };
    const { container } = render(<ReceiptDocument receipt={simple} />);

    expect(container.querySelector('article')?.className).toContain('sale-receipt--simple');
    expect(container.textContent).toContain('2 KGS');
  });
});
