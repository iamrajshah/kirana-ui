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

export interface BankAccount {
  id: string;
  tenant_id: string;
  supplier_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string; // masked by backend
  ifsc_code: string;
  branch_name: string | null;
  account_type: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
    // Bank Account endpoints
    getBankAccounts: builder.query<ApiResponse<BankAccount[]>, string>({
      query: (supplierId) => `/suppliers/${supplierId}/bank-accounts`,
      providesTags: (_result, _error, supplierId) => [{ type: 'Supplier', id: supplierId }],
    }),
    createBankAccount: builder.mutation<
      ApiResponse<BankAccount>,
      { 
        supplierId: string;
        account_holder_name: string;
        bank_name: string;
        account_number: string;
        ifsc_code: string;
        branch_name?: string;
        account_type?: string;
        is_primary?: boolean;
      }
    >({
      query: ({ supplierId, ...body }) => ({
        url: `/suppliers/${supplierId}/bank-accounts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { supplierId }) => [{ type: 'Supplier', id: supplierId }],
    }),
    updateBankAccount: builder.mutation<
      ApiResponse<BankAccount>,
      {
        supplierId: string;
        bankAccountId: string;
        account_holder_name?: string;
        bank_name?: string;
        account_number?: string;
        ifsc_code?: string;
        branch_name?: string;
        account_type?: string;
        is_primary?: boolean;
      }
    >({
      query: ({ supplierId, bankAccountId, ...body }) => ({
        url: `/suppliers/${supplierId}/bank-accounts/${bankAccountId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { supplierId }) => [{ type: 'Supplier', id: supplierId }],
    }),
    deleteBankAccount: builder.mutation<
      ApiResponse<void>,
      { supplierId: string; bankAccountId: string }
    >({
      query: ({ supplierId, bankAccountId }) => ({
        url: `/suppliers/${supplierId}/bank-accounts/${bankAccountId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { supplierId }) => [{ type: 'Supplier', id: supplierId }],
    }),
    setPrimaryBankAccount: builder.mutation<
      ApiResponse<BankAccount>,
      { supplierId: string; bankAccountId: string }
    >({
      query: ({ supplierId, bankAccountId }) => ({
        url: `/suppliers/${supplierId}/bank-accounts/${bankAccountId}/set-primary`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { supplierId }) => [{ type: 'Supplier', id: supplierId }],
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
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
  useUpdateBankAccountMutation,
  useDeleteBankAccountMutation,
  useSetPrimaryBankAccountMutation,
} = supplierApi;
