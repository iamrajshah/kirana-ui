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

export const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<
      InvoicesResponse,
      { skip?: number; take?: number } | void
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
  useGetInvoiceByIdQuery,
  useCreateInvoiceMutation,
} = invoiceApi;
