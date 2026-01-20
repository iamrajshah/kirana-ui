import { apiSlice } from './apiSlice';
import type { ApiResponse, PaginatedApiResponse } from '../types';

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export const categoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<
      PaginatedApiResponse<Category>,
      { search?: string; is_active?: boolean } | void
    >({
      query: (params = {}) => ({
        url: '/categories',
        params: params || {},
      }),
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<
      ApiResponse<Category>,
      { name: string; description?: string }
    >({
      query: (body) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategoryStatus: builder.mutation<
      ApiResponse<Category>,
      { id: number; is_active: boolean }
    >({
      query: ({ id, is_active }) => ({
        url: `/categories/${id}/status`,
        method: 'PATCH',
        body: { is_active },
      }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useLazyGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryStatusMutation,
} = categoryApi;
