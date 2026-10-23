import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../types';

export interface FirmBankAccount {
  id?: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name?: string | null;
  account_type?: string | null;
  is_primary: boolean;
  is_active?: boolean;
}

export interface FirmSummary {
  id: string;
  code: string;
  legal_name: string;
  display_name: string;
  is_active: boolean;
  is_default_sales: boolean;
}

export interface Firm extends FirmSummary {
  tenant_id: string;
  gstin: string | null;
  pan: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  postal_code: string | null;
  phone: string | null;
  invoice_prefix: string;
  bank_accounts: FirmBankAccount[];
}

export type FirmInput = Omit<
  Firm,
  'id' | 'tenant_id' | 'is_default_sales' | 'bank_accounts'
> & { bank_accounts?: FirmBankAccount[] };

export const firmApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFirms: builder.query<ApiResponse<{ firms: FirmSummary[] }>, { active?: boolean } | void>({
      query: (params) => ({ url: '/firms', params: params || {} }),
      providesTags: (result) => [
        'Firm',
        ...(result?.data.firms.map((firm) => ({ type: 'Firm' as const, id: firm.id })) || []),
      ],
    }),
    getFirm: builder.query<ApiResponse<Firm>, string>({
      query: (id) => `/firms/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Firm', id }],
    }),
    createFirm: builder.mutation<ApiResponse<Firm>, FirmInput>({
      query: (body) => ({ url: '/firms', method: 'POST', body }),
      invalidatesTags: ['Firm'],
    }),
    updateFirm: builder.mutation<ApiResponse<Firm>, { id: string; changes: Partial<FirmInput> }>({
      query: ({ id, changes }) => ({ url: `/firms/${id}`, method: 'PATCH', body: changes }),
      invalidatesTags: (_result, _error, { id }) => ['Firm', { type: 'Firm', id }],
    }),
    setDefaultSalesFirm: builder.mutation<ApiResponse<Firm>, string>({
      query: (id) => ({ url: `/firms/${id}/default-sales`, method: 'POST' }),
      invalidatesTags: ['Firm'],
    }),
  }),
});

export const {
  useGetFirmsQuery,
  useLazyGetFirmQuery,
  useCreateFirmMutation,
  useUpdateFirmMutation,
  useSetDefaultSalesFirmMutation,
} = firmApi;
