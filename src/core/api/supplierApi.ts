import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse } from '../types';

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  balance?: number;
}

export interface SupplierLedgerEntry {
  id: string;
  ref_type: 'OPENING' | 'PURCHASE' | 'PAYMENT';
  ref_id: string | null;
  credit: number;
  debit: number;
  balance: number;
  payment_mode?: string;
  description?: string;
  created_at: string;
}

export interface SupplierLedgerResponse {
  entries: SupplierLedgerEntry[];
  supplier: {
    id: string;
    name: string;
  };
  balance: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const supplierApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<
      PaginatedApiResponse<Supplier>,
      { page?: number; limit?: number; isActive?: boolean } | void
    >({
      query: (params) => ({
        url: '/suppliers',
        params: params || {},
      }),
      providesTags: ['Supplier'],
    }),
    getSupplierById: builder.query<ApiResponse<Supplier>, string>({
      query: (id) => `/suppliers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Supplier', id }],
    }),
    createSupplier: builder.mutation<
      ApiResponse<Supplier>,
      { name: string; phone?: string; email?: string; address?: string }
    >({
      query: (body) => ({
        url: '/suppliers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Supplier'],
    }),
    updateSupplier: builder.mutation<
      ApiResponse<Supplier>,
      { id: string; name?: string; phone?: string; email?: string; address?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/suppliers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Supplier', id }],
    }),
    addSupplierOpeningBalance: builder.mutation<
      ApiResponse<any>,
      { id: string; amount: number }
    >({
      query: ({ id, amount }) => ({
        url: `/suppliers/${id}/opening-balance`,
        method: 'POST',
        body: { amount },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Supplier', id }],
    }),
    getSupplierLedger: builder.query<
      ApiResponse<SupplierLedgerResponse>,
      { id: string; page?: number; limit?: number }
    >({
      query: ({ id, page = 1, limit = 50 }) => ({
        url: `/suppliers/${id}/ledger`,
        params: { page, limit },
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'Supplier', id }],
    }),
    makeSupplierPayment: builder.mutation<
      ApiResponse<any>,
      { id: string; amount: number; payment_mode: 'CASH' | 'UPI' | 'CARD' | 'BANK'; description?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/suppliers/${id}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Supplier', id }],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useAddSupplierOpeningBalanceMutation,
  useGetSupplierLedgerQuery,
  useMakeSupplierPaymentMutation,
} = supplierApi;
