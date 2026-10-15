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

export interface DocumentPartyDto {
  id?: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  state: string | null;
  state_code: string | null;
  gstin: string | null;
  signatory?: string | null;
}

export interface FinalizedDocumentDto {
  kind: 'FINALIZED_DOCUMENT';
  invoice_id: string;
  invoice_number: string | null;
  issued_at: string | null;
  document_mode: ReceiptDocumentMode;
  legacy: boolean;
  cancellation: { cancelled: boolean; marker: string | null };
  supplier: DocumentPartyDto;
  customer: DocumentPartyDto | null;
  place_of_supply: { name: string | null; state_code: string | null } | null;
  totals: {
    subtotal_amount: string;
    item_discount_amount: string;
    bill_discount_amount: string;
    discount_amount: string;
    gst_amount: string;
    total_amount: string;
  };
  items: Array<{
    id?: string;
    variant_id: string | null;
    product_name: string | null;
    sku: string | null;
    hsn_code: string | null;
    uqc_code: string | null;
    unit_label: string | null;
    quantity: number;
    unit_price: string;
    gross_amount: string;
    item_discount_amount: string;
    allocated_bill_discount_amount: string;
    taxable_amount: string;
    gst_rate: string | null;
    cgst_amount: string | null;
    sgst_amount: string | null;
    igst_amount: string | null;
    line_total_amount: string;
  }>;
  footer: string | null;
  payment: {
    status: ReceiptPaymentStatus;
    paid_amount: string;
    remaining_amount: string;
    modes: string[];
    last_allocation_at: string | null;
    as_of: string;
    allocations: Array<{
      payment_id?: string;
      amount: string;
      payment_mode: string | null;
      reference_note: string | null;
      created_at: string | null;
    }>;
  };
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
