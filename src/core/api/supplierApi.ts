import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse } from '../types';
import type { FirmSummary } from './firmApi';

export interface SupplierFirmBalance {
  firm_id: string;
  firm: FirmSummary;
  balance: number;
}

export type SupplierPaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK';

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  balance?: number;
  default_purchase_firm_id?: string | null;
  default_purchase_firm?: FirmSummary | null;
  balances_by_firm?: SupplierFirmBalance[];
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
  firm_id: string;
  firm?: FirmSummary;
}

export interface SupplierLedgerResponse {
  entries: SupplierLedgerEntry[];
  summary: {
    totalCredit: number;
    totalDebit: number;
    balance: number;
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
      {
        name: string;
        phone?: string;
        email?: string;
        address?: string;
        default_purchase_firm_id?: number | null;
      }
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
      {
        id: string;
        name?: string;
        phone?: string;
        email?: string;
        address?: string;
        default_purchase_firm_id?: number | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/suppliers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, error, { id }) => [
        { type: 'Supplier', id },
        'Report',
        ...(error ? [] : (['Dashboard'] as const)),
      ],
    }),
    addSupplierOpeningBalance: builder.mutation<
      ApiResponse<unknown>,
      { id: string; firm_id: number; amount: number }
    >({
      query: ({ id, firm_id, amount }) => ({
        url: `/suppliers/${id}/opening-balance`,
        method: 'POST',
        body: { firm_id, amount },
      }),
      invalidatesTags: (_result, error, { id }) => [
        { type: 'Supplier', id },
        'Report',
        ...(error ? [] : (['Dashboard'] as const)),
      ],
    }),
    getSupplierLedger: builder.query<
      ApiResponse<SupplierLedgerResponse>,
      { id: string; page?: number; limit?: number; firm_id?: string }
    >({
      query: ({ id, page = 1, limit = 50, firm_id }) => ({
        url: `/suppliers/${id}/ledger`,
        params: { page, limit, ...(firm_id ? { firm_id } : {}) },
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'Supplier', id }],
    }),
    makeSupplierPayment: builder.mutation<
      ApiResponse<unknown>,
      {
        id: string;
        firm_id: number;
        amount: number;
        payment_mode: SupplierPaymentMode;
        description?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/suppliers/${id}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, error, { id }) => [
        { type: 'Supplier', id },
        'Report',
        ...(error ? [] : (['Dashboard'] as const)),
      ],
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
