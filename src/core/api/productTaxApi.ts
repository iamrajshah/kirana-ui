import { apiSlice } from './apiSlice';
import type { ApiResponse, UqcCode } from '../types';
export interface TaxValues {
  hsnCode: string | null;
  gstPercent: number | null;
  uqcCode: UqcCode | null;
  unitLabel: string | null;
  uqcQuantityFactor: number | null;
}
export interface TaxRow {
  variantId: string;
  productId: string;
  productName: string;
  sku: string | null;
  brand: string | null;
  size: string | null;
  values: TaxValues;
  missing: string[];
}
export interface TaxReviewInput {
  rows: Array<{ variantId: string; expected: TaxValues; values: TaxValues }>;
}
export interface TaxReviewResult {
  changedCount: number;
  changes: Array<{
    variantId: string;
    productId: string;
    productName: string;
    before: TaxValues;
    after: TaxValues;
    missing: string[];
    changed: boolean;
  }>;
}
const productTaxApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductTax: builder.query<
      ApiResponse<{ rows: TaxRow[]; total: number }>,
      { skip: number; take: number; search: string; incomplete: boolean }
    >({
      query: (params) => ({ url: '/products/tax-review', params }),
      providesTags: ['Product'],
    }),
    previewProductTax: builder.mutation<ApiResponse<TaxReviewResult>, TaxReviewInput>({
      query: (body) => ({ url: '/products/tax-review/preview', method: 'POST', body }),
    }),
    applyProductTax: builder.mutation<ApiResponse<TaxReviewResult>, TaxReviewInput>({
      query: (body) => ({ url: '/products/tax-review/apply', method: 'POST', body }),
      invalidatesTags: (result) => (result ? ['Product', 'Report'] : []),
    }),
  }),
});
export const { useGetProductTaxQuery, usePreviewProductTaxMutation, useApplyProductTaxMutation } =
  productTaxApi;
