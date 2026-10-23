import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse } from '../types';
import type { FirmSummary } from './firmApi';

export interface PurchaseItem {
  variant_id: number;
  quantity: number;
  unit_price: number;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  invoice_number: string | null;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  created_at: string;
  firm_id: string;
  firm?: FirmSummary;
  suppliers?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
    phone: string | null;
  };
  items?: Array<{
    id: string;
    variant_id: string;
    quantity: number;
    purchase_price: number;
    product_name?: string;
    sku?: string;
    brand?: string;
    size?: string;
  }>;
}

export const purchaseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPurchases: builder.query<
      PaginatedApiResponse<Purchase>,
      {
        page?: number;
        limit?: number;
        supplier_id?: string;
        firm_id?: string;
        status?: 'PAID' | 'UNPAID' | 'PARTIAL';
      } | void
    >({
      query: (params) => ({
        url: '/purchases',
        params: params || {},
      }),
      providesTags: ['Purchase'],
    }),
    getPurchaseById: builder.query<ApiResponse<Purchase>, string>({
      query: (id) => `/purchases/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Purchase', id }],
    }),
    createPurchase: builder.mutation<
      ApiResponse<Purchase>,
      {
        supplier_id: number;
        firm_id: number;
        invoice_number?: string;
        invoice_date: string;
        items: PurchaseItem[];
        payment_amount?: number;
        payment_mode?: 'CASH' | 'UPI' | 'CARD' | 'BANK';
      }
    >({
      query: (body) => ({
        url: '/purchases',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, error) => [
        'Purchase',
        'Supplier',
        'Inventory',
        'Report',
        ...(error ? [] : (['Dashboard'] as const)),
      ],
    }),
  }),
});

export const { useGetPurchasesQuery, useGetPurchaseByIdQuery, useCreatePurchaseMutation } =
  purchaseApi;
