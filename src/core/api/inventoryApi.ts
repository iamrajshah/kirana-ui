import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse, Inventory } from '../types';

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInventory: builder.query<
      PaginatedApiResponse<Inventory>,
      { skip?: number; take?: number; search?: string } | void
    >({
      query: (params = {}) => ({
        url: '/inventory',
        params: params || {},
      }),
      providesTags: ['Inventory'],
    }),
    getLowStock: builder.query<ApiResponse<Inventory[]>, void>({
      query: () => '/inventory/low-stock',
      providesTags: ['Inventory'],
    }),
    updateInventory: builder.mutation<
      ApiResponse<Inventory>,
      { variant_id: string; quantity: number; low_stock_threshold?: number }
    >({
      query: ({ variant_id, ...body }) => ({
        url: `/inventory/${variant_id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Inventory', 'Dashboard'],
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useGetLowStockQuery,
  useUpdateInventoryMutation,
} = inventoryApi;
