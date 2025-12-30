import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse, Invoice, InvoiceItem } from '../types';

export const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<
      PaginatedApiResponse<Invoice>,
      { skip?: number; take?: number } | void
    >({
      query: (params = {}) => ({
        url: '/invoices',
        params,
      }),
      providesTags: ['Invoice'],
    }),
    createInvoice: builder.mutation<
      ApiResponse<Invoice>,
      {
        customer_id: string;
        items: InvoiceItem[];
        gst_amount?: number;
        invoice_url?: string;
        idempotency_key?: string;
      }
    >({
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
  }),
});

export const {
  useGetInvoicesQuery,
  useCreateInvoiceMutation,
} = invoiceApi;
