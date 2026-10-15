import type { FinalizedDocumentDto } from '@core/types';

export type { FinalizedDocumentDto } from '@core/types';

export type ReceiptDocumentMode = 'SIMPLE_RECEIPT' | 'GST_TAX_INVOICE';
export type ReceiptPaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'AMOUNT_DUE';
export type ReceiptPaperWidth = '58mm' | '80mm';

export interface ReceiptLabels {
  invoice: string;
  date: string;
  customer: string;
  gstin: string;
  placeOfSupply: string;
  item: string;
  hsn: string;
  qty: string;
  rate: string;
  tax: string;
  amount: string;
  subtotal: string;
  discount: string;
  gst: string;
  total: string;
  paid: string;
  remaining: string;
  paymentMode: string;
  paymentAsOf: string;
  legacy: string;
  authorizedSignatory: string;
  saleItems: string;
  billTotals: string;
}

export interface ReceiptViewModel {
  labels: ReceiptLabels;
  invoiceId: string;
  invoiceNumber: string;
  title: 'Receipt' | 'Tax Invoice';
  mode: ReceiptDocumentMode;
  issuedAt: string | null;
  isLegacy: boolean;
  cancellationMarker: string | null;
  supplier: {
    name: string;
    address: string | null;
    state: string | null;
    stateCode: string | null;
    gstin: string | null;
    phone: string | null;
    signatory: string | null;
  };
  customer:
    | { kind: 'walk-in'; label: 'Walk-in customer' }
    | {
        kind: 'named';
        name: string;
        phone: string | null;
        address: string | null;
        state: string | null;
        stateCode: string | null;
        gstin: string | null;
      };
  placeOfSupply: { name: string | null; stateCode: string | null } | null;
  items: Array<{
    key: string;
    name: string;
    sku: string | null;
    hsnCode: string | null;
    uqcCode: string | null;
    unitLabel: string | null;
    quantity: number;
    unitPrice: string;
    grossAmount: string;
    discountAmount: string;
    taxableAmount: string;
    gstRate: string | null;
    cgstAmount: string | null;
    sgstAmount: string | null;
    igstAmount: string | null;
    lineTotal: string;
  }>;
  totals: {
    subtotal: string;
    itemDiscount: string;
    billDiscount: string;
    discount: string;
    gst: string;
    total: string;
  };
  payment: {
    status: ReceiptPaymentStatus;
    statusLabel: 'Paid' | 'Partially paid' | 'Amount due';
    paid: string;
    remaining: string;
    modes: string[];
    lastAllocationAt: string | null;
    asOf: string;
    allocations: FinalizedDocumentDto['payment']['allocations'];
  };
  footer: string | null;
}
