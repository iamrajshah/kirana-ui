import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse, Product, ProductVariant } from '../types';

interface CreateProductRequest {
  name: string;
  category_id?: number | null;
}

interface CreateVariantRequest {
  brand?: string | null;
  size?: string | null;
  packaging?: 'PACKET' | 'BOX' | 'BOTTLE' | 'LOOSE' | 'KG' | null;
  price: number;
  gst_percent?: number | null;
  sku?: string | null;
}

export const productApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<
      PaginatedApiResponse<Product>,
      { skip?: number; take?: number; search?: string } | void
    >({
      query: (params = {}) => ({
        url: '/products',
        params,
      }),
      providesTags: ['Product'],
    }),
    searchVariants: builder.query<
      ApiResponse<ProductVariant[]>,
      { search: string }
    >({
      query: ({ search }) => ({
        url: '/products/search',
        params: { q: search },
      }),
      providesTags: ['Product'],
    }),
    createProduct: builder.mutation<
      ApiResponse<Product>,
      CreateProductRequest
    >({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    createVariant: builder.mutation<
      ApiResponse<ProductVariant>,
      { productId: string; variant: CreateVariantRequest }
    >({
      query: ({ productId, variant }) => ({
        url: `/products/${productId}/variants`,
        method: 'POST',
        body: variant,
      }),
      invalidatesTags: ['Product', 'Inventory'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useSearchVariantsQuery,
  useLazySearchVariantsQuery,
  useCreateProductMutation,
  useCreateVariantMutation,
} = productApi;
