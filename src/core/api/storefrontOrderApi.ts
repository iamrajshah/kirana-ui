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

export interface StorefrontOffer {
  id: string;
  product_id: string | null;
  title: string;
  description?: string | null;
  badge_text?: string | null;
  image_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  sort_order: number;
  product?: {
    id: string;
    name?: string | null;
    image_url?: string | null;
    product_variants?: Array<{
      id: string;
      selling_price?: number | null;
      mrp_price?: number | null;
      image_url?: string | null;
    }>;
  } | null;
}

export interface StorefrontOfferInput {
  title: string;
  description?: string | null;
  badge_text?: string | null;
  image_url?: string | null;
  product_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  sort_order?: number;
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
    getStorefrontOffers: builder.query<ApiResponse<StorefrontOffer[]>, void>({
      query: () => '/storefront-offers',
      providesTags: ['StorefrontOffer'],
    }),
    createStorefrontOffer: builder.mutation<ApiResponse<StorefrontOffer>, StorefrontOfferInput>({
      query: (body) => ({ url: '/storefront-offers', method: 'POST', body }),
      invalidatesTags: ['StorefrontOffer'],
    }),
    updateStorefrontOffer: builder.mutation<
      ApiResponse<StorefrontOffer>,
      { id: string; data: Partial<StorefrontOfferInput> }
    >({
      query: ({ id, data }) => ({ url: `/storefront-offers/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['StorefrontOffer'],
    }),
    deleteStorefrontOffer: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/storefront-offers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['StorefrontOffer'],
    }),
  }),
});

export const {
  useGetIncomingStorefrontOrdersQuery,
  useUpdateStorefrontOrderStatusMutation,
  useGetStorefrontOffersQuery,
  useCreateStorefrontOfferMutation,
  useUpdateStorefrontOfferMutation,
  useDeleteStorefrontOfferMutation,
} = storefrontOrderApi;
