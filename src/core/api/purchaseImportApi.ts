import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export type PurchaseImportStatus = 'READY' | 'NEEDS_REVIEW' | 'CONFIRMED' | 'FAILED';

export interface PurchaseImportSupplier {
  id?: string | null;
  name?: string | null;
  gstNumber?: string | null;
}

export interface PurchaseImportLine {
  lineId: string;
  rawText?: string;
  variantId?: string | null;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  gstRate?: number | null;
  hsnCode?: string | null;
  batchNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  confidence?: number | null;
  purchaseMode?: 'UNIT' | 'PACK';
  purchaseUnitLabel?: string;
  unitsPerPurchaseUnit?: number;
}

export interface PurchaseImportDraft {
  draftId: string;
  status: PurchaseImportStatus;
  supplier?: PurchaseImportSupplier | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  items: PurchaseImportLine[];
  subtotal?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  warnings: string[];
}

export interface ConfirmPurchaseImportInput {
  draftId: string;
  supplier_id: number;
  firm_id: number;
  invoice_number: string;
  invoice_date: string;
  items: Array<{
    variant_id: number;
    quantity: number;
    unit_price: number;
    gst_rate?: number;
    hsn_code?: string;
    units_per_purchase_unit?: number;
    purchase_unit_label?: string;
    batch_number?: string;
    manufacturing_date?: string;
    expiry_date?: string;
  }>;
  payment_amount?: number;
  payment_mode?: 'CASH' | 'UPI' | 'CARD' | 'BANK';
  prices_include_tax: boolean;
  acknowledge_total_mismatch: boolean;
}

export interface ExtractPurchaseBillInput {
  document: File;
  extractedText?: string;
  extractionSource?: 'CLIENT_EXTRACTED_TEXT';
  ocrConfidence?: number;
}

export const buildPurchaseImportFormData = ({
  document,
  extractedText,
  extractionSource,
  ocrConfidence,
}: ExtractPurchaseBillInput): FormData => {
  const body = new FormData();
  body.append('document', document);
  if (extractedText) body.append('extractedText', extractedText);
  if (extractionSource) body.append('extractionSource', extractionSource);
  if (typeof ocrConfidence === 'number') body.append('ocrConfidence', String(ocrConfidence));
  return body;
};

export const purchaseImportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    extractPurchaseBill: builder.mutation<
      ApiResponse<PurchaseImportDraft>,
      ExtractPurchaseBillInput
    >({
      query: (input) => ({
        url: '/purchases/import/extract',
        method: 'POST',
        body: buildPurchaseImportFormData(input),
      }),
    }),
    getPurchaseImportDraft: builder.query<ApiResponse<PurchaseImportDraft>, string>({
      query: (draftId) => `/purchases/import/${draftId}`,
    }),
    confirmPurchaseImport: builder.mutation<
      ApiResponse<{
        draftId: string;
        status: 'CONFIRMED';
        purchase: { id: string };
      }>,
      ConfirmPurchaseImportInput
    >({
      query: ({ draftId, ...body }) => ({
        url: `/purchases/import/${draftId}/confirm`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Purchase', 'Supplier', 'Inventory', 'Report', 'Dashboard'],
    }),
  }),
});

export const {
  useExtractPurchaseBillMutation,
  useGetPurchaseImportDraftQuery,
  useConfirmPurchaseImportMutation,
} = purchaseImportApi;
