import { apiSlice } from './apiSlice';
import type { ApiResponse, DocumentMode, FinalizedDocumentDto, HeldBill, Invoice } from '../types';

export interface InvoiceQuote {
  fingerprint: string;
  document_mode: DocumentMode;
  settings_version: number;
  subtotal_amount: string;
  item_discount_amount: string;
  bill_discount_amount: string;
  discount_amount: string;
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  gst_amount: string;
  total_amount: string;
  lines: Array<{
    variant_id: string;
    quantity: number;
    unit_price: string;
    line_total_amount: string;
  }>;
}

export interface InvoiceQuotePayload {
  customer_id?: string | null;
  place_of_supply_code?: string;
  discount_amount?: number;
  items: Array<{
    variant_id: string;
    quantity: number;
    price?: number;
    discount_amount?: number;
  }>;
}

export interface NonDocumentDto {
  kind: 'NON_DOCUMENT';
  reason: 'NOT_ISSUED';
  invoice_id: string;
  status: string;
}

interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
  pagination: {
    total: number;
    skip: number;
    take: number;
  };
}

interface CreateInvoicePayload {
  customer_id?: string;
  items: Array<{
    variant_id: string;
    quantity: number;
    price?: number; // Optional price override
    discount_amount?: number; // Item-level discount
  }>;
  gst_amount?: number;
  discount_amount?: number; // Bill-level discount
  invoice_url?: string;
  idempotency_key?: string;
  status?: 'DRAFT' | 'FINALIZED'; // Default: DRAFT
  counter_label?: string;
  place_of_supply_code?: string;
  quote_fingerprint?: string;
  quoted_payable?: string;
}

interface UpdateInvoicePayload {
  customer_id?: string | null;
  items?: Array<{
    variant_id: string;
    quantity: number;
    price?: number;
    discount_amount?: number;
  }>;
  gst_amount?: number;
  discount_amount?: number;
  invoice_url?: string;
  expected_version?: number;
}

interface HeldBillVersionPayload {
  id: string;
  expected_version: number;
}

interface HeldBillCounterPayload extends HeldBillVersionPayload {
  counter_label: string;
}

export const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<
      InvoicesResponse,
      { skip?: number; take?: number; status?: string } | void
    >({
      query: (params = {}) => ({
        url: '/invoices',
        params: params || {},
      }),
      providesTags: ['Invoice'],
    }),
    getInvoiceById: builder.query<ApiResponse<Invoice>, string>({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),
    getFinalizedDocument: builder.query<ApiResponse<FinalizedDocumentDto | NonDocumentDto>, string>(
      {
        query: (id) => `/invoices/${id}/document`,
        providesTags: (result, error, id) => [{ type: 'Invoice', id }],
      }
    ),
    quoteInvoice: builder.mutation<ApiResponse<InvoiceQuote>, InvoiceQuotePayload>({
      query: (body) => ({ url: '/invoices/quote', method: 'POST', body }),
    }),
    getHeldBills: builder.query<ApiResponse<HeldBill[]>, { take?: number } | void>({
      query: (params = {}) => ({ url: '/invoices/held', params: params || {} }),
      providesTags: ['Invoice'],
    }),
    createInvoice: builder.mutation<ApiResponse<Invoice>, CreateInvoicePayload>({
      query: (body) => ({
        url: '/invoices',
        method: 'POST',
        body,
        headers: body.idempotency_key ? { 'idempotency-key': body.idempotency_key } : {},
      }),
      invalidatesTags: (result, error, body) => [
        'Invoice',
        'Inventory',
        'Dashboard',
        ...(body.customer_id ? (['Customer'] as const) : []),
      ],
    }),
    updateInvoice: builder.mutation<
      ApiResponse<Invoice>,
      { id: string; data: UpdateInvoicePayload }
    >({
      query: ({ id, data }) => ({
        url: `/invoices/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Invoice', id }, 'Invoice'],
    }),
    finalizeInvoice: builder.mutation<
      ApiResponse<Invoice>,
      {
        id: string;
        expected_version?: number;
        place_of_supply_code?: string;
        quote_fingerprint?: string;
        quoted_payable?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/invoices/${id}/finalize`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
        'Inventory',
        'Customer',
      ],
    }),
    cancelInvoice: builder.mutation<
      ApiResponse<Invoice>,
      { id: string; reason?: string; expected_version?: number }
    >({
      query: ({ id, reason, expected_version }) => ({
        url: `/invoices/${id}/cancel`,
        method: 'POST',
        body: { reason, expected_version },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
        'Inventory',
        'Customer',
      ],
    }),
    claimHeldBill: builder.mutation<ApiResponse<HeldBill>, HeldBillCounterPayload>({
      query: ({ id, ...body }) => ({ url: `/invoices/held/${id}/claim`, method: 'POST', body }),
      invalidatesTags: ['Invoice', 'Dashboard'],
    }),
    renewHeldBill: builder.mutation<ApiResponse<HeldBill>, HeldBillVersionPayload>({
      query: ({ id, ...body }) => ({ url: `/invoices/held/${id}/renew`, method: 'POST', body }),
    }),
    releaseHeldBill: builder.mutation<ApiResponse<HeldBill>, HeldBillVersionPayload>({
      query: ({ id, ...body }) => ({ url: `/invoices/held/${id}/release`, method: 'POST', body }),
      invalidatesTags: ['Invoice', 'Dashboard'],
    }),
    takeoverHeldBill: builder.mutation<ApiResponse<HeldBill>, HeldBillCounterPayload>({
      query: ({ id, ...body }) => ({ url: `/invoices/held/${id}/takeover`, method: 'POST', body }),
      invalidatesTags: ['Invoice', 'Dashboard'],
    }),
    getPendingInvoicesByCustomer: builder.query<ApiResponse<Invoice[]>, string>({
      query: (customerId) => `/invoices/customers/${customerId}/pending-invoices`,
      providesTags: (result, error, customerId) => [
        { type: 'Invoice', id: `pending-${customerId}` },
        'Invoice',
      ],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useGetFinalizedDocumentQuery,
  useQuoteInvoiceMutation,
  useGetHeldBillsQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useFinalizeInvoiceMutation,
  useCancelInvoiceMutation,
  useClaimHeldBillMutation,
  useRenewHeldBillMutation,
  useReleaseHeldBillMutation,
  useTakeoverHeldBillMutation,
  useGetPendingInvoicesByCustomerQuery,
  useLazyGetPendingInvoicesByCustomerQuery,
} = invoiceApi;
