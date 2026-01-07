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
      { search?: string } | void
    >({
      query: (params = {}) => ({
        url: '/categories',
        params,
      }),
      providesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
} = categoryApi;
