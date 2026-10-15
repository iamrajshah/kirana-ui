import type { FinalizedDocumentDto, ReceiptPaymentStatus, ReceiptViewModel } from './types';
import type { ReceiptLabels } from './types';
import { defaultReceiptLabels } from './receiptLabels';

const paymentLabels: Record<ReceiptPaymentStatus, ReceiptViewModel['payment']['statusLabel']> = {
  PAID: 'Paid',
  PARTIALLY_PAID: 'Partially paid',
  AMOUNT_DUE: 'Amount due',
};

export const mapReceiptDocument = (
  document: FinalizedDocumentDto,
  labelOverrides: Partial<ReceiptLabels> = {}
): ReceiptViewModel => ({
  labels: { ...defaultReceiptLabels, ...labelOverrides },
  invoiceId: document.invoice_id,
  invoiceNumber: document.invoice_number ?? `Invoice ${document.invoice_id}`,
  title: document.document_mode === 'GST_TAX_INVOICE' && !document.legacy ? 'Tax Invoice' : 'Receipt',
  mode:
    document.document_mode === 'GST_TAX_INVOICE' && !document.legacy
      ? 'GST_TAX_INVOICE'
      : 'SIMPLE_RECEIPT',
  issuedAt: document.issued_at,
  isLegacy: document.legacy,
  cancellationMarker: document.cancellation.cancelled ? document.cancellation.marker : null,
  supplier: {
    name: document.supplier.name ?? 'Kirana Store',
    address: document.supplier.address,
    state: document.supplier.state,
    stateCode: document.supplier.state_code,
    gstin: document.legacy ? null : document.supplier.gstin,
    phone: document.supplier.phone,
    signatory: document.supplier.signatory ?? null,
  },
  customer: document.customer
    ? {
        kind: 'named',
        name: document.customer.name ?? 'Customer',
        phone: document.customer.phone,
        address: document.customer.address,
        state: document.customer.state,
        stateCode: document.customer.state_code,
        gstin: document.legacy ? null : document.customer.gstin,
      }
    : { kind: 'walk-in', label: 'Walk-in customer' },
  placeOfSupply: document.legacy
    ? null
    : document.place_of_supply && {
        name: document.place_of_supply.name,
        stateCode: document.place_of_supply.state_code,
      },
  items: document.items.map((item, index) => ({
    key: item.id ?? item.variant_id ?? `${index}`,
    name: item.product_name ?? 'Item',
    sku: item.sku,
    hsnCode: document.legacy ? null : item.hsn_code,
    uqcCode: document.legacy ? null : item.uqc_code,
    unitLabel: item.unit_label,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    grossAmount: item.gross_amount,
    discountAmount: item.item_discount_amount,
    taxableAmount: item.taxable_amount,
    gstRate: document.legacy ? null : item.gst_rate,
    cgstAmount: document.legacy ? null : item.cgst_amount,
    sgstAmount: document.legacy ? null : item.sgst_amount,
    igstAmount: document.legacy ? null : item.igst_amount,
    lineTotal: item.line_total_amount,
  })),
  totals: {
    subtotal: document.totals.subtotal_amount,
    itemDiscount: document.totals.item_discount_amount,
    billDiscount: document.totals.bill_discount_amount,
    discount: document.totals.discount_amount,
    gst: document.totals.gst_amount,
    total: document.totals.total_amount,
  },
  payment: {
    status: document.payment.status,
    statusLabel: paymentLabels[document.payment.status],
    paid: document.payment.paid_amount,
    remaining: document.payment.remaining_amount,
    modes: document.payment.modes,
    lastAllocationAt: document.payment.last_allocation_at,
    asOf: document.payment.as_of,
    allocations: document.payment.allocations,
  },
  footer: document.footer,
});
