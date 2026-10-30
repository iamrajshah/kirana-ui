import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse, Inventory } from '../types';

interface InventoryListApiResponse {
  success: boolean;
  data: Inventory[];
  meta?: PaginatedApiResponse<Inventory>['meta'];
  pagination?: {
    total: number;
    skip?: number;
    take?: number;
  };
}

export const normalizeInventoryListResponse = (
  response: InventoryListApiResponse
): PaginatedApiResponse<Inventory> => ({
  success: response.success,
  data: response.data,
  meta: response.meta ?? {
    total: response.pagination?.total ?? response.data.length,
    ...(response.pagination?.take ? { limit: response.pagination.take } : {}),
  },
});

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
      transformResponse: normalizeInventoryListResponse,
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
