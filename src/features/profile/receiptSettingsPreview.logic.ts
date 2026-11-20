import type { UpdateTenantDocumentSettings } from '@core/types';
import type { ReceiptViewModel } from '../invoices/receipt/types';
import { defaultReceiptLabels } from '../invoices/receipt/receiptLabels';

export const sampleReceipt = (
  form: UpdateTenantDocumentSettings,
  count: number,
  productName: string,
  customerName: string,
  previewMarker: string
): ReceiptViewModel => ({
  labels: defaultReceiptLabels,
  invoiceId: 'PREVIEW',
  invoiceNumber: 'PREVIEW',
  title: form.document_mode === 'GST_TAX_INVOICE' ? 'Tax Invoice' : 'Receipt',
  mode: form.document_mode || 'SIMPLE_RECEIPT',
  branding: {
    template: form.receipt_template || 'CLASSIC',
    brandColor: /^#[0-9a-f]{6}$/i.test(form.brand_color || '') ? form.brand_color! : '#087F5B',
    logoUrl: /^https:\/\//.test(form.logo_url || '') ? form.logo_url! : null,
  },
  issuedAt: '2026-01-01T06:30:00.000Z',
  isLegacy: false,
  cancellationMarker: null,
  demoMarker: previewMarker,
  supplier: {
    name: form.supplier_name || 'Kirana',
    address:
      [form.address_line1, form.address_line2, form.city, form.postal_code]
        .filter(Boolean)
        .join(', ') || null,
    state: form.state || null,
    stateCode: form.state_code || null,
    gstin: form.gstin || null,
    phone: form.phone || null,
    signatory: form.authorized_signatory || null,
  },
  customer: {
    kind: 'named',
    name: customerName,
    phone: null,
    address: null,
    state: null,
    stateCode: null,
    gstin: null,
  },
  placeOfSupply: null,
  items: Array.from({ length: count }, (_, index) => ({
    key: String(index),
    name: `${productName} ${index + 1}`,
    sku: `PREVIEW-${index + 1}`,
    hsnCode: null,
    uqcCode: null,
    unitLabel: null,
    quantity: 5,
    unitPrice: '40.00',
    mrpUnitPrice: '50.00',
    mrpSavings: '50.00',
    grossAmount: '200.00',
    discountAmount: '0.00',
    taxableAmount: '200.00',
    gstRate: null,
    cgstAmount: null,
    sgstAmount: null,
    igstAmount: null,
    lineTotal: '200.00',
  })),
  totals: {
    subtotal: (200 * count).toFixed(2),
    itemDiscount: '0.00',
    billDiscount: '0.00',
    discount: '0.00',
    gst: '0.00',
    total: (200 * count).toFixed(2),
    mrpSavings: (50 * count).toFixed(2),
  },
  payment: {
    status: 'PAID',
    statusLabel: 'Paid',
    paid: (200 * count).toFixed(2),
    remaining: '0.00',
    modes: ['CASH'],
    lastAllocationAt: null,
    asOf: '2026-01-01T06:30:00.000Z',
    allocations: [],
  },
  footer: form.footer || null,
});
