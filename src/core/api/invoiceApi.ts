import { apiSlice } from './apiSlice';
import type { ApiResponse, Invoice, InvoiceItem } from '../types';

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
  customer_id: string;
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
}

interface UpdateInvoicePayload {
  customer_id?: string;
  items?: Array<{
    variant_id: string;
    quantity: number;
    price?: number;
    discount_amount?: number;
  }>;
  gst_amount?: number;
  discount_amount?: number;
  invoice_url?: string;
}

export const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<
      InvoicesResponse,
      { skip?: number; take?: number; status?: string } | void
    >({
      query: (params = {}) => ({
        url: '/invoices',
        params,
      }),
      providesTags: ['Invoice'],
    }),
    getInvoiceById: builder.query<ApiResponse<Invoice>, string>({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),
    createInvoice: builder.mutation<ApiResponse<Invoice>, CreateInvoicePayload>({
      query: (body) => ({
        url: '/invoices',
        method: 'POST',
        body,
        headers: body.idempotency_key
          ? { 'idempotency-key': body.idempotency_key }
          : {},
      }),
      invalidatesTags: ['Invoice', 'Inventory', 'Dashboard', 'Customer'],
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
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
      ],
    }),
    finalizeInvoice: builder.mutation<ApiResponse<Invoice>, string>({
      query: (id) => ({
        url: `/invoices/${id}/finalize`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Invoice', id },
        'Invoice',
        'Inventory',
        'Customer',
      ],
    }),
    cancelInvoice: builder.mutation<
      ApiResponse<Invoice>,
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/invoices/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
        'Inventory',
        'Customer',
      ],
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
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useFinalizeInvoiceMutation,
  useCancelInvoiceMutation,
  useGetPendingInvoicesByCustomerQuery,
  useLazyGetPendingInvoicesByCustomerQuery,
} = invoiceApi;
