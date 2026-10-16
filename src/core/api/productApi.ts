import { apiSlice } from './apiSlice';
import type {
  ApiResponse,
  PaginatedApiResponse,
  Product,
  ProductVariant,
  BarcodeScanResponse,
  BarcodeLookupResponse,
  CreateProductFromBarcodeRequest,
  BarcodeProductResponse,
  StoreBarcodeInfo,
  UqcCode,
} from '../types';

export interface BillingSearchVariant {
  id: string;
  product_id: string;
  product_name: string | null;
  brand?: string | null;
  size?: string | null;
  packaging?: Packaging | null;
  price: number;
  gst_percent?: number | null;
  sku: string;
  available_quantity: number;
  low_stock_threshold: number;
}

export type Packaging = 'POUCH' | 'BOTTLE' | 'CAN' | 'BOX' | 'PACKET' | 'JAR' | 'LOOSE';

interface CreateProductRequest {
  name: string;
  category_id?: number | null;
  hsn_code?: string | null;
}

interface UpdateProductRequest {
  name?: string;
  category_id?: number | null;
  hsn_code?: string | null;
}

interface CreateVariantRequest {
  brand?: string | null;
  size?: string | null;
  packaging?: Packaging | null;
  price: number;
  gst_percent?: number | null;
  uqc_code?: UqcCode | null;
  unit_label?: string | null;
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
        params: params || {},
      }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query<ApiResponse<Product>, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    searchVariants: builder.query<ApiResponse<BillingSearchVariant[]>, { search: string }>({
      query: ({ search }) => ({
        url: '/products/search',
        params: { q: search },
      }),
      providesTags: ['Product'],
    }),
    createProduct: builder.mutation<ApiResponse<Product>, CreateProductRequest>({
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
    updateProduct: builder.mutation<
      ApiResponse<Product>,
      { id: string; data: UpdateProductRequest }
    >({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Product'],
    }),
    updateVariant: builder.mutation<
      ApiResponse<ProductVariant>,
      { id: string; data: { selling_price?: number; price?: number; gst_percent?: number | null; uqc_code?: UqcCode | null; unit_label?: string | null } }
    >({
      query: ({ id, data }) => ({
        url: `/variants/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Product'],
    }),
    // Barcode endpoints
    // Lookup barcode (local + external - preferred)
    lookupBarcode: builder.query<BarcodeLookupResponse, string>({
      query: (barcode) => `/products/barcode/${barcode}/lookup`,
    }),
    // Scan barcode (local only - legacy)
    scanBarcode: builder.query<BarcodeScanResponse, string>({
      query: (barcode) => `/products/barcode/${barcode}`,
      providesTags: ['Product'],
    }),
    createProductFromBarcode: builder.mutation<
      ApiResponse<BarcodeProductResponse>,
      CreateProductFromBarcodeRequest
    >({
      query: (body) => ({
        url: '/products/barcode',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product', 'Inventory'],
    }),
    generateStoreBarcode: builder.mutation<ApiResponse<StoreBarcodeInfo>, { variantId: string }>({
      query: (body) => ({
        url: '/products/barcode/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useSearchVariantsQuery,
  useLazySearchVariantsQuery,
  useCreateProductMutation,
  useCreateVariantMutation,
  useUpdateProductMutation,
  useUpdateVariantMutation,
  useLookupBarcodeQuery,
  useLazyLookupBarcodeQuery,
  useScanBarcodeQuery,
  useLazyScanBarcodeQuery,
  useCreateProductFromBarcodeMutation,
  useGenerateStoreBarcodeMutation,
} = productApi;
