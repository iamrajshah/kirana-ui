import { apiSlice } from './apiSlice';
import type { ApiResponse } from '@core/types';

export type StorefrontOrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface StorefrontOrder {
  id: string;
  status: StorefrontOrderStatus;
  total_amount: number;
  fulfillment_type: 'PICKUP' | 'DELIVERY';
  contact_name?: string | null;
  contact_phone?: string | null;
  customer_note?: string | null;
  delivery_address_snapshot?: string | null;
  created_at?: string | null;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_name?: string | null;
    product_image_url?: string | null;
    brand?: string | null;
    size?: string | null;
    packaging?: string | null;
  }>;
}

export const storefrontOrderApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getIncomingStorefrontOrders: builder.query<ApiResponse<StorefrontOrder[]>, void>({
      query: () => '/orders/incoming',
      providesTags: ['Invoice'],
    }),
    updateStorefrontOrderStatus: builder.mutation<
      ApiResponse<StorefrontOrder>,
      { id: string; status: StorefrontOrderStatus }
    >({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Invoice', 'Dashboard', 'Inventory'],
    }),
  }),
});

export const { useGetIncomingStorefrontOrdersQuery, useUpdateStorefrontOrderStatusMutation } =
  storefrontOrderApi;
