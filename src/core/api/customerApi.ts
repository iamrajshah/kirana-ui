import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse, Customer } from '../types';

export interface LedgerEntry {
  id: string;
  entry_type: 'OPENING_BALANCE' | 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'ADJUSTMENT';
  amount: number;
  description: string;
  reference_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface CustomerLedgerResponse {
  ledger: LedgerEntry[];
  summary: LedgerSummary;
}

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<
      PaginatedApiResponse<Customer>,
      { skip?: number; take?: number; search?: string }
    >({
      query: (params = {}) => ({
        url: '/customers',
        params,
      }),
      providesTags: ['Customer'],
    }),
    searchCustomers: builder.query<
      PaginatedApiResponse<Customer>,
      string
    >({
      query: (searchQuery) => ({
        url: '/customers',
        params: { search: searchQuery, take: 10 },
      }),
      providesTags: ['Customer'],
    }),
    getCustomerById: builder.query<ApiResponse<Customer>, string>({
      query: (id) => `/customers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id }],
    }),
    createCustomer: builder.mutation<
      ApiResponse<Customer>,
      { name: string; phone: string; email?: string; opening_balance?: number }
    >({
      query: (body) => ({
        url: '/customers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Customer'],
    }),
    updateCustomer: builder.mutation<
      ApiResponse<Customer>,
      { id: string; name?: string; phone?: string; email?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/customers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Customer', id }],
    }),
    getCustomerLedger: builder.query<
      ApiResponse<CustomerLedgerResponse>,
      { id: string; page?: number; limit?: number }
    >({
      query: ({ id, page = 1, limit = 50 }) => ({
        url: `/customers/${id}/ledger`,
        params: { page, limit },
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'Customer', id }, 'Payment'],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useLazySearchCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useGetCustomerLedgerQuery,
} = customerApi;
